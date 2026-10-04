package tests

import (
	"os"
	"regexp"
	"testing"

	"golang.org/x/crypto/bcrypt"
)

func TestDocumentedInitialPIN(t *testing.T) {
	seed, err := os.ReadFile("../migrations/003_seed.sql")
	if err != nil {
		t.Fatal(err)
	}
	hash := regexp.MustCompile("\\$2[aby]\\$[0-9]{2}\\$[./A-Za-z0-9]{53}").Find(seed)
	if hash == nil {
		t.Fatal("initial PIN hash not found")
	}
	if err := bcrypt.CompareHashAndPassword(hash, []byte("0000")); err != nil {
		t.Fatal("initial demo PIN does not match the documented 0000")
	}
}
