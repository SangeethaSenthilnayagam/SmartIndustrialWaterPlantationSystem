package handlers

// telemetry_handler.go
//
// Provides four HTTP endpoints that let the React frontend ingest an Excel
// simulation file and replay it as a timeline:
//
//   POST /api/simulation/upload   — multipart; receives .xlsx, parses, inserts
//   GET  /api/simulation/timerange — {min, max, empty} for the scrubber
//   GET  /api/simulation/snapshot  — ?at=<ISO> → records at the closest time
//   GET  /api/simulation/stream    — SSE push when new data arrives
//
// The Excel workbook must contain a sheet named "TimeSeriesData" whose columns
// follow the convention used in scada_simulation.xlsx:
//   Timestamp, MainValveState, MainInflow_m3h,
//   <tank>_LevelPercent, <tank>_Outflow_m3h  (e.g. glsr-01_LevelPercent)

import (
	"database/sql"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"scada-backend/internal/db"

	"github.com/gin-gonic/gin"
	"github.com/xuri/excelize/v2"
)

// ─── SSE broadcast hub ────────────────────────────────────────────────────────

type sseHub struct {
	mu      sync.Mutex
	clients map[chan string]struct{}
}

var simHub = &sseHub{clients: make(map[chan string]struct{})}

func (h *sseHub) subscribe() chan string {
	ch := make(chan string, 8)
	h.mu.Lock()
	h.clients[ch] = struct{}{}
	h.mu.Unlock()
	return ch
}

func (h *sseHub) unsubscribe(ch chan string) {
	h.mu.Lock()
	delete(h.clients, ch)
	h.mu.Unlock()
	close(ch)
}

func (h *sseHub) broadcast(msg string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	for ch := range h.clients {
		select {
		case ch <- msg:
		default: // drop if client is slow
		}
	}
}

// ─── TelemetryRecord — matches JSON keys read by simulationApi.groupSnapshot ──

type TelemetryRecord struct {
	RecordedAt string `json:"recorded_at"`
	AssetType  string `json:"asset_type"`
	AssetCode  string `json:"asset_code"`
	TagName    string `json:"tag_name"`
	TagValue   string `json:"tag_value"`
}

// ─── POST /api/simulation/upload ─────────────────────────────────────────────

// UploadSimulation accepts a multipart .xlsx file, parses the TimeSeriesData
// sheet, replaces the telemetry_log table content, updates the live SCADA
// tables with the most-recent Excel row, and broadcasts import_complete over SSE.
func UploadSimulation(c *gin.Context) {
	fh, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "multipart field 'file' is required"})
		return
	}

	f, err := fh.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer f.Close()

	xl, err := excelize.OpenReader(f)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot open xlsx: " + err.Error()})
		return
	}

	rows, err := xl.GetRows("TimeSeriesData")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "sheet 'TimeSeriesData' not found"})
		return
	}
	if len(rows) < 2 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no data rows in TimeSeriesData"})
		return
	}

	header := rows[0]
	sessionID := time.Now().UTC().Format("20060102-150405")

	// Wipe previous import so the scrubber always shows exactly one session.
	if _, err = db.DB.Exec(`DELETE FROM telemetry_log`); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "clear old data: " + err.Error()})
		return
	}

	tx, err := db.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	stmt, err := tx.Prepare(`
		INSERT INTO telemetry_log
		       (session_id, recorded_at, asset_type, asset_code, tag_name, tag_value)
		VALUES ($1, $2::TIMESTAMPTZ, $3, $4, $5, $6)
	`)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer stmt.Close()

	count := 0
	for _, row := range rows[1:] {
		if len(row) == 0 {
			continue
		}
		ts := strings.TrimSpace(row[0])
		if ts == "" {
			continue
		}

		for ci, col := range header[1:] {
			rawVal := ""
			if ci+1 < len(row) {
				rawVal = strings.TrimSpace(row[ci+1])
			}
			assetType, assetCode, tagName := classifyColumn(col)
			if assetType == "" {
				continue
			}
			tagValue := normaliseValue(tagName, rawVal)

			if _, err = stmt.Exec(sessionID, ts, assetType, assetCode, tagName, tagValue); err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			count++
		}
	}

	if err = tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Apply the final Excel row to the live SCADA tables so the dashboard
	// immediately reflects the imported data without waiting for a DB poll.
	applyLatestRow(rows, header)

	// Notify all SSE clients.
	simHub.broadcast(
		fmt.Sprintf("event: import_complete\ndata: {\"session\":\"%s\",\"rows\":%d}\n\n",
			sessionID, count),
	)

	c.JSON(http.StatusOK, gin.H{
		"status":  "imported",
		"session": sessionID,
		"rows":    count,
	})
}

// ─── GET /api/simulation/timerange ───────────────────────────────────────────

// GetSimulationTimeRange returns the min/max timestamps in telemetry_log.
// Response shape: { empty: bool, min: string, max: string }
func GetSimulationTimeRange(c *gin.Context) {
	var minTS, maxTS sql.NullString
	err := db.DB.QueryRow(`
		SELECT TO_CHAR(MIN(recorded_at) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
		       TO_CHAR(MAX(recorded_at) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		FROM   telemetry_log
	`).Scan(&minTS, &maxTS)

	if err != nil || !minTS.Valid {
		c.JSON(http.StatusOK, gin.H{"empty": true})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"empty": false,
		"min":   minTS.String,
		"max":   maxTS.String,
	})
}

// ─── GET /api/simulation/snapshot ────────────────────────────────────────────

// GetSimulationSnapshot returns all telemetry records at the timestamp
// closest to the ?at= query parameter (or the latest if omitted).
// Response shape: { records: TelemetryRecord[] }
func GetSimulationSnapshot(c *gin.Context) {
	atStr := strings.TrimSpace(c.Query("at"))

	// Step 1: find the closest recorded_at.
	var closestTS sql.NullString
	var qErr error

	if atStr == "" {
		qErr = db.DB.QueryRow(`
			SELECT TO_CHAR(MAX(recorded_at) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
			FROM telemetry_log
		`).Scan(&closestTS)
	} else {
		// Use a bidirectional UNION to avoid a full table sort on large sets.
		qErr = db.DB.QueryRow(`
			SELECT ts FROM (
			  (SELECT recorded_at AS ts FROM telemetry_log
			     WHERE recorded_at <= $1::TIMESTAMPTZ
			     ORDER BY recorded_at DESC LIMIT 1)
			  UNION ALL
			  (SELECT recorded_at AS ts FROM telemetry_log
			     WHERE recorded_at >= $1::TIMESTAMPTZ
			     ORDER BY recorded_at ASC LIMIT 1)
			) sub
			ORDER BY ABS(EXTRACT(EPOCH FROM (ts - $1::TIMESTAMPTZ)))
			LIMIT 1
		`, atStr).Scan(&closestTS)
	}

	if qErr != nil || !closestTS.Valid {
		c.JSON(http.StatusOK, gin.H{"records": []TelemetryRecord{}})
		return
	}

	// Step 2: fetch all records at that exact timestamp.
	rows, err := db.DB.Query(`
		SELECT TO_CHAR(recorded_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
		       asset_type, asset_code, tag_name, tag_value
		FROM   telemetry_log
		WHERE  recorded_at = $1::TIMESTAMPTZ
		ORDER  BY asset_type, asset_code, tag_name
	`, closestTS.String)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	records := make([]TelemetryRecord, 0, 20)
	for rows.Next() {
		var r TelemetryRecord
		if rows.Scan(&r.RecordedAt, &r.AssetType, &r.AssetCode, &r.TagName, &r.TagValue) == nil {
			records = append(records, r)
		}
	}
	c.JSON(http.StatusOK, gin.H{"records": records})
}

// ─── GET /api/simulation/stream (SSE) ────────────────────────────────────────

// SimulationStream opens a Server-Sent Events channel.
// The frontend subscribes once on mount; when an Excel file is uploaded the
// backend sends an "import_complete" event so the UI refreshes without polling.
func SimulationStream(c *gin.Context) {
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no") // disable Nginx buffering if present

	ch := simHub.subscribe()
	defer simHub.unsubscribe(ch)

	// Send immediate handshake so the frontend knows the connection is alive.
	fmt.Fprintf(c.Writer, "event: connected\ndata: {}\n\n")
	c.Writer.Flush()

	ctx := c.Request.Context()
	heartbeat := time.NewTicker(25 * time.Second)
	defer heartbeat.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-heartbeat.C:
			fmt.Fprintf(c.Writer, ": heartbeat\n\n")
			c.Writer.Flush()
		case msg, ok := <-ch:
			if !ok {
				return
			}
			fmt.Fprint(c.Writer, msg)
			c.Writer.Flush()
		}
	}
}

// ─── Private helpers ─────────────────────────────────────────────────────────

// classifyColumn maps an Excel column header to (assetType, assetCode, tagName).
// Returns empty strings for columns that should be ignored (e.g. "Timestamp").
func classifyColumn(col string) (assetType, assetCode, tagName string) {
	col = strings.TrimSpace(col)
	switch {
	case col == "MainValveState":
		return "Valve", "valve-main-001", "IsOpen"
	case col == "MainInflow_m3h":
		return "FlowMeter", "flowmeter-001", "CurrentFlowRate"
	case strings.HasSuffix(col, "_LevelPercent"):
		tank := strings.ToLower(strings.TrimSuffix(col, "_LevelPercent"))
		return "Tank", tank, "LevelPercent"
	case strings.HasSuffix(col, "_Outflow_m3h"):
		tank := strings.ToLower(strings.TrimSuffix(col, "_Outflow_m3h"))
		return "FlowMeter", "flowmeter-" + tank, "CurrentFlowRate"
	}
	return "", "", ""
}

// normaliseValue converts raw Excel cell text to the canonical tag value.
// Valve state: "OPEN" → "true", anything else → "false".
// All other tags: pass through as-is (float strings).
func normaliseValue(tagName, raw string) string {
	if tagName == "IsOpen" {
		if strings.EqualFold(strings.TrimSpace(raw), "OPEN") {
			return "true"
		}
		return "false"
	}
	return raw
}

// applyLatestRow pushes the final row of the imported Excel into the live
// tanks / flowmeters / valves tables so the SCADA dashboard updates immediately.
func applyLatestRow(rows [][]string, header []string) {
	last := rows[len(rows)-1]
	for ci, col := range header[1:] {
		raw := ""
		if ci+1 < len(last) {
			raw = strings.TrimSpace(last[ci+1])
		}
		if raw == "" {
			continue
		}
		assetType, assetCode, tagName := classifyColumn(col)
		val := normaliseValue(tagName, raw)

		switch {
		case assetType == "Tank" && tagName == "LevelPercent":
			lvl, err := strconv.ParseFloat(val, 64)
			if err != nil {
				continue
			}
			db.DB.Exec(
				`UPDATE tanks SET levelpercent=$1, updatedat=NOW(), lastreadingat=NOW()
				  WHERE LOWER(tankcode)=$2`,
				lvl, assetCode,
			)

		case assetType == "FlowMeter" && tagName == "CurrentFlowRate":
			flow, err := strconv.ParseFloat(val, 64)
			if err != nil {
				continue
			}
			db.DB.Exec(
				`UPDATE flowmeters SET currentflowrate=$1, updatedat=NOW(), lastreadingat=NOW()
				  WHERE LOWER(metercode)=$2 AND isactive=true`,
				flow, assetCode,
			)

		case assetType == "Valve" && tagName == "IsOpen":
			isOpen := val == "true"
			feedback := "CLOSED"
			if isOpen {
				feedback = "OPEN"
			}
			db.DB.Exec(
				`UPDATE valves SET isopen=$1, actuatorfeedback=$2, laststatechange=NOW(), updatedat=NOW()
				  WHERE LOWER(valvecode)=$3 AND isactive=true`,
				isOpen, feedback, assetCode,
			)
		}
	}
}