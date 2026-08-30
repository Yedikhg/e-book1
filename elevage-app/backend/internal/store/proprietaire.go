package store

import (
	"context"
	"time"
)

type Proprietaire struct {
	ID     int64
	Nom    string
	CreeLe time.Time
}

type ProprietaireStore struct {
	db *DB
}

func NewProprietaireStore(db *DB) *ProprietaireStore {
	return &ProprietaireStore{db: db}
}

func (s *ProprietaireStore) Lister(ctx context.Context) ([]Proprietaire, error) {
	rows, err := s.db.db.QueryContext(ctx, `SELECT id, nom, cree_le FROM proprietaires ORDER BY nom`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var liste []Proprietaire
	for rows.Next() {
		var p Proprietaire
		if err := rows.Scan(&p.ID, &p.Nom, &p.CreeLe); err != nil {
			return nil, err
		}
		liste = append(liste, p)
	}
	return liste, rows.Err()
}

func (s *ProprietaireStore) Creer(ctx context.Context, nom string) (int64, error) {
	var id int64
	err := s.db.db.QueryRowContext(ctx,
		`INSERT INTO proprietaires (nom) VALUES ($1) RETURNING id`, nom,
	).Scan(&id)
	return id, err
}
