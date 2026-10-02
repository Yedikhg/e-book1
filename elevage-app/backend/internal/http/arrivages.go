package http

import (
	"net/http"
	"time"

	"github.com/yedikhg/elevage-app/internal/service"
	"github.com/yedikhg/elevage-app/internal/store"
)

type partRequete struct {
	ProprietaireID int64 `json:"proprietaire_id"`
	Effectif       int   `json:"effectif"`
}

type arrivageRequete struct {
	RecuLe          string        `json:"recu_le"`
	EffectifInitial int           `json:"effectif_initial"`
	PrixUnitaireCts int64         `json:"prix_unitaire_cts"`
	Notes           string        `json:"notes"`
	Parts           []partRequete `json:"parts"`
}

func (h *Handler) listerArrivages(w http.ResponseWriter, r *http.Request) {
	liste, err := h.svc.ListerArrivagesActifs(r.Context())
	if err != nil {
		h.logger.Error("lister arrivages", "err", err)
		erreurJSON(w, http.StatusInternalServerError, "erreur interne")
		return
	}
	if liste == nil {
		liste = []store.Arrivage{}
	}
	repondreJSON(w, http.StatusOK, liste)
}

func (h *Handler) creerArrivage(w http.ResponseWriter, r *http.Request) {
	var req arrivageRequete
	if err := lireJSON(r, &req); err != nil {
		erreurJSON(w, http.StatusBadRequest, "JSON invalide")
		return
	}

	recuLe := time.Now().UTC()
	if req.RecuLe != "" {
		t, err := time.Parse("2006-01-02", req.RecuLe)
		if err != nil {
			erreurJSON(w, http.StatusBadRequest, "format de date invalide (YYYY-MM-DD attendu)")
			return
		}
		recuLe = t
	}

	parts := make([]store.Part, len(req.Parts))
	for i, p := range req.Parts {
		parts[i] = store.Part{
			ProprietaireID:  p.ProprietaireID,
			EffectifInitial: p.Effectif,
		}
	}

	id, err := h.svc.EnregistrerArrivage(r.Context(), service.DemandeArrivage{
		RecuLe:          recuLe,
		EffectifInitial: req.EffectifInitial,
		PrixUnitaireCts: req.PrixUnitaireCts,
		Notes:           req.Notes,
		Parts:           parts,
	})
	if err != nil {
		erreurJSON(w, codeErreurService(err), err.Error())
		return
	}
	repondreJSON(w, http.StatusCreated, map[string]int64{"id": id})
}

func (h *Handler) etatArrivage(w http.ResponseWriter, r *http.Request) {
	id, ok := idDepuisURL(r, "id")
	if !ok {
		erreurJSON(w, http.StatusBadRequest, "id invalide")
		return
	}
	etat, err := h.svc.EtatArrivage(r.Context(), id)
	if err != nil {
		erreurJSON(w, codeErreurService(err), err.Error())
		return
	}
	repondreJSON(w, http.StatusOK, etat)
}
