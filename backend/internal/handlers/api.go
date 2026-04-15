package handlers

import (
	"net/http"
	"scada-backend/internal/db"
	"scada-backend/internal/models"
	"strings"

	"github.com/gin-gonic/gin"
)

// ─── TANKS ─────────────────────────────────────────────────────────────────

func GetTanks(c *gin.Context) {
	rows, err := db.DB.Query(`
		SELECT LOWER(tankcode) AS id, COALESCE(levelpercent, 0) AS level
		FROM tanks ORDER BY tankcode
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	states := []models.TankState{}
	for rows.Next() {
		var ts models.TankState
		if err := rows.Scan(&ts.ID, &ts.Level); err != nil {
			continue
		}
		states = append(states, ts)
	}
	c.JSON(http.StatusOK, states)
}

func UpdateTankLevel(c *gin.Context) {
	code := strings.ToLower(c.Param("code"))

	var req struct {
		Level float64 `json:"level"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "body must be JSON with numeric 'level'"})
		return
	}
	if req.Level < 0 || req.Level > 100 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "level must be between 0 and 100"})
		return
	}

	result, err := db.DB.Exec(`
		UPDATE tanks
		SET levelpercent = $1, updatedat = NOW(), lastreadingat = NOW()
		WHERE LOWER(tankcode) = $2
	`, req.Level, code)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	n, _ := result.RowsAffected()
	if n == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "tank not found: " + code})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "updated", "id": code, "level": req.Level})
}

// ─── FLOW METERS ───────────────────────────────────────────────────────────

func GetFlowMeters(c *gin.Context) {
	rows, err := db.DB.Query(`
		SELECT LOWER(metercode) AS id, COALESCE(currentflowrate, 0) AS flow
		FROM flowmeters WHERE isactive = true ORDER BY metercode
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	states := []models.FlowMeterState{}
	for rows.Next() {
		var fm models.FlowMeterState
		if err := rows.Scan(&fm.ID, &fm.Flow); err != nil {
			continue
		}
		states = append(states, fm)
	}
	c.JSON(http.StatusOK, states)
}

func UpdateFlowRate(c *gin.Context) {
	code := strings.ToLower(c.Param("code"))

	var req struct {
		Flow float64 `json:"flow"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "body must be JSON with numeric 'flow'"})
		return
	}
	if req.Flow < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "flow rate cannot be negative"})
		return
	}

	result, err := db.DB.Exec(`
		UPDATE flowmeters
		SET currentflowrate = $1, updatedat = NOW(), lastreadingat = NOW()
		WHERE LOWER(metercode) = $2 AND isactive = true
	`, req.Flow, code)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	n, _ := result.RowsAffected()
	if n == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "flowmeter not found or inactive: " + code})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "updated", "id": code, "flow": req.Flow})
}

// ─── VALVES ────────────────────────────────────────────────────────────────

func GetValves(c *gin.Context) {
	rows, err := db.DB.Query(`
		SELECT LOWER(valvecode) AS id, isopen
		FROM valves WHERE isactive = true ORDER BY valvecode
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	states := []models.ValveState{}
	for rows.Next() {
		var vs models.ValveState
		if err := rows.Scan(&vs.ID, &vs.IsOpen); err != nil {
			continue
		}
		states = append(states, vs)
	}
	c.JSON(http.StatusOK, states)
}

func ToggleValve(c *gin.Context) {
	code := strings.ToLower(c.Param("code"))

	var req struct {
		Open bool `json:"open"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "body must be JSON with boolean 'open'"})
		return
	}

	feedback := "CLOSED"
	if req.Open {
		feedback = "OPEN"
	}

	result, err := db.DB.Exec(`
		UPDATE valves
		SET isopen = $1, actuatorfeedback = $2, laststatechange = NOW(), updatedat = NOW()
		WHERE LOWER(valvecode) = $3 AND isactive = true
	`, req.Open, feedback, code)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	n, _ := result.RowsAffected()
	if n == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "valve not found or inactive: " + code})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "toggled", "id": code, "isOpen": req.Open})
}

// ─── DASHBOARD (single call) ───────────────────────────────────────────────

func GetDashboard(c *gin.Context) {
	tanks, err := queryTanks()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "tanks: " + err.Error()})
		return
	}
	meters, err := queryFlowMeters()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "flowmeters: " + err.Error()})
		return
	}
	valves, err := queryValves()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "valves: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.DashboardState{
		Tanks:      tanks,
		FlowMeters: meters,
		Valves:     valves,
	})
}

// Private query helpers
func queryTanks() ([]models.TankState, error) {
	rows, err := db.DB.Query(`SELECT LOWER(tankcode), COALESCE(levelpercent,0) FROM tanks ORDER BY tankcode`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []models.TankState
	for rows.Next() {
		var t models.TankState
		if rows.Scan(&t.ID, &t.Level) == nil {
			out = append(out, t)
		}
	}
	return out, nil
}

func queryFlowMeters() ([]models.FlowMeterState, error) {
	rows, err := db.DB.Query(`SELECT LOWER(metercode), COALESCE(currentflowrate,0) FROM flowmeters WHERE isactive = true ORDER BY metercode`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []models.FlowMeterState
	for rows.Next() {
		var f models.FlowMeterState
		if rows.Scan(&f.ID, &f.Flow) == nil {
			out = append(out, f)
		}
	}
	return out, nil
}

func queryValves() ([]models.ValveState, error) {
	rows, err := db.DB.Query(`SELECT LOWER(valvecode), isopen FROM valves WHERE isactive = true ORDER BY valvecode`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []models.ValveState
	for rows.Next() {
		var v models.ValveState
		if rows.Scan(&v.ID, &v.IsOpen) == nil {
			out = append(out, v)
		}
	}
	return out, nil
}