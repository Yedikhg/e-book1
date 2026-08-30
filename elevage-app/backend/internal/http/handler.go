package http

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"strings"

	"github.com/yedikhg/elevage-app/internal/service"
)

type Handler struct {
	svc    *service.Service
	logger *slog.Logger
}

func New(svc *service.Service, logger *slog.Logger) *Handler {
	return &Handler{svc: svc, logger: logger}
}

func (h *Handler) Routes() http.Handler {
	mux := http.NewServeMux()

	// Arrivages
	mux.HandleFunc("GET /api/arrivages", h.listerArrivages)
	mux.HandleFunc("POST /api/arrivages", h.creerArrivage)
	mux.HandleFunc("GET /api/arrivages/{id}/etat", h.etatArrivage)

	// Mortalités
	mux.HandleFunc("POST /api/arrivages/{id}/mortalites", h.enregistrerMortalite)

	// Ventes
	mux.HandleFunc("GET /api/ventes", h.listerVentes)
	mux.HandleFunc("GET /api/ventes/{id}", h.obtenirVente)
	mux.HandleFunc("POST /api/arrivages/{id}/ventes", h.enregistrerVente)

	// Paiements
	mux.HandleFunc("POST /api/ventes/{id}/paiements", h.enregistrerPaiement)

	// Corrections
	mux.HandleFunc("POST /api/corrections", h.annulerMouvement)

	// Référentiels
	mux.HandleFunc("GET /api/proprietaires", h.listerProprietaires)
	mux.HandleFunc("POST /api/proprietaires", h.creerProprietaire)
	mux.HandleFunc("GET /api/clients", h.listerClients)
	mux.HandleFunc("POST /api/clients", h.creerClient)
	mux.HandleFunc("GET /api/utilisateurs", h.listerUtilisateurs)
	mux.HandleFunc("POST /api/utilisateurs/moi/pin", h.changerPIN)

	// Santé
	mux.HandleFunc("GET /api/sante", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{"statut": "ok"})
	})

	return corsMiddleware(mux)
}

// --- Helpers ---

func repondreJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func erreurJSON(w http.ResponseWriter, code int, msg string) {
	repondreJSON(w, code, map[string]string{"erreur": msg})
}

func lireJSON(r *http.Request, v any) error {
	r.Body = http.MaxBytesReader(nil, r.Body, 1<<20)
	return json.NewDecoder(r.Body).Decode(v)
}

func idDepuisURL(r *http.Request, segment string) (int64, bool) {
	s := r.PathValue(segment)
	id, err := strconv.ParseInt(s, 10, 64)
	return id, err == nil && id > 0
}

// idUtilisateur lit l'id de l'utilisateur depuis le header X-User-ID.
// Pour une vraie auth, remplacer par JWT.
func idUtilisateur(r *http.Request) (int64, bool) {
	s := r.Header.Get("X-User-ID")
	if s == "" {
		s = "1" // valeur par défaut pour faciliter les tests
	}
	id, err := strconv.ParseInt(strings.TrimSpace(s), 10, 64)
	return id, err == nil && id > 0
}

// codeErreurService traduit une erreur service en code HTTP.
func codeErreurService(err error) int {
	switch {
	case errors.Is(err, service.ErrArrivageInconnu),
		errors.Is(err, service.ErrVenteIntrouvable),
		errors.Is(err, service.ErrMouvementIntrouvable),
		errors.Is(err, service.ErrUtilisateurInconnu):
		return http.StatusNotFound
	case errors.Is(err, service.ErrNombreInvalide),
		errors.Is(err, service.ErrPlusDeMortsQueDeVivantes),
		errors.Is(err, service.ErrSommeParts),
		errors.Is(err, service.ErrPaiementExcessif),
		errors.Is(err, service.ErrPINInvalide):
		return http.StatusUnprocessableEntity
	default:
		return http.StatusInternalServerError
	}
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-User-ID")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
