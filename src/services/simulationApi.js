// src/services/simulationApi.js
//
// Client-side helpers for the simulation / Excel-import layer.
//
// Functions exported and consumed by Home.js:
//   openSimulationStream(onEvent, onDisconnect)  → EventSource (call .close() to unsubscribe)
//   fetchSnapshot(atISO | null)                  → Promise<{ records: TelemetryRecord[] }>
//   fetchTimeRange()                             → Promise<{ empty, min, max }>
//   groupSnapshot(records)                       → grouped object (by assetType → code → tags)
//   uploadExcel(file)                            → Promise<{ status, session, rows }>

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:8080';

// ─── SSE stream ───────────────────────────────────────────────────────────────
//
// Opens a persistent Server-Sent Events connection to /api/simulation/stream.
// Calls onEvent({ type: 'connected' | 'import_complete', ...data }) when events
// arrive.  Calls onDisconnect() when the connection drops.
//
// Returns the raw EventSource — caller must call .close() on unmount.
//
export function openSimulationStream(onEvent, onDisconnect) {
  const url = `${BASE}/api/simulation/stream`;
  const es = new EventSource(url);

  es.addEventListener('connected', (e) => {
    try { onEvent({ type: 'connected', ...JSON.parse(e.data) }); }
    catch { onEvent({ type: 'connected' }); }
  });

  es.addEventListener('import_complete', (e) => {
    try { onEvent({ type: 'import_complete', ...JSON.parse(e.data) }); }
    catch { onEvent({ type: 'import_complete' }); }
  });

  es.onerror = () => {
    onDisconnect?.();
  };

  return es;
}

// ─── Snapshot ─────────────────────────────────────────────────────────────────
//
// Returns all telemetry records at the timestamp closest to atISO.
// Pass null (or omit) to get the most-recent snapshot.
//
// Response shape: { records: TelemetryRecord[] }
// TelemetryRecord: { recorded_at, asset_type, asset_code, tag_name, tag_value }
//
export async function fetchSnapshot(atISO) {
  const url = atISO
    ? `${BASE}/api/simulation/snapshot?at=${encodeURIComponent(atISO)}`
    : `${BASE}/api/simulation/snapshot`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetchSnapshot HTTP ${res.status}`);
  return res.json();
}

// ─── Time range ───────────────────────────────────────────────────────────────
//
// Returns the min/max timestamps present in telemetry_log.
//
// Response when data exists: { empty: false, min: string, max: string }
// Response when table is empty: { empty: true }
//
export async function fetchTimeRange() {
  const res = await fetch(`${BASE}/api/simulation/timerange`);
  if (!res.ok) throw new Error(`fetchTimeRange HTTP ${res.status}`);
  return res.json();
}

// ─── Group snapshot records ───────────────────────────────────────────────────
//
// Converts a flat TelemetryRecord[] into a nested structure that
// snapshotToScadaState() in Home.js can walk:
//
//   {
//     Tank: {
//       'glsr-01': { code: 'glsr-01', tags: { LevelPercent: { value: '70.05' } } },
//       ...
//     },
//     FlowMeter: {
//       'flowmeter-glsr-01': { code: 'flowmeter-glsr-01',
//                              tags: { CurrentFlowRate: { value: '9.59' } } },
//       ...
//     },
//     Valve: {
//       'valve-main-001': { code: 'valve-main-001',
//                           tags: { IsOpen: { value: 'true' } } },
//       ...
//     }
//   }
//
export function groupSnapshot(records) {
  const grouped = {};
  for (const rec of records) {
    const { asset_type, asset_code, tag_name, tag_value } = rec;
    if (!grouped[asset_type]) grouped[asset_type] = {};
    if (!grouped[asset_type][asset_code]) {
      grouped[asset_type][asset_code] = { code: asset_code, tags: {} };
    }
    grouped[asset_type][asset_code].tags[tag_name] = { value: tag_value };
  }
  return grouped;
}

// ─── Upload Excel ─────────────────────────────────────────────────────────────
//
// Sends the File object to POST /api/simulation/upload as multipart/form-data.
// The backend parses TimeSeriesData, inserts rows, updates live SCADA tables,
// and broadcasts an SSE import_complete event.
//
// The caller should also invoke handleExcelImported() (passed from Home.js)
// after this resolves so the scrubber / snapshot refresh locally without
// waiting for SSE (useful if SSE is temporarily disconnected).
//
export async function uploadExcel(file) {
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${BASE}/api/simulation/upload`, {
    method: 'POST',
    body: form,
    // Do NOT set Content-Type here — browser auto-sets multipart boundary
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`uploadExcel HTTP ${res.status}: ${body}`);
  }
  return res.json(); // { status, session, rows }
}