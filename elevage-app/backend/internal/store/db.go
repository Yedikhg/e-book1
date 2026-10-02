package store

import (
	"context"
	"database/sql"
	"fmt"

	_ "github.com/lib/pq"
)

type DB struct {
	db *sql.DB
}

func New(dsn string) (*DB, error) {
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("ouvrir base: %w", err)
	}
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("ping base: %w", err)
	}
	return &DB{db: db}, nil
}

func (d *DB) Close() error {
	return d.db.Close()
}

// Tx exécute fn dans une transaction. Si fn retourne une erreur, la transaction
// est annulée ; sinon elle est validée.
func (d *DB) Tx(ctx context.Context, fn func(*sql.Tx) error) error {
	tx, err := d.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("début transaction: %w", err)
	}
	if err := fn(tx); err != nil {
		_ = tx.Rollback()
		return err
	}
	return tx.Commit()
}

func (d *DB) DB() *sql.DB {
	return d.db
}
