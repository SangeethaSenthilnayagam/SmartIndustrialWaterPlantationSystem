package models

// ─── API Response Structs ──────────────────────────────────────────────────────
//
// These structs define exactly what the Go handlers serialize to JSON and
// what the React frontend reads. Field names MUST match the keys Home.js
// and ControlPanel.js reference — do not rename them without updating the UI.
//
//   tank.id          tank.level
//   fm.id            fm.flow
//   valve.id         valve.isOpen

// TankState is the JSON payload for GET /api/tanks and PUT /api/tanks/:code/level.
// ID holds the lowercase UI key (e.g. "glsr-01", "oht-01", "conic-sump").
// Level is LevelPercent from the DB, in the range 0–100.
type TankState struct {
	ID    string  `json:"id"`
	Level float64 `json:"level"`
}

// FlowMeterState is the JSON payload for GET /api/flowmeters.
// ID holds the lowercase UI key (e.g. "flowmeter-glsr-01").
// Flow is CurrentFlowRate from the DB.
type FlowMeterState struct {
	ID   string  `json:"id"`
	Flow float64 `json:"flow"`
}

// ValveState is the JSON payload for GET /api/valves.
// ID holds the lowercase UI key (e.g. "valve-glsr-01").
// IsOpen maps directly to the IsOpen column.
type ValveState struct {
	ID     string `json:"id"`
	IsOpen bool   `json:"isOpen"` // camelCase matches Home.js: valve.isOpen
}

// DashboardState is the single-call response for GET /api/dashboard.
// Using one request instead of three reduces startup latency.
type DashboardState struct {
	Tanks      []TankState      `json:"tanks"`
	FlowMeters []FlowMeterState `json:"flowmeters"`
	Valves     []ValveState     `json:"valves"`
}