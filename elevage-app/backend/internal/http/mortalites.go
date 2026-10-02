package http

import "net/http"

type mortaliteRequete struct {
	Nombre int `json:"nombre"`
}

func (h *Handler) enregistrerMortalite(w http.ResponseWriter, r *http.Request) {
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

	var req mortaliteRequete
	if err := lireJSON(r, &req); err != nil {
		erreurJSON(w, http.StatusBadRequest, "JSON invalide")
		return
	}

	if err := h.svc.EnregistrerMortalite(r.Context(), arrivageID, req.Nombre, userID); err != nil {
		erreurJSON(w, codeErreurService(err), err.Error())
		return
	}
	repondreJSON(w, http.StatusCreated, map[string]string{"statut": "enregistré"})
}
