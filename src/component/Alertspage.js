import React, { useState, useEffect, useRef, useCallback } from 'react';

const FONT = "'Courier New', monospace";
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

const SEVERITY = { danger: 'CRITICAL', warn: 'WARNING', ok: 'OK' };
const SEVERITY_COLOR = { danger: '#f44336', warn: '#ef9f27', ok: '#4caf50' };
const SEVERITY_BG    = { danger: '#fff5f5', warn: '#fffbf0', ok: '#f0fdf4' };

// Helper to fetch dashboard
async function fetchDashboard() {
  const res = await fetch(`${API_BASE}/dashboard`);
  if (!res.ok) throw new Error('Failed to fetch dashboard');
  return res.json();
}

// Generate a unique alert ID (timestamp + random)
function genAlertId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'danger', 'warn', 'ok'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Store previous state to detect changes
  const prevStateRef = useRef({
    tanks: {},
    flowmeters: {},
    valves: {},
    conicLevel: null,
  });

  // Helper: add a new alert (avoid duplicates within 30 seconds for same condition)
  const addAlert = useCallback((type, title, message) => {
    setAlerts(prev => {
      // Prevent duplicate alerts for the same condition within 30 seconds
      const now = Date.now();
      const recent = prev.find(a => a.title === title && (now - a.timestamp) < 30000);
      if (recent) return prev;
      
      const newAlert = {
        id: genAlertId(),
        type,        // 'danger', 'warn', 'ok'
        title,
        message,
        time: new Date().toLocaleTimeString('en-GB'),
        timestamp: now,
        ack: false,
      };
      return [newAlert, ...prev]; // newest first
    });
  }, []);

  // Evaluate current dashboard and generate alerts based on thresholds
  const evaluateState = useCallback((dashboard) => {
    const tanks = dashboard.tanks || [];
    const flowmeters = dashboard.flowmeters || [];
    const valves = dashboard.valves || [];
    const conicLevel = dashboard.conicLevel ?? 75; // from dashboard or separate field

    // 1. Tank level alerts (critical <10%, warning <25%)
    tanks.forEach(tank => {
      const level = tank.level ?? 0;
      const prevLevel = prevStateRef.current.tanks[tank.id] ?? 100;
      if (level <= 10 && prevLevel > 10) {
        addAlert('danger', `${tank.id.toUpperCase()} Level Critical`, 
          `${tank.id} dropped to ${Math.round(level)}%. Immediate attention required.`);
      } else if (level <= 25 && prevLevel > 25) {
        addAlert('warn', `${tank.id.toUpperCase()} Level Low`, 
          `${tank.id} at ${Math.round(level)}%. Monitor closely.`);
      } else if (level > 80 && prevLevel <= 80) {
        addAlert('ok', `${tank.id.toUpperCase()} Level Normal`, 
          `${tank.id} recovered to ${Math.round(level)}%.`);
      }
    });

    // 2. Sump / Conic level
    if (conicLevel <= 0 && (prevStateRef.current.conicLevel ?? 100) > 0) {
      addAlert('danger', 'SUMP Empty', 'Conic source tank is empty. Flow stopped.');
    } else if (conicLevel <= 25 && (prevStateRef.current.conicLevel ?? 100) > 25) {
      addAlert('warn', 'SUMP Low', `Conic source at ${Math.round(conicLevel)}%. Schedule refill.`);
    } else if (conicLevel > 25 && (prevStateRef.current.conicLevel ?? 0) <= 25) {
      addAlert('ok', 'SUMP Level Restored', `Conic source recovered to ${Math.round(conicLevel)}%.`);
    }

    // 3. Valve state changes (open → closed or vice versa)
    valves.forEach(valve => {
      const isOpen = valve.isOpen;
      const prevOpen = prevStateRef.current.valves[valve.id];
      if (prevOpen !== undefined && isOpen !== prevOpen) {
        const action = isOpen ? 'Opened' : 'Closed';
        addAlert(isOpen ? 'ok' : 'warn', `Valve ${valve.id} ${action}`, 
          `Valve ${valve.id} was ${action}${isOpen ? '' : '. Downstream flow may be affected.'}`);
      }
    });

    // 4. Flowmeter anomalies: main flow >0 but master valve closed
    const masterValve = valves.find(v => v.id === 'valve-main-001');
    const mainFlow = flowmeters.find(f => f.id === 'flowmeter-001')?.flow || 0;
    if (mainFlow > 0 && masterValve && !masterValve.isOpen) {
      addAlert('danger', 'Flow without Master Valve', 
        `Main inlet flow ${mainFlow.toFixed(1)} m³/h but V-MAIN is CLOSED. Water cannot reach tanks.`);
    }

    // 5. Outlet flow active but tank empty (prevented by simulation, but alert anyway)
    flowmeters.forEach(fm => {
      if (fm.id === 'flowmeter-001') return;
      const flow = fm.flow || 0;
      const tankId = fm.id.replace('flowmeter-', ''); // e.g., glsr-01, oht-01
      const tank = tanks.find(t => t.id === tankId);
      if (flow > 0 && tank && tank.level <= 0) {
        addAlert('danger', `Flow from empty ${tankId.toUpperCase()}`, 
          `Outlet flow ${flow.toFixed(1)} m³/h but tank is empty. Check valve or pump.`);
      }
    });

    // 6. All systems nominal (when no active alerts, optional)
    const hasCritical = alerts.some(a => !a.ack && a.type === 'danger');
    if (!hasCritical && (prevStateRef.current.hasCritical !== false)) {
      addAlert('ok', 'All Systems Nominal', 'No critical alerts. System is stable.');
    }

    // Update previous state for next comparison
    const newTanks = {};
    tanks.forEach(t => { newTanks[t.id] = t.level; });
    const newFlowmeters = {};
    flowmeters.forEach(f => { newFlowmeters[f.id] = f.flow; });
    const newValves = {};
    valves.forEach(v => { newValves[v.id] = v.isOpen; });
    
    prevStateRef.current = {
      tanks: newTanks,
      flowmeters: newFlowmeters,
      valves: newValves,
      conicLevel,
      hasCritical,
    };
  }, [addAlert, alerts]);

  // Poll dashboard periodically
  useEffect(() => {
    let interval;
    const loadData = async () => {
      try {
        setLoading(true);
        const dash = await fetchDashboard();
        evaluateState(dash);
        setError(null);
      } catch (err) {
        console.error('Alerts polling error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadData();
    interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [evaluateState]);

  // Acknowledge an alert
  const acknowledgeAlert = (id) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, ack: true } : a));
  };

  // Filter alerts
  const filteredAlerts = filter === 'all' 
    ? alerts 
    : alerts.filter(a => a.type === filter);

  // Counts
  const criticalCount = alerts.filter(a => a.type === 'danger' && !a.ack).length;
  const warningCount  = alerts.filter(a => a.type === 'warn' && !a.ack).length;
  const unackedCount  = alerts.filter(a => !a.ack).length;

  if (loading && alerts.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: FONT }}>
        <div style={{ width: 44, height: 44, border: '4px solid #e2e8f0', borderTop: '4px solid #38b2f8', borderRadius: '50%', animation: 'spin 0.9s linear infinite', margin: '0 auto 16px' }} />
        <div style={{ fontSize: 11, color: '#64748b' }}>Loading alerts…</div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px 40px 60px', background: '#f1f5f9', fontFamily: FONT }}>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .alert-item { animation: slideUp 0.45s ease both; }
      `}</style>

      {/* Header */}
      <div className="alert-item" style={{ marginBottom: 28, animationDelay: '0s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 9, color: '#64748b', letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 8 }}>
          <span style={{ width: 18, height: 1, background: '#38b2f8', display: 'inline-block' }} />
          Notification Center
        </div>
        <div style={{ fontSize: 30, fontWeight: 700, color: '#1e293b', lineHeight: 1.2 }}>Alert / Notification</div>
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
          {unackedCount} unacknowledged · {alerts.length} total events
        </div>
      </div>

      {/* Summary pills */}
      <div className="alert-item" style={{ display: 'flex', gap: 12, marginBottom: 24, animationDelay: '0.1s', flexWrap: 'wrap' }}>
        {[
          { label:'Critical', count: criticalCount, color: '#f44336', bg: '#fff5f5' },
          { label:'Warnings', count: warningCount,  color: '#ef9f27', bg: '#fffbf0' },
          { label:'Unacked',  count: unackedCount,  color: '#38b2f8', bg: '#eff6ff' },
        ].map(s => (
          <div key={s.label} style={{ padding: '10px 18px', borderRadius: 9, background: s.bg, border: `1px solid ${s.color}44`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.count}</span>
            <span style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '.07em' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="alert-item" style={{ display: 'flex', gap: 8, marginBottom: 22, animationDelay: '0.15s', flexWrap: 'wrap', alignItems: 'center' }}>
        {[
          { k: 'all',    label: 'All',      col: '#38b2f8' },
          { k: 'danger', label: 'Critical', col: '#f44336' },
          { k: 'warn',   label: 'Warning',  col: '#ef9f27' },
          { k: 'ok',     label: 'OK',       col: '#4caf50' },
        ].map(b => (
          <button key={b.k} onClick={() => setFilter(b.k)} style={{
            padding: '6px 18px', borderRadius: 20, cursor: 'pointer',
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', fontFamily: FONT,
            background: filter === b.k ? b.col : '#ffffff',
            color:      filter === b.k ? '#fff' : '#64748b',
            border:     `1px solid ${filter === b.k ? b.col : '#cbd5e1'}`,
            transition: 'all 0.2s',
          }}>{b.label}</button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 10, color: '#64748b' }}>Showing {filteredAlerts.length} events</span>
      </div>

      {/* Alert list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredAlerts.map((a, i) => (
          <div key={a.id} className="alert-item" style={{ animationDelay: `${0.2 + i * 0.04}s` }}>
            <div style={{
              background: a.ack ? '#f8fafc' : '#ffffff',
              borderRadius: 10, padding: '16px 20px',
              border: `1px solid ${a.ack ? '#f1f5f9' : SEVERITY_COLOR[a.type]+'33'}`,
              display: 'flex', alignItems: 'flex-start', gap: 16,
              opacity: a.ack ? 0.65 : 1,
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={e => { if(!a.ack){ e.currentTarget.style.transform='translateX(3px)'; e.currentTarget.style.boxShadow=`0 4px 18px ${SEVERITY_COLOR[a.type]}18`; } }}
            onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='none'; }}>
              <div style={{ width:10, height:10, borderRadius:'50%', flexShrink:0, marginTop:5, background:SEVERITY_COLOR[a.type], boxShadow: a.ack?'none':`0 0 8px ${SEVERITY_COLOR[a.type]}88` }}/>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6, flexWrap:'wrap', gap:6 }}>
                  <div style={{ fontSize:13, fontWeight:700, color: a.ack?'#64748b':'#1e293b' }}>{a.title}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                    <span style={{ fontSize:8, padding:'2px 8px', borderRadius:12, fontWeight:700, background:SEVERITY_BG[a.type], color:SEVERITY_COLOR[a.type], border:`1px solid ${SEVERITY_COLOR[a.type]}44`, textTransform:'uppercase', letterSpacing:'.06em' }}>{SEVERITY[a.type]}</span>
                    <span style={{ fontSize:9, color:'#64748b' }}>{a.time}</span>
                    {a.ack && <span style={{ fontSize:8, color:'#4caf50', fontWeight:700 }}>✓ ACK</span>}
                    {!a.ack && (
                      <button onClick={() => acknowledgeAlert(a.id)} style={{
                        fontSize:8, padding:'2px 8px', borderRadius:12, cursor:'pointer',
                        background:'#e2e8f0', border:'none', color:'#475569', fontFamily:FONT,
                      }}>Acknowledge</button>
                    )}
                  </div>
                </div>
                <div style={{ fontSize:11, color:'#475569', lineHeight:1.6 }}>{a.message}</div>
              </div>
            </div>
          </div>
        ))}
        {filteredAlerts.length === 0 && (
          <div style={{ textAlign:'center', padding:'48px', color:'#64748b', fontSize:11 }}>
            No alerts match the current filter.
          </div>
        )}
      </div>
    </div>
  );
}