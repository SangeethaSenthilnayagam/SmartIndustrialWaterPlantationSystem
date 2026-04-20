package handlers

import (
	"net/http"
	"strconv"
	"time"

	"scada-backend/internal/db"

	"github.com/gin-gonic/gin"
)

type MaintenanceTask struct {
	ID     int    `json:"id"`
	Asset  string `json:"asset"` // display name
	Type   string `json:"type"`  // Scheduled, Calibration, etc.
	Desc   string `json:"desc"`
	Due    string `json:"due"` // YYYY-MM-DD
	Status string `json:"status"`
}

// GetMaintenanceTasks returns all tasks with human-readable asset names
func GetMaintenanceTasks(c *gin.Context) {
	query := `
		SELECT 
			mt.TaskID,
			COALESCE(t.TankName, p.PumpName, v.ValveName, fm.MeterName, s.SensorName) AS asset_name,
			mt.TaskType,
			mt.Description,
			mt.DueDate,
			mt.Status
		FROM MaintenanceTasks mt
		JOIN AssetTypes at ON mt.AssetTypeID = at.TypeID
		LEFT JOIN Tanks t ON mt.AssetTypeID = (SELECT TypeID FROM AssetTypes WHERE TypeName='Tank') AND mt.AssetID = t.AssetID
		LEFT JOIN Pumps p ON mt.AssetTypeID = (SELECT TypeID FROM AssetTypes WHERE TypeName='Pump') AND mt.AssetID = p.AssetID
		LEFT JOIN Valves v ON mt.AssetTypeID = (SELECT TypeID FROM AssetTypes WHERE TypeName='Valve') AND mt.AssetID = v.AssetID
		LEFT JOIN FlowMeters fm ON mt.AssetTypeID = (SELECT TypeID FROM AssetTypes WHERE TypeName='FlowMeter') AND mt.AssetID = fm.AssetID
		LEFT JOIN Sensors s ON mt.AssetTypeID = (SELECT TypeID FROM AssetTypes WHERE TypeName='Sensor') AND mt.AssetID = s.AssetID
		ORDER BY mt.DueDate ASC
	`
	rows, err := db.DB.Query(query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	tasks := []MaintenanceTask{}
	for rows.Next() {
		var t MaintenanceTask
		var dueDate time.Time
		err := rows.Scan(&t.ID, &t.Asset, &t.Type, &t.Desc, &dueDate, &t.Status)
		if err != nil {
			continue
		}
		t.Due = dueDate.Format("2006-01-02")
		tasks = append(tasks, t)
	}
	c.JSON(http.StatusOK, tasks)
}

// UpdateMaintenanceTaskStatus changes the status of a task (e.g., to 'done')
func UpdateMaintenanceTaskStatus(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid task id"})
		return
	}

	var req struct {
		Status string `json:"status"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate status
	validStatus := map[string]bool{
		"scheduled": true, "pending": true, "overdue": true, "done": true,
	}
	if !validStatus[req.Status] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid status"})
		return
	}

	_, err = db.DB.Exec(`
		UPDATE MaintenanceTasks
		SET Status = $1, UpdatedAt = CURRENT_TIMESTAMP
		WHERE TaskID = $2
	`, req.Status, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "status updated"})
}