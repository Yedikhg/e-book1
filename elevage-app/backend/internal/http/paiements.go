package http

import (
	"net/http"
	"time"

	"github.com/yedikhg/elevage-app/internal/service"
)

type paiementRequete struct {
	MontantCts   int64  `json:"montant_cts"`
	RecuLe       string `json:"recu_le"`
	Reference    string `json:"reference"`
	ModePaiement string `json:"mode_paiement"`
}

func (h *Handler) enregistrerPaiement(w http.ResponseWriter, r *http.Request) {
	venteID, ok := idDepuisURL(r, "id")
	if !ok {
		erreurJSON(w, http.StatusBadRequest, "id invalide")
		return
	}
	userID, ok := idUtilisateur(r)
	if !ok {
		erreurJSON(w, http.StatusBadRequest, "utilisateur manquant")
		return
	}

	var req paiementRequete
	if err := lireJSON(r, &req); err != nil {
		erreurJSON(w, http.StatusBadRequest, "JSON invalide")
		return
	}

	recuLe := time.Now().UTC()
	if req.RecuLe != "" {
		t, err := time.Parse("2006-01-02", req.RecuLe)
		if err != nil {
			erreurJSON(w, http.StatusBadRequest, "format de date invalide (YYYY-MM-DD)")
			return
		}
		recuLe = t
	}

	paiementID, err := h.svc.EnregistrerPaiement(r.Context(), service.DemandePaiement{
		VenteID:        venteID,
		MontantCts:     req.MontantCts,
		RecuLe:         recuLe,
		Reference:      req.Reference,
		ParUtilisateur: userID,
	})
	if err != nil {
		erreurJSON(w, codeErreurService(err), err.Error())
		return
	}
	repondreJSON(w, http.StatusCreated, map[string]int64{"paiement_id": paiementID})
}
