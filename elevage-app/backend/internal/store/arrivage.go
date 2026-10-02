package store

import (
	"context"
	"database/sql"
	"fmt"
	"time"
)

type Arrivage struct {
	ID               int64
	RecuLe           time.Time
	EffectifInitial  int
	PrixUnitaireCts  int64
	Notes            string
	CreeLe           time.Time
}

type Part struct {
	ArrivageID      int64
	ProprietaireID  int64
	EffectifInitial int
}

type NouvelArrivage struct {
	RecuLe          time.Time
	EffectifInitial int
	PrixUnitaireCts int64
	Notes           string
	Parts           []Part
}

type ArrivageStore struct {
	db *DB
}

func NewArrivageStore(db *DB) *ArrivageStore {
	return &ArrivageStore{db: db}
}

func (s *ArrivageStore) Creer(ctx context.Context, tx *sql.Tx, a NouvelArrivage) (int64, error) {
	// Vérifier que la somme des parts correspond à l'effectif total.
	var totalParts int
	for _, p := range a.Parts {
		totalParts += p.EffectifInitial
	}
	if totalParts != a.EffectifInitial {
		return 0, fmt.Errorf("somme des parts (%d) ≠ effectif total (%d)", totalParts, a.EffectifInitial)
	}

	var id int64
	err := tx.QueryRowContext(ctx, `
		INSERT INTO arrivages (recu_le, effectif_initial, prix_unitaire_cts, notes)
		VALUES ($1, $2, $3, $4)
		RETURNING id`,
		a.RecuLe, a.EffectifInitial, a.PrixUnitaireCts, a.Notes,
	).Scan(&id)
	if err != nil {
		return 0, fmt.Errorf("insérer arrivage: %w", err)
	}

	for _, p := range a.Parts {
		_, err = tx.ExecContext(ctx, `
			INSERT INTO parts (arrivage_id, proprietaire_id, effectif_initial)
			VALUES ($1, $2, $3)`,
			id, p.ProprietaireID, p.EffectifInitial,
		)
		if err != nil {
			return 0, fmt.Errorf("insérer part: %w", err)
		}
	}

	return id, nil
}

func (s *ArrivageStore) ListerActifs(ctx context.Context) ([]Arrivage, error) {
	rows, err := s.db.db.QueryContext(ctx, `
		SELECT a.id, a.recu_le, a.effectif_initial, a.prix_unitaire_cts,
		       COALESCE(a.notes, ''), a.cree_le
		FROM arrivages a
		JOIN effectif_courant ec ON ec.arrivage_id = a.id
		WHERE ec.vivantes > 0
		ORDER BY a.recu_le DESC`)
	if err != nil {
		return nil, fmt.Errorf("lister arrivages: %w", err)
	}
	defer rows.Close()

	var liste []Arrivage
	for rows.Next() {
		var a Arrivage
		if err := rows.Scan(&a.ID, &a.RecuLe, &a.EffectifInitial, &a.PrixUnitaireCts, &a.Notes, &a.CreeLe); err != nil {
			return nil, err
		}
		liste = append(liste, a)
	}
	return liste, rows.Err()
}

func (s *ArrivageStore) Exister(ctx context.Context, tx *sql.Tx, id int64) (bool, error) {
	var exists bool
	err := tx.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM arrivages WHERE id = $1)`, id).Scan(&exists)
	return exists, err
}

type EtatArrivage struct {
	ArrivageID      int64
	RecuLe          time.Time
	EffectifInitial int
	Vivantes        int
	CoutTotalCts    int64
	ValeurParBeteCts int64
	Parts           []PartEtat
	DerniersMovts   []MouvementResume
	VentesCredit    []VenteCredit
}

type PartEtat struct {
	ProprietaireID  int64
	ProprietaireNom string
	PartInitiale    int
	Vivantes        int
}

type MouvementResume struct {
	Type      string
	Date      time.Time
	Nombre    int
}

type VenteCredit struct {
	VenteID    int64
	ClientNom  string
	TotalCts   int64
	PayeCts    int64
	ResteCts   int64
}

func (s *ArrivageStore) Etat(ctx context.Context, id int64) (*EtatArrivage, error) {
	var etat EtatArrivage

	err := s.db.db.QueryRowContext(ctx, `
		SELECT a.id, a.recu_le, a.effectif_initial,
		       ec.vivantes,
		       ct.cout_total_cts
		FROM arrivages a
		JOIN effectif_courant ec ON ec.arrivage_id = a.id
		JOIN cout_total_arrivage ct ON ct.arrivage_id = a.id
		WHERE a.id = $1`, id,
	).Scan(&etat.ArrivageID, &etat.RecuLe, &etat.EffectifInitial, &etat.Vivantes, &etat.CoutTotalCts)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("arrivage %d introuvable", id)
	}
	if err != nil {
		return nil, err
	}

	// Valeur par bête : calculée par tranches en Go (règle chapitre 7)
	valeur, err := s.valeurParBete(ctx, id)
	if err != nil {
		return nil, err
	}
	etat.ValeurParBeteCts = valeur

	// Répartition par part
	rows, err := s.db.db.QueryContext(ctx, `
		SELECT proprietaire_id, proprietaire_nom, part_initiale, vivantes_part
		FROM repartition_par_part WHERE arrivage_id = $1
		ORDER BY part_initiale DESC`, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var p PartEtat
		if err := rows.Scan(&p.ProprietaireID, &p.ProprietaireNom, &p.PartInitiale, &p.Vivantes); err != nil {
			return nil, err
		}
		etat.Parts = append(etat.Parts, p)
	}

	// Derniers mouvements (10 derniers)
	mrows, err := s.db.db.QueryContext(ctx, `
		SELECT type::text, survenu_le, nombre
		FROM mouvements
		WHERE arrivage_id = $1
		  AND annule_id IS NULL
		  AND NOT EXISTS (SELECT 1 FROM mouvements c WHERE c.annule_id = mouvements.id)
		ORDER BY survenu_le DESC, id DESC
		LIMIT 10`, id)
	if err != nil {
		return nil, err
	}
	defer mrows.Close()
	for mrows.Next() {
		var m MouvementResume
		if err := mrows.Scan(&m.Type, &m.Date, &m.Nombre); err != nil {
			return nil, err
		}
		etat.DerniersMovts = append(etat.DerniersMovts, m)
	}

	// Ventes à crédit avec solde restant
	vrows, err := s.db.db.QueryContext(ctx, `
		SELECT r.vente_id, COALESCE(c.nom, 'Inconnu'), r.total_cts, r.paye_cts, r.reste_cts
		FROM reste_a_payer r
		JOIN ventes v ON v.id = r.vente_id
		JOIN mouvements mo ON mo.id = v.mouvement_id
		LEFT JOIN clients c ON c.id = v.client_id
		WHERE mo.arrivage_id = $1 AND r.reste_cts > 0
		ORDER BY r.vente_id DESC`, id)
	if err != nil {
		return nil, err
	}
	defer vrows.Close()
	for vrows.Next() {
		var vc VenteCredit
		if err := vrows.Scan(&vc.VenteID, &vc.ClientNom, &vc.TotalCts, &vc.PayeCts, &vc.ResteCts); err != nil {
			return nil, err
		}
		etat.VentesCredit = append(etat.VentesCredit, vc)
	}

	return &etat, nil
}

type Periode struct {
	DepenseCts int64
	Vivantes   int
}

// valeurParBete calcule le coût par bête vivante en tenant compte du moment
// où chaque dépense est survenue. Une dépense ne se répartit que sur les
// bêtes vivantes au moment où elle survient.
func (s *ArrivageStore) valeurParBete(ctx context.Context, arrivageID int64) (int64, error) {
	// Récupérer l'effectif initial et le prix d'achat.
	var effectifInitial int
	var prixUnitaireCts int64
	err := s.db.db.QueryRowContext(ctx,
		`SELECT effectif_initial, prix_unitaire_cts FROM arrivages WHERE id = $1`, arrivageID,
	).Scan(&effectifInitial, &prixUnitaireCts)
	if err != nil {
		return 0, err
	}

	// Récupérer tous les événements chronologiques : mortalités et dépenses.
	// Les mortalités réduisent l'effectif ; les dépenses s'appliquent à l'effectif courant.
	type evenement struct {
		date       time.Time
		mortalites int
		depenseCts int64
	}

	// Construire un journal d'événements triés par date.
	rows, err := s.db.db.QueryContext(ctx, `
		SELECT survenu_le::date AS date, SUM(nombre) AS total_morts
		FROM mouvements
		WHERE arrivage_id = $1
		  AND type = 'mortalite'
		  AND annule_id IS NULL
		  AND NOT EXISTS (SELECT 1 FROM mouvements c WHERE c.annule_id = mouvements.id)
		GROUP BY survenu_le::date
		ORDER BY survenu_le::date`, arrivageID)
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	mortalitesParDate := make(map[time.Time]int)
	for rows.Next() {
		var date time.Time
		var total int
		if err := rows.Scan(&date, &total); err != nil {
			return 0, err
		}
		mortalitesParDate[date] = total
	}

	drows, err := s.db.db.QueryContext(ctx, `
		SELECT engagee_le, SUM(montant_cts)
		FROM depenses WHERE arrivage_id = $1
		GROUP BY engagee_le ORDER BY engagee_le`, arrivageID)
	if err != nil {
		return 0, err
	}
	defer drows.Close()

	depensesParDate := make(map[time.Time]int64)
	for drows.Next() {
		var date time.Time
		var total int64
		if err := drows.Scan(&date, &total); err != nil {
			return 0, err
		}
		depensesParDate[date] = total
	}

	// Calculer la valeur par bête par la méthode des tranches.
	vivantes := effectifInitial
	var valeurTotaleCts int64

	// Coût d'achat : réparti sur l'effectif initial.
	if vivantes > 0 {
		valeurTotaleCts += prixUnitaireCts
	}

	// Rassembler toutes les dates pour les trier
	dateSet := make(map[time.Time]struct{})
	for d := range mortalitesParDate {
		dateSet[d] = struct{}{}
	}
	for d := range depensesParDate {
		dateSet[d] = struct{}{}
	}

	var dates []time.Time
	for d := range dateSet {
		dates = append(dates, d)
	}
	// Tri manuel (slice courte)
	for i := 0; i < len(dates); i++ {
		for j := i + 1; j < len(dates); j++ {
			if dates[j].Before(dates[i]) {
				dates[i], dates[j] = dates[j], dates[i]
			}
		}
	}

	for _, date := range dates {
		// D'abord les mortalités réduisent l'effectif.
		if morts, ok := mortalitesParDate[date]; ok {
			vivantes -= morts
		}
		// Ensuite la dépense se répartit sur les bêtes encore vivantes.
		if dep, ok := depensesParDate[date]; ok && vivantes > 0 {
			valeurTotaleCts += dep / int64(vivantes)
		}
	}

	return valeurTotaleCts, nil
}
