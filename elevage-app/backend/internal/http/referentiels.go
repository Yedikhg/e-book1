package http

import (
	"net/http"

	"github.com/yedikhg/elevage-app/internal/store"
)

// --- Propriétaires ---

type proprietaireRequete struct {
	Nom string `json:"nom"`
}

func (h *Handler) listerProprietaires(w http.ResponseWriter, r *http.Request) {
	liste, err := h.svc.ListerProprietaires(r.Context())
	if err != nil {
		erreurJSON(w, http.StatusInternalServerError, "erreur interne")
		return
	}
	if liste == nil {
		liste = []store.Proprietaire{}
	}
	repondreJSON(w, http.StatusOK, liste)
}

func (h *Handler) creerProprietaire(w http.ResponseWriter, r *http.Request) {
	var req proprietaireRequete
	if err := lireJSON(r, &req); err != nil || req.Nom == "" {
		erreurJSON(w, http.StatusBadRequest, "nom requis")
		return
	}
	id, err := h.svc.CreerProprietaire(r.Context(), req.Nom)
	if err != nil {
		erreurJSON(w, http.StatusInternalServerError, "erreur interne")
		return
	}
	repondreJSON(w, http.StatusCreated, map[string]int64{"id": id})
}

// --- Clients ---

type clientRequete struct {
	Nom       string `json:"nom"`
	Telephone string `json:"telephone"`
}

func (h *Handler) listerClients(w http.ResponseWriter, r *http.Request) {
	liste, err := h.svc.ListerClients(r.Context())
	if err != nil {
		erreurJSON(w, http.StatusInternalServerError, "erreur interne")
		return
	}
	if liste == nil {
		liste = []store.Client{}
	}
	repondreJSON(w, http.StatusOK, liste)
}

func (h *Handler) creerClient(w http.ResponseWriter, r *http.Request) {
	var req clientRequete
	if err := lireJSON(r, &req); err != nil || req.Nom == "" {
		erreurJSON(w, http.StatusBadRequest, "nom requis")
		return
	}
	id, err := h.svc.CreerClient(r.Context(), req.Nom, req.Telephone)
	if err != nil {
		erreurJSON(w, http.StatusInternalServerError, "erreur interne")
		return
	}
	repondreJSON(w, http.StatusCreated, map[string]int64{"id": id})
}

// --- Utilisateurs ---

func (h *Handler) listerUtilisateurs(w http.ResponseWriter, r *http.Request) {
	liste, err := h.svc.ListerUtilisateurs(r.Context())
	if err != nil {
		erreurJSON(w, http.StatusInternalServerError, "erreur interne")
		return
	}
	if liste == nil {
		liste = []store.Utilisateur{}
	}
	repondreJSON(w, http.StatusOK, liste)
}

type changerPINRequete struct {
	AncienPIN  string `json:"ancien_pin"`
	NouveauPIN string `json:"nouveau_pin"`
}

func (h *Handler) changerPIN(w http.ResponseWriter, r *http.Request) {
	userID, ok := idUtilisateur(r)
	if !ok {
		erreurJSON(w, http.StatusBadRequest, "utilisateur manquant")
		return
	}
	var req changerPINRequete
	if err := lireJSON(r, &req); err != nil {
		erreurJSON(w, http.StatusBadRequest, "JSON invalide")
		return
	}
	if len(req.NouveauPIN) < 4 {
		erreurJSON(w, http.StatusUnprocessableEntity, "le PIN doit avoir au moins 4 chiffres")
		return
	}
	if err := h.svc.ChangerPIN(r.Context(), userID, req.AncienPIN, req.NouveauPIN); err != nil {
		erreurJSON(w, codeErreurService(err), err.Error())
		return
	}
	repondreJSON(w, http.StatusOK, map[string]string{"statut": "ok"})
}
