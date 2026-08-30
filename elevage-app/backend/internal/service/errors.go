package service

import "errors"

var (
	ErrNombreInvalide           = errors.New("le nombre doit être supérieur à zéro")
	ErrArrivageInconnu          = errors.New("arrivage introuvable")
	ErrPlusDeMortsQueDeVivantes = errors.New("le nombre de morts dépasse l'effectif vivant")
	ErrSommeParts               = errors.New("la somme des parts ne correspond pas à l'effectif total")
	ErrPaiementExcessif         = errors.New("le paiement dépasse le solde restant dû")
	ErrVenteIntrouvable         = errors.New("vente introuvable")
	ErrMouvementIntrouvable     = errors.New("mouvement introuvable ou déjà annulé")
	ErrUtilisateurInconnu       = errors.New("utilisateur introuvable")
	ErrPINInvalide              = errors.New("PIN invalide")
)
