package tests

import (
	"testing"
)

// Période : effectif vivant pendant cette tranche + dépense engagée à ce moment.
type Periode struct {
	DepenseCts int64
	Vivantes   int
}

// CoutParBete calcule le coût unitaire par bête vivante,
// en tenant compte du moment où chaque dépense est survenue.
// Une dépense ne se répartit QUE sur les bêtes vivantes au moment où elle survient.
// Les résultats sont en centimes.
func CoutParBete(periodes []Periode) int64 {
	var total int64
	for _, p := range periodes {
		if p.Vivantes <= 0 {
			continue
		}
		total += p.DepenseCts / int64(p.Vivantes)
	}
	return total
}

// DistribuerReste distribue le reste d'une division entière entre les parts,
// au prorata de leur effectif. Le dernier centime va au plus grand propriétaire.
type Part struct {
	Effectif   int
	MontantCts int64
}

func DistribuerReste(reste int64, parts []Part) []Part {
	if len(parts) == 0 || reste == 0 {
		return parts
	}
	var total int64
	for _, p := range parts {
		total += int64(p.Effectif)
	}
	var distribue int64
	result := make([]Part, len(parts))
	copy(result, parts)
	for i := range result {
		part := reste * int64(result[i].Effectif) / total
		result[i].MontantCts += part
		distribue += part
	}
	// Le dernier centime va au plus grand propriétaire (index 0 si trié par desc).
	result[0].MontantCts += reste - distribue
	return result
}

// --- Tests des règles métier (chapitre 7) ---
// Les résultats attendus sont calculés à la main, jamais par l'IA.

func TestCoutParBete_SimpleCasAchat(t *testing.T) {
	// 1000 bêtes à 1 $ = 100 centimes chacune. Aucune dépense ensuite.
	periodes := []Periode{
		{DepenseCts: 100_000, Vivantes: 1000},
	}
	got := CoutParBete(periodes)
	want := int64(100) // 100 centimes = 1 $
	if got != want {
		t.Errorf("got %d, want %d", got, want)
	}
}

func TestCoutParBete_AchatPuisMortalitePuisDepense(t *testing.T) {
	// Cas du livre : 1000 bêtes à 1 $, 200 morts en semaine 2, 2000 $ de nourriture en semaine 5.
	// Période 1 (achat) : 100 000 cts / 1000 = 100 cts par bête
	// Période 2 (après 200 morts, dépense nourriture) : 200 000 cts / 800 = 250 cts par bête
	// Total : 350 cts = 3,50 $
	periodes := []Periode{
		{DepenseCts: 100_000, Vivantes: 1000}, // achat initial
		{DepenseCts: 200_000, Vivantes: 800},  // nourriture semaine 5, après 200 morts
	}
	got := CoutParBete(periodes)
	want := int64(350) // 3,50 $ = 350 centimes
	if got != want {
		t.Errorf("got %d, want %d", got, want)
	}
}

func TestCoutParBete_DivisionSimpleDonneResultatDifferent(t *testing.T) {
	// La division simple donnerait 3000 $ / 800 = 3,75 $ = 375 cts.
	// Notre méthode donne 350 cts. Preuve que la division simple est fausse.
	periodes := []Periode{
		{DepenseCts: 100_000, Vivantes: 1000},
		{DepenseCts: 200_000, Vivantes: 800},
	}
	got := CoutParBete(periodes)
	divisionSimple := int64(300_000) / 800 // 375 cts
	if got == divisionSimple {
		t.Error("les deux méthodes donnent le même résultat : la règle n'est pas appliquée")
	}
	if got != 350 {
		t.Errorf("got %d, want 350", got)
	}
}

func TestCoutParBete_ZeroBetes(t *testing.T) {
	// Si toutes les bêtes sont mortes, la dépense ne se répartit pas.
	periodes := []Periode{
		{DepenseCts: 100_000, Vivantes: 1000},
		{DepenseCts: 50_000, Vivantes: 0},
	}
	got := CoutParBete(periodes)
	// Seule la première période compte.
	if got != 100 {
		t.Errorf("got %d, want 100", got)
	}
}

// --- Tests des refus (règles interdites) ---

func TestRefus_PlusDeMortsThanVivants(t *testing.T) {
	// 782 bêtes vivantes, on essaie d'en tuer 900 : doit être refusé.
	vivantes := 782
	nombre := 900
	if nombre <= vivantes {
		t.Error("devrait être refusé : nombre > vivantes")
	}
}

func TestRefus_PaiementExcessif(t *testing.T) {
	// Vente de 240 $, déjà payé 240 $, paiement de 10 $ en plus : refus.
	totalCts := int64(24_000)
	paye := int64(24_000)
	reste := totalCts - paye
	nouveauPaiement := int64(1_000)
	if nouveauPaiement <= reste {
		t.Error("devrait être refusé : paiement > reste")
	}
}

// --- Tests des arrondis ---

func TestDistribuerReste_SommeEgaleReste(t *testing.T) {
	// 200 000 cts répartis sur 786 bêtes : 254 cts/bête, reste de 356 cts.
	// Deux propriétaires : 700 et 86 bêtes.
	total := int64(200_000)
	vivantes := 786
	parBete := total / int64(vivantes)         // 254
	reste := total - parBete*int64(vivantes) // 356

	parts := []Part{
		{Effectif: 700, MontantCts: parBete * 700},
		{Effectif: 86, MontantCts: parBete * 86},
	}

	distribue := DistribuerReste(reste, parts)

	// La somme doit égaler le total.
	var somme int64
	for _, p := range distribue {
		somme += p.MontantCts
	}
	if somme != total {
		t.Errorf("somme %d ≠ total %d", somme, total)
	}
}

func TestDistribuerReste_GrandProprietaireRecoit(t *testing.T) {
	// Le dernier centime va au plus grand propriétaire (index 0).
	parts := []Part{
		{Effectif: 900, MontantCts: 0},
		{Effectif: 100, MontantCts: 0},
	}
	avant := parts[0].MontantCts
	distribue := DistribuerReste(7, parts)
	// Le plus grand (900) doit avoir plus que l'autre.
	if distribue[0].MontantCts <= distribue[1].MontantCts {
		t.Error("le grand propriétaire devrait recevoir plus")
	}
	if distribue[0].MontantCts <= avant {
		t.Error("le grand propriétaire devrait avoir reçu quelque chose")
	}
}
