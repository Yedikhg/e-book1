package store

import (
	"context"
	"database/sql"
	"fmt"
	"time"
)

type Utilisateur struct {
	ID      int64
	Nom     string
	CreeLe  time.Time
}

type UtilisateurStore struct {
	db *DB
}

func NewUtilisateurStore(db *DB) *UtilisateurStore {
	return &UtilisateurStore{db: db}
}

func (s *UtilisateurStore) ParID(ctx context.Context, id int64) (*Utilisateur, error) {
	var u Utilisateur
	err := s.db.db.QueryRowContext(ctx,
		`SELECT id, nom, cree_le FROM utilisateurs WHERE id = $1`, id,
	).Scan(&u.ID, &u.Nom, &u.CreeLe)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("utilisateur %d introuvable", id)
	}
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (s *UtilisateurStore) PinHash(ctx context.Context, id int64) (string, error) {
	var hash string
	err := s.db.db.QueryRowContext(ctx,
		`SELECT pin_hash FROM utilisateurs WHERE id = $1`, id).Scan(&hash)
	if err == sql.ErrNoRows {
		return "", fmt.Errorf("utilisateur %d introuvable", id)
	}
	return hash, err
}

func (s *UtilisateurStore) Lister(ctx context.Context) ([]Utilisateur, error) {
	rows, err := s.db.db.QueryContext(ctx, `SELECT id, nom, cree_le FROM utilisateurs ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var liste []Utilisateur
	for rows.Next() {
		var u Utilisateur
		if err := rows.Scan(&u.ID, &u.Nom, &u.CreeLe); err != nil {
			return nil, err
		}
		liste = append(liste, u)
	}
	return liste, rows.Err()
}

func (s *UtilisateurStore) ChangerPIN(ctx context.Context, id int64, nouveauHash string) error {
	res, err := s.db.db.ExecContext(ctx,
		`UPDATE utilisateurs SET pin_hash = $1 WHERE id = $2`, nouveauHash, id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("utilisateur %d introuvable", id)
	}
	return nil
}

func (s *UtilisateurStore) Creer(ctx context.Context, nom, pinHash string) (int64, error) {
	var id int64
	err := s.db.db.QueryRowContext(ctx,
		`INSERT INTO utilisateurs (nom, pin_hash) VALUES ($1, $2) RETURNING id`,
		nom, pinHash,
	).Scan(&id)
	return id, err
}
