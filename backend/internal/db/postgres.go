package db

import (
	"database/sql"
	"log"
	"os"
	"time"

	_ "github.com/lib/pq" // PostgreSQL driver — side-effect import
)

// DB is the shared connection pool used by all handlers and the simulation.
var DB *sql.DB

// InitDB opens a PostgreSQL connection using DATABASE_URL from the environment,
// pings the server to verify connectivity, and configures the connection pool.
// It calls log.Fatal on any failure, so the process exits cleanly rather than
// starting with a broken DB connection.
func InitDB() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL is not set. Copy .env.example to .env and fill in your credentials.")
	}

	var err error
	DB, err = sql.Open("postgres", dsn)
	if err != nil {
		log.Fatalf("Failed to open database connection: %v", err)
	}

	// Verify the connection is actually alive
	if err = DB.Ping(); err != nil {
		log.Fatalf("Failed to reach PostgreSQL: %v\n"+
			"Check DATABASE_URL and that Postgres is running.", err)
	}

	// Connection pool tuning
	DB.SetMaxOpenConns(10)
	DB.SetMaxIdleConns(5)
	DB.SetConnMaxLifetime(5 * time.Minute)

	log.Println("✓ PostgreSQL connected")
}