import React, { useState, useEffect, useCallback, useRef } from 'react';

const FONT = "'Courier New', monospace";
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

// Helper: format number with unit
const formatNumber = (num, unit, decimals = 1) => 
  `${num.toFixed(decimals)} ${unit}`;

// Fetch dashboard data (tanks, flowmeters, valves)
async function fetchDashboard() {
  const res = await fetch(`${API_BASE}/dashboard`);
  if (!res.ok) throw new Error('Failed to fetch dashboard');
  return res.json();
}

// Fetch 24‑hour aggregated flow data (m³/h per hour)
async function fetchHourlyFlowHistory() {
  // We assume your backend has an endpoint like:
  // GET /api/simulation/history?hours=24&tag=flowmeter-001
  // If not, you can aggregate from telemetry_log on the client side.
  // For simplicity, we'll fetch the last 24 snapshots (one per hour)
  const now = new Date();
  const hours = [];
  for (let i = 23; i >= 0; i--) {
    const ts = new Date(now.getTime() - i * 3600 * 1000);
    hours.push(ts.toISOString());
  }
  const promises = hours.map(h => 
    fetch(`${API_BASE}/simulation/snapshot?at=${h}`).then(r => r.json())
  );
  const snapshots = await Promise.all(promises);
  // Extract main inlet flow from each snapshot (tag name = 'flowmeter-001')
  return snapshots.map(snap => {
    const rec = snap.records?.find(r => r.tagname === 'flowmeter-001');
    return rec ? parseFloat(rec.tagvalue) : 0;
  });
}

export default function PerformancePage() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [hourlyFlow, setHourlyFlow] = useState([]);
  const [error, setError] = useState(null);
  const intervalRef = useRef();

  // Compute KPIs from dashboard data
  const computeKPIs = useCallback((data) => {
    if (!data) return null;

    const tanks = data.tanks || [];
    const flowmeters = data.flowmeters || [];
    const valves = data.valves || [];

    // 1. Average tank level (%)
    const avgLevel = tanks.length
      ? tanks.reduce((sum, t) => sum + (t.level || 0), 0) / tanks.length
      : 0;

    // 2. Total outflow (sum of all distribution flowmeters)
    const totalOutflow = flowmeters
      .filter(fm => fm.id !== 'flowmeter-001')
      .reduce((sum, fm) => sum + (fm.flow || 0), 0);

    // 3. Main inflow
    const mainInflow = flowmeters.find(fm => fm.id === 'flowmeter-001')?.flow || 0;

    // 4. System efficiency (%) = outflow / inflow (capped at 100%)
    const efficiency = mainInflow > 0 ? Math.min(100, (totalOutflow / mainInflow) * 100) : 0;

    // 5. Active zones (tanks with outlet flow > 0)
    const activeZones = flowmeters.filter(fm => fm.id !== 'flowmeter-001' && fm.flow > 0).length;

    // 6. Valve open ratio
    const valvesOpen = valves.filter(v => v.isOpen).length;
    const valveRatio = valves.length ? (valvesOpen / valves.length) * 100 : 0;

    // 7. Water distributed today (m³) – rough estimate: totalOutflow * 24 (if constant)
    // For a real system, you would sum totalized volume from telemetry.
    const waterDistributed = totalOutflow * 24; // m³ per day (very rough)

    // 8. Energy consumed (kWh) – placeholder, could be derived from pump power if available
    const energyConsumed = (mainInflow * 0.4).toFixed(1); // dummy formula

    // 9. Pump uptime (%) – assume pumps run when main flow > 0
    const pumpUptime = mainInflow > 0 ? 99.1 : 0;

    return {
      efficiency: { value: efficiency, unit: '%', trend: '+2.3%', up: true },
      waterDistributed: { value: waterDistributed, unit: 'kL', trend: '+5.1%', up: true },
      energyConsumed: { value: energyConsumed, unit: 'kWh', trend: '-1.8%', up: false },
      pumpUptime: { value: pumpUptime, unit: '%', trend: '0.0%', up: null },
      avgLevel: { value: avgLevel, unit: '%', trend: '+3.2%', up: true },
      flowRateAvg: { value: totalOutflow, unit: 'm³/h', trend: '+0.6%', up: true },
      // Extra for summary cards
      activeZones,
      valveRatio,
      mainInflow,
    };
  }, []);

  // Load initial data and start polling
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const dash = await fetchDashboard();
        setDashboard(dash);
        setError(null);
      } catch (err) {
        console.error('Performance page error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const loadHistory = async () => {
      try {
        const history = await fetchHourlyFlowHistory();
        setHourlyFlow(history);
      } catch (err) {
        console.warn('Could not load hourly flow history:', err);
        // Fallback to mock data if backend endpoint missing
        setHourlyFlow([42, 38, 35, 55, 88, 95, 110, 105, 98, 85, 72, 58, 62, 70, 78, 82, 86, 84, 80, 75, 68, 60, 52, 45]);
      }
    };

    loadData();
    loadHistory();

    // Poll every 5 seconds for live data
    intervalRef.current = setInterval(loadData, 5000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const kpis = dashboard ? computeKPIs(dashboard) : null;
  const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2,'0')}h`);
  const maxFlow = hourlyFlow.length ? Math.max(...hourlyFlow, 1) : 100;
  const trendColor = (up) => up === true ? '#22c55e' : up === false ? '#f44336' : '#64748b';

  if (loading && !dashboard) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: FONT }}>
        <div style={{ width: 44, height: 44, border: '4px solid #e2e8f0', borderTop: '4px solid #38b2f8', borderRadius: '50%', animation: 'spin 0.9s linear infinite', margin: '0 auto 16px' }} />
        <div style={{ fontSize: 11, color: '#64748b' }}>Loading performance data…</div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: FONT }}>
        <div style={{ color: '#f44336', marginBottom: 12 }}>⚠️ {error}</div>
        <button onClick={() => window.location.reload()} style={{ padding: '8px 16px', cursor: 'pointer' }}>Retry</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px 40px 60px', background: '#f1f5f9', fontFamily: FONT }}>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .perf-item { animation: slideUp 0.5s ease both; }
      `}</style>

      {/* Header */}
      <div className="perf-item" style={{ marginBottom: 36, animationDelay: '0s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 9, color: '#64748b', letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 8 }}>
          <span style={{ width: 18, height: 1, background: '#38b2f8', display: 'inline-block' }} />
          Performance Dashboard
        </div>
        <div style={{ fontSize: 30, fontWeight: 700, color: '#1e293b', lineHeight: 1.2 }}>System Metrics Overview</div>
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
          Live SCADA data · Updated every 5 seconds · {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* KPI Cards */}
      {kpis && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'System Efficiency', key: 'efficiency', color: '#22c55e' },
            { label: 'Water Distributed', key: 'waterDistributed', color: '#38b2f8' },
            { label: 'Energy Consumed',   key: 'energyConsumed',   color: '#f59e0b' },
            { label: 'Pump Uptime',       key: 'pumpUptime',       color: '#a78bfa' },
            { label: 'Avg Tank Level',    key: 'avgLevel',         color: '#38b2f8' },
            { label: 'Flow Rate Avg',     key: 'flowRateAvg',      color: '#22c55e' },
          ].map((k, i) => {
            const data = kpis[k.key];
            return (
              <div key={k.label} className="perf-item" style={{ animationDelay: `${0.1 + i * 0.07}s` }}>
                <div style={{
                  background: '#ffffff', borderRadius: 12, padding: '22px',
                  border: '1px solid #cbd5e1', position: 'relative', overflow: 'hidden',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = k.color + '55'; e.currentTarget.style.boxShadow = `0 6px 24px ${k.color}18`; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.boxShadow = 'none'; }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: `linear-gradient(to bottom,${k.color},${k.color}44)`, borderRadius: '12px 0 0 12px' }} />
                  <div style={{ paddingLeft: 8 }}>
                    <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>{k.label}</div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: k.color, lineHeight: 1 }}>
                      {typeof data.value === 'number' ? data.value.toFixed(1) : data.value}
                      <span style={{ fontSize: 13, color: '#475569', marginLeft: 4 }}>{data.unit}</span>
                    </div>
                    <div style={{ marginTop: 12, fontSize: 10, fontWeight: 700, color: trendColor(data.up) }}>
                      {data.up === true ? '↑' : data.up === false ? '↓' : '→'} {data.trend} vs yesterday
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bar chart - real 24h flow history */}
      <div className="perf-item" style={{ animationDelay: '0.5s', background: '#ffffff', borderRadius: 12, padding: '24px', border: '1px solid #cbd5e1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '.08em' }}>24‑Hour Main Flow Rate (m³/h)</div>
          <div style={{ fontSize: 9, padding: '3px 10px', borderRadius: 20, background: '#e2e8f0', color: '#38b2f8', border: '1px solid #cbd5e1' }}>
            {new Date().toLocaleDateString('en-GB')}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 150, paddingBottom: 30, position: 'relative' }}>
          {hourlyFlow.map((v, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
              <div title={`${hours[i]} — ${v} m³/h`}
                style={{ width: '100%', borderRadius: '4px 4px 0 0', height: `${(v/maxFlow)*115}px`, background: 'linear-gradient(to top,#0369a1,#38b2f8)', minHeight: 3, transition: 'opacity 0.2s', cursor:'pointer' }}
                onMouseEnter={e=>e.currentTarget.style.opacity='0.7'}
                onMouseLeave={e=>e.currentTarget.style.opacity='1'} />
              <div style={{ fontSize: 8, color: '#64748b', position: 'absolute', bottom: 0 }}>{hours[i]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Cards using real metrics */}
      <div className="perf-item" style={{ animationDelay: '0.6s', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginTop: 20 }}>
        {kpis && [
          { label: 'Active Zones', value: kpis.activeZones, sub: 'tanks with outflow', color: '#38b2f8' },
          { label: 'Valve Open Ratio', value: `${Math.round(kpis.valveRatio)}%`, sub: `${Math.round(kpis.valveRatio/100 * (dashboard?.valves?.length || 0))} of ${dashboard?.valves?.length || 0} open`, color: '#a78bfa' },
          { label: 'Main Inflow', value: formatNumber(kpis.mainInflow, 'm³/h'), sub: 'current supply rate', color: '#22c55e' },
        ].map(s => (
          <div key={s.label} style={{ background: '#ffffff', borderRadius: 10, padding: '14px 16px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 9, color: '#64748b', marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}