package store

import (
	"context"
	"time"
)

type Client struct {
	ID        int64
	Nom       string
	Telephone string
	CreeLe    time.Time
}

type ClientStore struct {
	db *DB
}

func NewClientStore(db *DB) *ClientStore {
	return &ClientStore{db: db}
}

func (s *ClientStore) Lister(ctx context.Context) ([]Client, error) {
	rows, err := s.db.db.QueryContext(ctx, `SELECT id, nom, COALESCE(telephone,''), cree_le FROM clients ORDER BY nom`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var liste []Client
	for rows.Next() {
		var c Client
		if err := rows.Scan(&c.ID, &c.Nom, &c.Telephone, &c.CreeLe); err != nil {
			return nil, err
		}
		liste = append(liste, c)
	}
	return liste, rows.Err()
}

func (s *ClientStore) Creer(ctx context.Context, nom, telephone string) (int64, error) {
	var id int64
	err := s.db.db.QueryRowContext(ctx,
		`INSERT INTO clients (nom, telephone) VALUES ($1, $2) RETURNING id`,
		nom, telephone,
	).Scan(&id)
	return id, err
}
