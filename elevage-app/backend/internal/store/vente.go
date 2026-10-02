package store

import (
	"context"
	"database/sql"
	"fmt"
	"time"
)

type NouvelleVente struct {
	MouvementID  int64
	ClientID     *int64
	Nombre       int
	PrixUnitCts  int64
	TotalCts     int64
}

type Vente struct {
	ID           int64
	MouvementID  int64
	ClientID     *int64
	Nombre       int
	PrixUnitCts  int64
	TotalCts     int64
	CreeLe       time.Time
}

type VenteStore struct {
	db *DB
}

func NewVenteStore(db *DB) *VenteStore {
	return &VenteStore{db: db}
}

func (s *VenteStore) Creer(ctx context.Context, tx *sql.Tx, v NouvelleVente) (int64, error) {
	var id int64
	err := tx.QueryRowContext(ctx, `
		INSERT INTO ventes (mouvement_id, client_id, nombre, prix_unit_cts, total_cts)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id`,
		v.MouvementID, v.ClientID, v.Nombre, v.PrixUnitCts, v.TotalCts,
	).Scan(&id)
	return id, err
}

type VenteResume struct {
	ID         int64
	ClientNom  *string
	Nombre     int
	TotalCts   int64
	PayeCts    int64
	ResteCts   int64
	DateVente  time.Time
}

func (s *VenteStore) Lister(ctx context.Context) ([]VenteResume, error) {
	rows, err := s.db.db.QueryContext(ctx, `
		SELECT v.id,
		       c.nom,
		       v.nombre,
		       r.total_cts,
		       r.paye_cts,
		       r.reste_cts,
		       m.survenu_le
		FROM ventes v
		JOIN mouvements m ON m.id = v.mouvement_id
		LEFT JOIN clients c ON c.id = v.client_id
		JOIN reste_a_payer r ON r.vente_id = v.id
		ORDER BY m.survenu_le DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var liste []VenteResume
	for rows.Next() {
		var v VenteResume
		if err := rows.Scan(&v.ID, &v.ClientNom, &v.Nombre, &v.TotalCts, &v.PayeCts, &v.ResteCts, &v.DateVente); err != nil {
			return nil, err
		}
		liste = append(liste, v)
	}
	return liste, rows.Err()
}

func (s *VenteStore) ObtenirParID(ctx context.Context, venteID int64) (*VenteResume, error) {
	var v VenteResume
	err := s.db.db.QueryRowContext(ctx, `
		SELECT v.id,
		       c.nom,
		       v.nombre,
		       r.total_cts,
		       r.paye_cts,
		       r.reste_cts,
		       m.survenu_le
		FROM ventes v
		JOIN mouvements m ON m.id = v.mouvement_id
		LEFT JOIN clients c ON c.id = v.client_id
		JOIN reste_a_payer r ON r.vente_id = v.id
		WHERE v.id = $1`, venteID,
	).Scan(&v.ID, &v.ClientNom, &v.Nombre, &v.TotalCts, &v.PayeCts, &v.ResteCts, &v.DateVente)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("vente %d introuvable", venteID)
	}
	if err != nil {
		return nil, err
	}
	return &v, nil
}

func (s *VenteStore) ResteDu(ctx context.Context, tx *sql.Tx, venteID int64) (total, paye, reste int64, err error) {
	err = tx.QueryRowContext(ctx, `
		SELECT total_cts, paye_cts, reste_cts FROM reste_a_payer WHERE vente_id = $1`, venteID,
	).Scan(&total, &paye, &reste)
	if err == sql.ErrNoRows {
		err = fmt.Errorf("vente %d introuvable", venteID)
	}
	return
}
