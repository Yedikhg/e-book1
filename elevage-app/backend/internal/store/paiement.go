package store

import (
	"context"
	"database/sql"
	"time"
)

type NouveauPaiement struct {
	VenteID    int64
	MontantCts int64
	RecuLe     time.Time
	Statut     string
	Reference  string
	SaisiPar   int64
}

type PaiementStore struct {
	db *DB
}

func NewPaiementStore(db *DB) *PaiementStore {
	return &PaiementStore{db: db}
}

func (s *PaiementStore) Creer(ctx context.Context, tx *sql.Tx, p NouveauPaiement) (int64, error) {
	statut := "confirme"
	if p.Statut != "" {
		statut = p.Statut
	}
	var id int64
	err := tx.QueryRowContext(ctx, `
		INSERT INTO paiements (vente_id, montant_cts, recu_le, statut, reference, saisi_par)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id`,
		p.VenteID, p.MontantCts, p.RecuLe, statut, p.Reference, p.SaisiPar,
	).Scan(&id)
	return id, err
}
