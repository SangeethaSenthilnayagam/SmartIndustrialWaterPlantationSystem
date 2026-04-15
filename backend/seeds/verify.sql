-- verify.sql
-- Run this after seed_data.sql to confirm the data will work with the frontend.
-- Every query below should return rows. If any returns 0 rows, that asset
-- will show its hardcoded default instead of live DB data.

-- ── 1. Tank keys that Home.js uses ──────────────────────────────────────────
-- Expected: 7 rows (glsr-01, glsr-02, glsr-03, oht-01, oht-02, oht-03, conic-sump)
SELECT tankcode AS "UI Key", levelpercent AS "Level %", isonline AS "Online"
FROM tanks
WHERE tankcode IN ('glsr-01','glsr-02','glsr-03','oht-01','oht-02','oht-03','conic-sump')
ORDER BY tankcode;

-- ── 2. Flow meter keys that Home.js uses ────────────────────────────────────
-- Expected: 7 rows
SELECT metercode AS "UI Key", currentflowrate AS "Flow Rate", isactive AS "Active"
FROM flowmeters
WHERE metercode IN (
  'flowmeter-001',
  'flowmeter-glsr-01','flowmeter-glsr-02','flowmeter-glsr-03',
  'flowmeter-oht-01', 'flowmeter-oht-02', 'flowmeter-oht-03'
)
ORDER BY metercode;

-- ── 3. Valve keys that Home.js uses ─────────────────────────────────────────
-- Expected: 7 rows
SELECT valvecode AS "UI Key", isopen AS "Is Open", isactive AS "Active"
FROM valves
WHERE valvecode IN (
  'valve-main-001',
  'valve-glsr-01','valve-glsr-02','valve-glsr-03',
  'valve-oht-01', 'valve-oht-02', 'valve-oht-03'
)
ORDER BY valvecode;

-- ── 4. Simulate what GET /api/tanks returns ──────────────────────────────────
-- This is EXACTLY what the Go handler sends to React
SELECT LOWER(tankcode) AS "id (React key)", COALESCE(levelpercent,0) AS "level"
FROM tanks ORDER BY tankcode;

-- ── 5. Simulate what GET /api/valves returns ─────────────────────────────────
SELECT LOWER(valvecode) AS "id (React key)", isopen AS "isOpen"
FROM valves WHERE isactive = true ORDER BY valvecode;