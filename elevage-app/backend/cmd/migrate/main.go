package main

import (
	"context"
	"database/sql"
	"log"
	"os"
	"path/filepath"
	"sort"
	"time"

	_ "github.com/lib/pq"
)

func main() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL is required")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	db.SetMaxOpenConns(1)

	if err := db.PingContext(ctx); err != nil {
		log.Fatalf("database connection failed: %v", err)
	}

	_, err = db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version TEXT PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)
	`)
	if err != nil {
		log.Fatalf("create migration table: %v", err)
	}

	files, err := filepath.Glob("migrations/*.sql")
	if err != nil {
		log.Fatal(err)
	}
	sort.Strings(files)
	if len(files) == 0 {
		log.Fatal("no SQL migrations found in migrations/")
	}

	for _, file := range files {
		version := filepath.Base(file)
		var applied bool
		err := db.QueryRowContext(ctx,
			"SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE version = $1)",
			version,
		).Scan(&applied)
		if err != nil {
			log.Fatalf("check migration %s: %v", version, err)
		}
		if applied {
			log.Printf("already applied: %s", version)
			continue
		}

		script, err := os.ReadFile(file)
		if err != nil {
			log.Fatalf("read migration %s: %v", version, err)
		}

		tx, err := db.BeginTx(ctx, nil)
		if err != nil {
			log.Fatalf("begin migration %s: %v", version, err)
		}
		if _, err := tx.ExecContext(ctx, string(script)); err != nil {
			_ = tx.Rollback()
			log.Fatalf("apply migration %s: %v", version, err)
		}
		if _, err := tx.ExecContext(ctx,
			"INSERT INTO schema_migrations (version) VALUES ($1)", version,
		); err != nil {
			_ = tx.Rollback()
			log.Fatalf("record migration %s: %v", version, err)
		}
		if err := tx.Commit(); err != nil {
			log.Fatalf("commit migration %s: %v", version, err)
		}
		log.Printf("applied: %s", version)
	}
}
