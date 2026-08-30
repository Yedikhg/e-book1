DB_URL ?= postgres://postgres:postgres@localhost:5432/elevage?sslmode=disable
PORT   ?= 8080

.PHONY: dev-back dev-front build migrate seed test lint clean

# Lance le backend en mode développement
dev-back:
	DATABASE_URL=$(DB_URL) PORT=$(PORT) go run ./cmd/api/main.go

# Lance le frontend en mode développement
dev-front:
	cd frontend && npm run dev

# Compile le backend
build:
	go build -o dist/api ./cmd/api/main.go
	cd frontend && npm run build

# Applique les migrations SQL dans l'ordre
migrate:
	psql $(DB_URL) -f migrations/001_schema.sql
	psql $(DB_URL) -f migrations/002_views.sql
	psql $(DB_URL) -f migrations/003_seed.sql

# Applique seulement le seed (si la base est déjà créée)
seed:
	psql $(DB_URL) -f migrations/003_seed.sql

# Lance les tests Go
test:
	go test ./tests/... -v

# Vérifie le formatage et les imports
lint:
	gofmt -l ./...
	go vet ./...

# Nettoie les artefacts compilés
clean:
	rm -rf dist/ frontend/dist/
