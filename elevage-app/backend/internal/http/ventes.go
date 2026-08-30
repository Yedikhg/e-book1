package http

import (
	"net/http"
	"time"

	"github.com/yedikhg/elevage-app/internal/service"
)

type venteRequete struct {
	ClientID    *int64  `json:"client_id"`
	Nombre      int     `json:"nombre"`
	PrixUnitCts int64   `json:"prix_unitaire_cts"`
	EstCredit   bool    `json:"est_credit"`
	DateVente   string  `json:"date_vente"`
	Notes       string  `json:"notes"`
}

func (h *Handler) listerVentes(w http.ResponseWriter, r *http.Request) {
	ventes, err := h.svc.ListerVentes(r.Context())
	if err != nil {
		erreurJSON(w, http.StatusInternalServerError, "erreur interne")
		return
	}
	if ventes == nil {
		repondreJSON(w, http.StatusOK, []any{})
		return
	}
	repondreJSON(w, http.StatusOK, ventes)
}

func (h *Handler) obtenirVente(w http.ResponseWriter, r *http.Request) {
	venteID, ok := idDepuisURL(r, "id")
	if !ok {
		erreurJSON(w, http.StatusBadRequest, "id invalide")
		return
	}
	v, err := h.svc.ObtenirVente(r.Context(), venteID)
	if err != nil {
		erreurJSON(w, codeErreurService(err), err.Error())
		return
	}
	repondreJSON(w, http.StatusOK, v)
}

func (h *Handler) enregistrerVente(w http.ResponseWriter, r *http.Request) {
	arrivageID, ok := idDepuisURL(r, "id")
	if !ok {
		erreurJSON(w, http.StatusBadRequest, "id invalide")
		return
	}
	userID, ok := idUtilisateur(r)
	if !ok {
		erreurJSON(w, http.StatusBadRequest, "utilisateur manquant")
		return
	}

	var req venteRequete
	if err := lireJSON(r, &req); err != nil {
		erreurJSON(w, http.StatusBadRequest, "JSON invalide")
		return
	}

	var clientID *int64
	if req.EstCredit && req.ClientID != nil {
		clientID = req.ClientID
	}

	venteID, err := h.svc.EnregistrerVente(r.Context(), service.DemandeVente{
		ArrivageID:     arrivageID,
		ClientID:       clientID,
		Nombre:         req.Nombre,
		PrixUnitCts:    req.PrixUnitCts,
		ParUtilisateur: userID,
	})
	if err != nil {
		erreurJSON(w, codeErreurService(err), err.Error())
		return
	}

	_ = req.DateVente // stocké via le mouvement pour l'instant
	_ = req.Notes

	repondreJSON(w, http.StatusCreated, map[string]any{"vente_id": venteID, "date_vente": time.Now().Format(time.RFC3339)})
}
