package store

import (
	"context"
	"database/sql"
	"fmt"
	"time"
)

type MouvementType string

const (
	MouvementMortalite   MouvementType = "mortalite"
	MouvementVente       MouvementType = "vente"
	MouvementDon         MouvementType = "don"
	MouvementConsommation MouvementType = "consommation"
)

type Mouvement struct {
	ArrivageID int64
	Type       MouvementType
	SurvenuLe  time.Time
	Nombre     int
	SaisiPar   int64
	AnnuleID   *int64
}

type MouvementStore struct {
	db *DB
}

func NewMouvementStore(db *DB) *MouvementStore {
	return &MouvementStore{db: db}
}

// EffectifCourant retourne le nombre de bêtes vivantes pour un arrivage,
// dans une transaction (pour lecture cohérente avant écriture).
func (s *MouvementStore) EffectifCourant(ctx context.Context, tx *sql.Tx, arrivageID int64) (int, error) {
	var vivantes int
	err := tx.QueryRowContext(ctx, `
		SELECT vivantes FROM effectif_courant WHERE arrivage_id = $1`,
		arrivageID,
	).Scan(&vivantes)
	if err == sql.ErrNoRows {
		return 0, fmt.Errorf("arrivage %d introuvable", arrivageID)
	}
	return vivantes, err
}

// AjouterMouvement insère un mouvement dans le journal.
func (s *MouvementStore) AjouterMouvement(ctx context.Context, tx *sql.Tx, m Mouvement) (int64, error) {
	var id int64
	err := tx.QueryRowContext(ctx, `
		INSERT INTO mouvements (arrivage_id, type, survenu_le, nombre, saisi_par, annule_id)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id`,
		m.ArrivageID, m.Type, m.SurvenuLe, m.Nombre, m.SaisiPar, m.AnnuleID,
	).Scan(&id)
	return id, err
}

// MouvementExiste vérifie qu'un mouvement appartient à un arrivage et n'est pas annulé.
func (s *MouvementStore) MouvementExiste(ctx context.Context, tx *sql.Tx, mouvementID int64) (bool, error) {
	var exists bool
	err := tx.QueryRowContext(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM mouvements WHERE id = $1
			  AND annule_id IS NULL
			  AND NOT EXISTS (SELECT 1 FROM mouvements c WHERE c.annule_id = mouvements.id)
		)`, mouvementID,
	).Scan(&exists)
	return exists, err
}
