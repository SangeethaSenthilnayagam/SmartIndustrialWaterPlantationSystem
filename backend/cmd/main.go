package main

import (
	"log"
	"os"
	"scada-backend/internal/db"
	"scada-backend/internal/handlers"
	"scada-backend/internal/simulation"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system env")
	}

	db.InitDB()
	defer db.DB.Close()

	// Start background simulation (drain/refill)
	go simulation.Run(db.DB)

	r := gin.Default()

	// CORS: allow React dev server
	corsConfig := cors.Config{
		AllowOrigins:     []string{"http://localhost:3000", "http://localhost:3001"},
		AllowMethods:     []string{"GET", "PUT", "POST", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		AllowCredentials: true,
	}
	r.Use(cors.New(corsConfig))

	api := r.Group("/api")
	{
		// ── Dashboard (single call) ─────────────────────────────────────────────
		api.GET("/dashboard", handlers.GetDashboard)

		// ── Tanks ───────────────────────────────────────────────────────────────
		api.GET("/tanks", handlers.GetTanks)
		api.PUT("/tanks/:code/level", handlers.UpdateTankLevel)

		// ── Flow meters ─────────────────────────────────────────────────────────
		api.GET("/flowmeters", handlers.GetFlowMeters)
		api.PUT("/flowmeters/:code/flow", handlers.UpdateFlowRate)

		// ── Valves ──────────────────────────────────────────────────────────────
		api.GET("/valves", handlers.GetValves)
		api.PUT("/valves/:code/toggle", handlers.ToggleValve)

		// ── Maintenance tasks ───────────────────────────────────────────────────
		api.GET("/maintenance/tasks", handlers.GetMaintenanceTasks)
		api.PUT("/maintenance/tasks/:id/status", handlers.UpdateMaintenanceTaskStatus)

		// ── Simulation / Excel import ────────────────────────────────────────────
		api.POST("/simulation/upload", handlers.UploadSimulation)
		api.GET("/simulation/timerange", handlers.GetSimulationTimeRange)
		api.GET("/simulation/snapshot", handlers.GetSimulationSnapshot)
		api.GET("/simulation/stream", handlers.SimulationStream)
	}

	port := os.Getenv("API_PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("✓ SCADA API running on http://localhost:%s", port)
	r.Run(":" + port)
}