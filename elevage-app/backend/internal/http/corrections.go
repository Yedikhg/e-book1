package http

import (
	"net/http"

	"github.com/yedikhg/elevage-app/internal/service"
)

type correctionRequete struct {
	MouvementID int64 `json:"mouvement_id"`
}

func (h *Handler) annulerMouvement(w http.ResponseWriter, r *http.Request) {
	userID, ok := idUtilisateur(r)
	if !ok {
		erreurJSON(w, http.StatusBadRequest, "utilisateur manquant")
		return
	}

	var req correctionRequete
	if err := lireJSON(r, &req); err != nil {
		erreurJSON(w, http.StatusBadRequest, "JSON invalide")
		return
	}
	if req.MouvementID <= 0 {
		erreurJSON(w, http.StatusBadRequest, "mouvement_id invalide")
		return
	}

	if err := h.svc.AnnulerMouvement(r.Context(), service.DemandeCorrection{
		MouvementID:    req.MouvementID,
		ParUtilisateur: userID,
	}); err != nil {
		erreurJSON(w, codeErreurService(err), err.Error())
		return
	}
	repondreJSON(w, http.StatusOK, map[string]string{"statut": "annulé"})
}
