package service

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/yedikhg/elevage-app/internal/store"
	"golang.org/x/crypto/bcrypt"
)

type Service struct {
	db            *store.DB
	arrivages     *store.ArrivageStore
	mouvements    *store.MouvementStore
	ventes        *store.VenteStore
	paiements     *store.PaiementStore
	utilisateurs  *store.UtilisateurStore
	proprietaires *store.ProprietaireStore
	clients       *store.ClientStore
}

func New(db *store.DB) *Service {
	return &Service{
		db:            db,
		arrivages:     store.NewArrivageStore(db),
		mouvements:    store.NewMouvementStore(db),
		ventes:        store.NewVenteStore(db),
		paiements:     store.NewPaiementStore(db),
		utilisateurs:  store.NewUtilisateurStore(db),
		proprietaires: store.NewProprietaireStore(db),
		clients:       store.NewClientStore(db),
	}
}

// --- Arrivages ---

type DemandeArrivage struct {
	RecuLe          time.Time
	EffectifInitial int
	PrixUnitaireCts int64
	Notes           string
	Parts           []store.Part
}

func (s *Service) EnregistrerArrivage(ctx context.Context, d DemandeArrivage) (int64, error) {
	if d.EffectifInitial <= 0 {
		return 0, ErrNombreInvalide
	}
	var totalParts int
	for _, p := range d.Parts {
		totalParts += p.EffectifInitial
	}
	if totalParts != d.EffectifInitial {
		return 0, fmt.Errorf("%w: %d ≠ %d", ErrSommeParts, totalParts, d.EffectifInitial)
	}

	var id int64
	err := s.db.Tx(ctx, func(tx *sql.Tx) error {
		var err error
		id, err = s.arrivages.Creer(ctx, tx, store.NouvelArrivage{
			RecuLe:          d.RecuLe,
			EffectifInitial: d.EffectifInitial,
			PrixUnitaireCts: d.PrixUnitaireCts,
			Notes:           d.Notes,
			Parts:           d.Parts,
		})
		return err
	})
	return id, err
}

// --- Mortalités ---

func (s *Service) EnregistrerMortalite(ctx context.Context, arrivageID int64, nombre int, parUtilisateur int64) error {
	if nombre <= 0 {
		return ErrNombreInvalide
	}
	return s.db.Tx(ctx, func(tx *sql.Tx) error {
		ok, err := s.arrivages.Exister(ctx, tx, arrivageID)
		if err != nil {
			return err
		}
		if !ok {
			return ErrArrivageInconnu
		}
		vivantes, err := s.mouvements.EffectifCourant(ctx, tx, arrivageID)
		if err != nil {
			return err
		}
		if nombre > vivantes {
			return ErrPlusDeMortsQueDeVivantes
		}
		_, err = s.mouvements.AjouterMouvement(ctx, tx, store.Mouvement{
			ArrivageID: arrivageID,
			Type:       store.MouvementMortalite,
			SurvenuLe:  time.Now().UTC(),
			Nombre:     nombre,
			SaisiPar:   parUtilisateur,
		})
		return err
	})
}

// --- Ventes ---

type DemandeVente struct {
	ArrivageID  int64
	ClientID    *int64
	Nombre      int
	PrixUnitCts int64
	ParUtilisateur int64
}

func (s *Service) EnregistrerVente(ctx context.Context, d DemandeVente) (venteID int64, err error) {
	if d.Nombre <= 0 {
		return 0, ErrNombreInvalide
	}
	if d.PrixUnitCts < 0 {
		return 0, fmt.Errorf("prix unitaire invalide")
	}

	err = s.db.Tx(ctx, func(tx *sql.Tx) error {
		ok, err := s.arrivages.Exister(ctx, tx, d.ArrivageID)
		if err != nil {
			return err
		}
		if !ok {
			return ErrArrivageInconnu
		}
		vivantes, err := s.mouvements.EffectifCourant(ctx, tx, d.ArrivageID)
		if err != nil {
			return err
		}
		if d.Nombre > vivantes {
			return ErrPlusDeMortsQueDeVivantes
		}
		mouvementID, err := s.mouvements.AjouterMouvement(ctx, tx, store.Mouvement{
			ArrivageID: d.ArrivageID,
			Type:       store.MouvementVente,
			SurvenuLe:  time.Now().UTC(),
			Nombre:     d.Nombre,
			SaisiPar:   d.ParUtilisateur,
		})
		if err != nil {
			return err
		}
		totalCts := int64(d.Nombre) * d.PrixUnitCts
		venteID, err = s.ventes.Creer(ctx, tx, store.NouvelleVente{
			MouvementID: mouvementID,
			ClientID:    d.ClientID,
			Nombre:      d.Nombre,
			PrixUnitCts: d.PrixUnitCts,
			TotalCts:    totalCts,
		})
		return err
	})
	return venteID, err
}

// --- Paiements ---

type DemandePaiement struct {
	VenteID    int64
	MontantCts int64
	RecuLe     time.Time
	Reference  string
	ParUtilisateur int64
}

func (s *Service) EnregistrerPaiement(ctx context.Context, d DemandePaiement) (int64, error) {
	if d.MontantCts <= 0 {
		return 0, ErrNombreInvalide
	}

	var paiementID int64
	err := s.db.Tx(ctx, func(tx *sql.Tx) error {
		_, _, reste, err := s.ventes.ResteDu(ctx, tx, d.VenteID)
		if err != nil {
			if err.Error() == fmt.Sprintf("vente %d introuvable", d.VenteID) {
				return ErrVenteIntrouvable
			}
			return err
		}
		if d.MontantCts > reste {
			return ErrPaiementExcessif
		}
		recuLe := d.RecuLe
		if recuLe.IsZero() {
			recuLe = time.Now().UTC()
		}
		paiementID, err = s.paiements.Creer(ctx, tx, store.NouveauPaiement{
			VenteID:    d.VenteID,
			MontantCts: d.MontantCts,
			RecuLe:     recuLe,
			Statut:     "confirme",
			Reference:  d.Reference,
			SaisiPar:   d.ParUtilisateur,
		})
		return err
	})
	return paiementID, err
}

// --- Corrections ---

type DemandeCorrection struct {
	MouvementID    int64
	ParUtilisateur int64
}

func (s *Service) AnnulerMouvement(ctx context.Context, d DemandeCorrection) error {
	return s.db.Tx(ctx, func(tx *sql.Tx) error {
		ok, err := s.mouvements.MouvementExiste(ctx, tx, d.MouvementID)
		if err != nil {
			return err
		}
		if !ok {
			return ErrMouvementIntrouvable
		}

		// Récupérer le mouvement original pour créer l'annulation.
		var arrivageID int64
		var typeMvt store.MouvementType
		var nombre int
		err = tx.QueryRowContext(ctx,
			`SELECT arrivage_id, type, nombre FROM mouvements WHERE id = $1`, d.MouvementID,
		).Scan(&arrivageID, &typeMvt, &nombre)
		if err != nil {
			return err
		}

		annuleID := d.MouvementID
		_, err = s.mouvements.AjouterMouvement(ctx, tx, store.Mouvement{
			ArrivageID: arrivageID,
			Type:       typeMvt,
			SurvenuLe:  time.Now().UTC(),
			Nombre:     nombre,
			SaisiPar:   d.ParUtilisateur,
			AnnuleID:   &annuleID,
		})
		return err
	})
}

// --- Lectures ---

func (s *Service) EtatArrivage(ctx context.Context, id int64) (*store.EtatArrivage, error) {
	return s.arrivages.Etat(ctx, id)
}

func (s *Service) ListerArrivagesActifs(ctx context.Context) ([]store.Arrivage, error) {
	return s.arrivages.ListerActifs(ctx)
}

func (s *Service) ListerProprietaires(ctx context.Context) ([]store.Proprietaire, error) {
	return s.proprietaires.Lister(ctx)
}

func (s *Service) CreerProprietaire(ctx context.Context, nom string) (int64, error) {
	return s.proprietaires.Creer(ctx, nom)
}

func (s *Service) ListerClients(ctx context.Context) ([]store.Client, error) {
	return s.clients.Lister(ctx)
}

func (s *Service) CreerClient(ctx context.Context, nom, telephone string) (int64, error) {
	return s.clients.Creer(ctx, nom, telephone)
}

func (s *Service) ListerUtilisateurs(ctx context.Context) ([]store.Utilisateur, error) {
	return s.utilisateurs.Lister(ctx)
}

func (s *Service) ListerVentes(ctx context.Context) ([]store.VenteResume, error) {
	return s.ventes.Lister(ctx)
}

func (s *Service) ObtenirVente(ctx context.Context, venteID int64) (*store.VenteResume, error) {
	v, err := s.ventes.ObtenirParID(ctx, venteID)
	if err != nil {
		return nil, ErrVenteIntrouvable
	}
	return v, nil
}

func (s *Service) ChangerPIN(ctx context.Context, utilisateurID int64, ancienPIN, nouveauPIN string) error {
	hash, err := s.utilisateurs.PinHash(ctx, utilisateurID)
	if err != nil {
		return ErrUtilisateurInconnu
	}
	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(ancienPIN)); err != nil {
		return ErrPINInvalide
	}
	nouveauHash, err := bcrypt.GenerateFromPassword([]byte(nouveauPIN), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	return s.utilisateurs.ChangerPIN(ctx, utilisateurID, string(nouveauHash))
}
