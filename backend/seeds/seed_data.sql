-- seed_data.sql
-- Ensure AssetTypes exist (as per schema)
INSERT INTO AssetTypes (TypeName, Description) VALUES
    ('Tank',      'Storage vessels — GLSR (Ground Level) and OH (Overhead) variants'),
    ('Sensor',    'Level transmitters, pressure, temperature, flow and pH instruments'),
    ('FlowMeter', 'Inline volumetric / mass flow instruments on distribution pipework'),
    ('Valve',     'Hand valves, solenoid valves, gate and ball valves'),
    ('Pump',      'Centrifugal / submersible pumps driving the pipeline network')
ON CONFLICT (TypeName) DO NOTHING;

-- Tanks (exact codes used in frontend)
INSERT INTO Tanks (TypeID, TankCode, TankName, TankVariant, LocationZone, CapacityLitres, LevelPercent, IsOnline)
SELECT t.TypeID, codes.TankCode, codes.TankName, codes.TankVariant, codes.LocationZone, codes.CapacityLitres, codes.LevelPercent, TRUE
FROM AssetTypes t
CROSS JOIN (
    VALUES
        ('GLSR-01', 'Gangamma GLSR',      'GLSR',   'Zone-09', 5000000, 70),
        ('GLSR-02', 'Meher Nagara GLSR',  'GLSR',   'Zone-06', 5000000, 60),
        ('GLSR-03', 'Guttahalli GLSR',    'GLSR',   'Zone-01', 5000000, 80),
        ('OHT-01',  'Kumar Swamy OHT',    'OHTank', 'Zone-04', 2000000, 50),
        ('OHT-02',  'Nearby GLSR OHT',    'OHTank', 'Zone-07', 2000000, 40),
        ('OHT-03',  'Stadium Rd OHT',     'OHTank', 'Zone-02', 2000000, 30),
        ('CONIC-SUMP', 'Conic Sump',      'GLSR',   'Source',  10000000, 75)
) AS codes(TankCode, TankName, TankVariant, LocationZone, CapacityLitres, LevelPercent)
WHERE t.TypeName = 'Tank'
ON CONFLICT (TankCode) DO UPDATE SET
    LevelPercent = EXCLUDED.LevelPercent,
    UpdatedAt = NOW();

-- Flow Meters
INSERT INTO FlowMeters (TypeID, MeterCode, MeterName, MeterType, CurrentFlowRate, IsActive)
SELECT t.TypeID, codes.MeterCode, codes.MeterName, 'Electromagnetic', codes.CurrentFlowRate, TRUE
FROM AssetTypes t
CROSS JOIN (
    VALUES
        ('FLOWMETER-001',     'Main Inlet Flowmeter',       0),
        ('FLOWMETER-GLSR-01', 'GLSR-01 Outlet Flowmeter',   0),
        ('FLOWMETER-GLSR-02', 'GLSR-02 Outlet Flowmeter',   0),
        ('FLOWMETER-GLSR-03', 'GLSR-03 Outlet Flowmeter',   0),
        ('FLOWMETER-OHT-01',  'OHT-01 Outlet Flowmeter',    0),
        ('FLOWMETER-OHT-02',  'OHT-02 Outlet Flowmeter',    0),
        ('FLOWMETER-OHT-03',  'OHT-03 Outlet Flowmeter',    0)
) AS codes(MeterCode, MeterName, CurrentFlowRate)
WHERE t.TypeName = 'FlowMeter'
ON CONFLICT (MeterCode) DO UPDATE SET
    CurrentFlowRate = EXCLUDED.CurrentFlowRate,
    UpdatedAt = NOW();

-- Valves
INSERT INTO Valves (TypeID, ValveCode, ValveName, ValveType, IsOpen, IsActive)
SELECT t.TypeID, codes.ValveCode, codes.ValveName, 'HandValve', codes.IsOpen, TRUE
FROM AssetTypes t
CROSS JOIN (
    VALUES
        ('VALVE-MAIN-001', 'Main Inlet Valve',    TRUE),
        ('VALVE-OHT-01',   'OHT-01 Inlet Valve',  TRUE),
        ('VALVE-GLSR-01',  'GLSR-01 Inlet Valve', TRUE),
        ('VALVE-OHT-02',   'OHT-02 Inlet Valve',  TRUE),
        ('VALVE-GLSR-02',  'GLSR-02 Inlet Valve', TRUE),
        ('VALVE-OHT-03',   'OHT-03 Inlet Valve',  TRUE),
        ('VALVE-GLSR-03',  'GLSR-03 Inlet Valve', TRUE)
) AS codes(ValveCode, ValveName, IsOpen)
WHERE t.TypeName = 'Valve'
ON CONFLICT (ValveCode) DO UPDATE SET
    IsOpen = EXCLUDED.IsOpen,
    UpdatedAt = NOW();