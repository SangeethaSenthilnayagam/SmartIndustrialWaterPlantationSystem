package simulation

import (
	"database/sql"
	"log"
	"time"
)

const (
	TickInterval   = 30 * time.Second
	DrainRateGLSR  = 0.5
	DrainRateOHT   = 0.8
	RefillRateSump = 1.5
	MinLevel       = 5.0
	MaxLevel       = 98.0
)

func Run(db *sql.DB) {
	log.Printf("✓ Simulation started (tick every %s)", TickInterval)
	ticker := time.NewTicker(TickInterval)
	defer ticker.Stop()
	for range ticker.C {
		if err := tick(db); err != nil {
			log.Printf("simulation tick error: %v", err)
		}
	}
}

func tick(db *sql.DB) error {
	rows, err := db.Query(`
		SELECT LOWER(tankcode), tankvariant, COALESCE(levelpercent, 0)
		FROM tanks ORDER BY tankcode
	`)
	if err != nil {
		return err
	}
	defer rows.Close()

	type tankRow struct {
		code    string
		variant string
		level   float64
	}
	var tanks []tankRow
	for rows.Next() {
		var t tankRow
		if err := rows.Scan(&t.code, &t.variant, &t.level); err != nil {
			continue
		}
		tanks = append(tanks, t)
	}

	for _, t := range tanks {
		newLevel := t.level
		switch {
		case t.code == "conic-sump":
			newLevel = clamp(t.level+RefillRateSump, MinLevel, MaxLevel)
		case t.variant == "GLSR":
			newLevel = clamp(t.level-DrainRateGLSR, MinLevel, MaxLevel)
		case t.variant == "OHTank":
			newLevel = clamp(t.level-DrainRateOHT, MinLevel, MaxLevel)
		}
		if newLevel == t.level {
			continue
		}
		_, err := db.Exec(`
			UPDATE tanks SET levelpercent = $1, updatedat = NOW(), lastreadingat = NOW()
			WHERE LOWER(tankcode) = $2
		`, newLevel, t.code)
		if err != nil {
			log.Printf("simulation: failed to update %s: %v", t.code, err)
		}
	}
	return nil
}

func clamp(v, min, max float64) float64 {
	if v < min {
		return min
	}
	if v > max {
		return max
	}
	return v
}