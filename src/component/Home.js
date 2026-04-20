import React, { useState, useEffect, useCallback, useRef } from 'react';
import JsonDisplay     from './jsonDisplay';
import PerformancePage from './Performancepage';
import AlertsPage      from './Alertspage';
import MaintenancePage from './Maintenancepage';
import LoginPage       from './LoginPage';
import ControlPanelPage, {
  INITIAL_LEVELS,
  INITIAL_FLOWS,
  INITIAL_VALVE_STATES,
  CONIC_INITIAL_LEVEL,
} from './ControlPanel';

import {
  fetchDashboard,
  updateTankLevel,
  updateFlowRate,
  toggleValve,
} from '../services/api';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const POLL_INTERVAL_MS = 5_000;
const FONT = "'Courier New', monospace";

// ── Simulation constants ─────────────────────────────────────────────────────
// Maps each tank to the flowmeter that measures water leaving it (outlet).
const TANK_TO_OUTLET_FM = {
  'oht-01':  'flowmeter-oht-01',
  'oht-02':  'flowmeter-oht-02',
  'oht-03':  'flowmeter-oht-03',
  'glsr-01': 'flowmeter-glsr-01',
  'glsr-02': 'flowmeter-glsr-02',
  'glsr-03': 'flowmeter-glsr-03',
};

// Maps each tank to the valve that controls inlet flow into it.
const TANK_TO_INLET_VALVE = {
  'oht-01':  'valve-oht-01',
  'oht-02':  'valve-oht-02',
  'oht-03':  'valve-oht-03',
  'glsr-01': 'valve-glsr-01',
  'glsr-02': 'valve-glsr-02',
  'glsr-03': 'valve-glsr-03',
};

// How many % a tank fills per (m³/h of main flow) per second,
// shared equally among all active (non-full, valve-open) tanks.
const FILL_COEFF  = 0.05;  // ~2 min to fill from 0 at 100 m³/h with 6 tanks
// How many % a tank drains per (m³/h of outlet flow) per second.
const DRAIN_COEFF = 0.03;
// How many % the sump drains per (m³/h of main flow) per second.
const SUMP_DRAIN_COEFF = 0.01;

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL CSS
// ─────────────────────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  *, *::before, *::after { box-sizing: border-box; }
  html {
    margin: 0; padding: 0;
    scroll-behavior: smooth;
    overflow-y: auto;
    overflow-x: hidden;
  }
  body {
    margin: 0; padding: 0;
    background: #f8fafc;
    overflow-x: hidden;
    overflow-y: auto;
    min-height: 100vh;
  }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track  { background: #f1f5f9; }
  ::-webkit-scrollbar-thumb  { background: #cbd5e1; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
  @keyframes floatOrb {
    0%,100% { transform: translateY(0) scale(1); }
    50%      { transform: translateY(-18px) scale(1.04); }
  }
  @keyframes scanLine {
    0%        { top: 0%;   opacity: 0; }
    10%, 90%  { opacity: 0.35; }
    100%      { top: 100%; opacity: 0; }
  }
  @keyframes pulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(56,178,248,0.35); }
    50%      { box-shadow: 0 0 0 14px rgba(56,178,248,0); }
  }
  @keyframes glow {
    0%,100% { box-shadow: 0 0 18px #0ea5e944; }
    50%      { box-shadow: 0 0 32px #0ea5e977; }
  }
  @keyframes scadaSpinner {
    0%   { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .hero-drop  { animation: fadeUp 0.7s ease both; animation-delay: 0.1s; }
  .hero-badge { animation: fadeUp 0.7s ease both; animation-delay: 0.2s; }
  .hero-btn   { animation: fadeUp 0.7s ease both; animation-delay: 0.3s; }
  .hero-sub   { animation: fadeIn 0.9s ease both; animation-delay: 0.45s; }
  .hero-stats { animation: fadeUp 0.7s ease both; animation-delay: 0.55s; }

  .launch-btn:hover   { transform: translateY(-3px) !important; box-shadow: 0 10px 36px #0ea5e977 !important; }
  .feature-card:hover { transform: translateY(-4px) !important; }
  .why-card:hover     { transform: translateY(-3px) !important; border-color: #38b2f833 !important; }
`;

function injectGlobalCSS() {
  if (document.getElementById('aquatwin-global')) return;
  const el = document.createElement('style');
  el.id = 'aquatwin-global';
  el.textContent = GLOBAL_CSS;
  document.head.appendChild(el);
}

// ─────────────────────────────────────────────────────────────────────────────
// ICONS
// ─────────────────────────────────────────────────────────────────────────────
const Icon = {
  DigitalTwin: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38b2f8" strokeWidth="2.2">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
      <path d="M2 17l10 5 10-5"/>
      <path d="M2 12l10 5 10-5"/>
    </svg>
  ),
  Alert: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38b2f8" strokeWidth="2.2">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  Performance: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38b2f8" strokeWidth="2.2">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  Maintenance: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38b2f8" strokeWidth="2.2">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  ),
  Controls: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38b2f8" strokeWidth="2.2">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
      <line x1="12" y1="2" x2="12" y2="5"/>
      <line x1="12" y1="19" x2="12" y2="22"/>
      <line x1="2" y1="12" x2="5" y2="12"/>
      <line x1="19" y1="12" x2="22" y2="12"/>
    </svg>
  ),
  Shield: () => (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  Drop: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="#38b2f8" stroke="#0ea5e9" strokeWidth="1">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
    </svg>
  ),
  ArrowRight: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M5 12h14M12 5l7 7-7 7"/>
    </svg>
  ),
};

const TABS = [
  { id: 'digital-twin', label: 'Digital Twin',        I: Icon.DigitalTwin },
  { id: 'controls',     label: 'Controls',             I: Icon.Controls    },
  { id: 'alerts',       label: 'Alert / Notification', I: Icon.Alert       },
  { id: 'performance',  label: 'Performance',          I: Icon.Performance },
  { id: 'maintenance',  label: 'Maintenance',          I: Icon.Maintenance },
];

// ─────────────────────────────────────────────────────────────────────────────
// LOADING SCREEN  (shown until the first DB fetch resolves)
// ─────────────────────────────────────────────────────────────────────────────
function ScadaLoadingScreen() {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#f8fafc', gap: 18,
    }}>
      <div style={{
        width: 44, height: 44,
        border: '4px solid #e2e8f0',
        borderTop: '4px solid #38b2f8',
        borderRadius: '50%',
        animation: 'scadaSpinner 0.9s linear infinite',
      }} />
      <div style={{ fontFamily: FONT, fontSize: 11, color: '#64748b', letterSpacing: '.08em' }}>
        CONNECTING TO SCADA…
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SITE HEADER
// ─────────────────────────────────────────────────────────────────────────────
function SiteHeader({ activeTab, onNav, scrolled }) {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 200,
      background: scrolled ? 'rgba(248,250,252,0.97)' : '#f8fafc',
      backdropFilter: scrolled ? 'blur(16px)' : 'none',
      borderBottom: '1px solid #cbd5e1',
      transition: 'background 0.3s, box-shadow 0.3s',
      boxShadow: scrolled ? '0 4px 24px rgba(0,0,0,0.4)' : 'none',
      fontFamily: FONT,
    }}>
      <div style={{ padding: '16px 40px', display: 'flex', alignItems: 'center' }}>
        <button onClick={() => onNav('home')} style={{ display:'flex', alignItems:'center', gap:12, background:'none', border:'none', cursor:'pointer', padding:0 }}>
          <div style={{ width:42, height:42, borderRadius:9, background:'linear-gradient(135deg,#0ea5e9,#0369a1)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 20px #0ea5e933' }}>
            <Icon.Shield />
          </div>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:'#38b2f8', letterSpacing:'.08em', lineHeight:1 }}>AQUA TWIN</div>
            <div style={{ fontSize:8, color:'#64748b', letterSpacing:'.12em', marginTop:2 }}>WATER MANAGEMENT SYSTEM</div>
          </div>
        </button>
        <button onClick={() => onNav('login')} style={{
          marginLeft:'auto', padding:'7px 18px', borderRadius:6, cursor:'pointer',
          fontSize:10, fontWeight:700, letterSpacing:'.06em',
          background:'transparent', color:'#475569', border:'1px solid #cbd5e1', fontFamily:FONT, transition:'all 0.2s',
        }}
        onMouseEnter={e=>{ e.currentTarget.style.borderColor='#38b2f8'; e.currentTarget.style.color='#38b2f8'; }}
        onMouseLeave={e=>{ e.currentTarget.style.borderColor='#cbd5e1'; e.currentTarget.style.color='#475569'; }}>
          Login / Register
        </button>
      </div>
      <div style={{ borderTop:'1px solid #cbd5e1', padding:'0 40px', display:'flex', gap:0 }}>
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => onNav(tab.id)} style={{
              height:44, padding:'0 22px', cursor:'pointer',
              display:'flex', alignItems:'center', gap:7,
              fontSize:11, fontWeight: active ? 700 : 500,
              fontFamily:FONT, letterSpacing:'.05em',
              background:'transparent', border:'none',
              color:        active ? '#38b2f8' : '#475569',
              borderBottom: active ? '2px solid #38b2f8' : '2px solid transparent',
              whiteSpace:'nowrap', transition:'all 0.2s',
            }}
            onMouseEnter={e=>{ if(!active){ e.currentTarget.style.color='#1e293b'; e.currentTarget.style.borderBottom='2px solid #38b2f844'; }}}
            onMouseLeave={e=>{ if(!active){ e.currentTarget.style.color='#475569'; e.currentTarget.style.borderBottom='2px solid transparent'; }}}>
              <tab.I /> {tab.label}
            </button>
          );
        })}
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SITE FOOTER
// ─────────────────────────────────────────────────────────────────────────────
function SiteFooter() {
  return (
    <footer style={{ background:'#f1f5f9', borderTop:'1px solid #cbd5e1', padding:'20px 40px', display:'flex', justifyContent:'space-between', alignItems:'center', fontFamily:FONT }}>
      <div style={{ fontSize:10, color:'#64748b' }}>© 2026 AquaTwin — Water Management Digital Twin Platform</div>
      <div style={{ display:'flex', gap:20 }}>
        {['Privacy Policy','Terms','Documentation','API'].map(l=>(
          <span key={l} style={{ fontSize:10, color:'#64748b', cursor:'pointer', transition:'color 0.2s' }}
            onMouseEnter={e=>e.currentTarget.style.color='#475569'}
            onMouseLeave={e=>e.currentTarget.style.color='#64748b'}>{l}</span>
        ))}
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE STRIP
// ─────────────────────────────────────────────────────────────────────────────
const FEAT_STYLE = `
  @keyframes featUp {
    from { opacity:0; transform:translateY(28px); }
    to   { opacity:1; transform:translateY(0); }
  }
  .feat-card { animation: featUp 0.5s ease both; }
`;

function FeatureStrip({ onNav }) {
  const items = [
    { tab:'digital-twin', I:Icon.DigitalTwin,  label:'Digital Twin',        desc:'Live SCADA with real-time tank levels & pipe flow animations', accent:'#38b2f8' },
    { tab:'controls',     I:Icon.Controls,     label:'Controls',             desc:'Valve control, flow rates, tank levels & system reset',        accent:'#a78bfa' },
    { tab:'alerts',       I:Icon.Alert,        label:'Alert / Notification', desc:'Real-time event log, critical warnings & system notifications', accent:'#ef9f27' },
    { tab:'performance',  I:Icon.Performance,  label:'Performance',          desc:'KPI dashboards, hourly flow charts & efficiency metrics',       accent:'#a78bfa' },
    { tab:'maintenance',  I:Icon.Maintenance,  label:'Maintenance',          desc:'Asset lifecycle, scheduled & corrective maintenance tracker',   accent:'#22c55e' },
  ];
  return (
    <section style={{ background:'#f1f5f9', borderTop:'1px solid #cbd5e1', borderBottom:'1px solid #cbd5e1', padding:'36px 40px' }}>
      <style>{FEAT_STYLE}</style>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:16 }}>
        {items.map((f, i) => (
          <button key={f.tab} className="feat-card feature-card"
            onClick={() => onNav(f.tab)}
            style={{
              animationDelay: `${i * 0.08}s`,
              background:'#ffffff', borderRadius:12, padding:'22px 18px',
              border:'1px solid #cbd5e1', cursor:'pointer', textAlign:'left',
              color:'#1e293b', transition:'all 0.25s',
              display:'flex', flexDirection:'column', gap:12, width:'100%',
            }}
            onMouseEnter={e=>{ e.currentTarget.style.borderColor=f.accent+'55'; e.currentTarget.style.background='#f1f5f9'; }}
            onMouseLeave={e=>{ e.currentTarget.style.borderColor='#cbd5e1'; e.currentTarget.style.background='#ffffff'; }}
          >
            <div style={{ width:38, height:38, borderRadius:8, background:f.accent+'18', border:`1px solid ${f.accent}33`, display:'flex', alignItems:'center', justifyContent:'center', color:f.accent }}>
              <f.I />
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'#1e293b', marginBottom:6 }}>{f.label}</div>
              <div style={{ fontSize:9, color:'#64748b', lineHeight:1.6 }}>{f.desc}</div>
            </div>
            <div style={{ fontSize:9, color:f.accent, fontWeight:700, marginTop:'auto', letterSpacing:'.05em' }}>Open →</div>
          </button>
        ))}
      </div>
    </section>
  );
}

// ─── Shared live header (Digital Twin + Controls tabs) ────────────────────────
function LiveHeader({ activeTabId, onNav, time }) {
  return (
    <div style={{ flexShrink:0, background:'#f8fafc', borderBottom:'1px solid #cbd5e1' }}>
      <div style={{ padding:'12px 40px', display:'flex', alignItems:'center' }}>
        <button onClick={() => onNav('home')} style={{ display:'flex', alignItems:'center', gap:12, background:'none', border:'none', cursor:'pointer', padding:0 }}>
          <div style={{ width:42, height:42, borderRadius:9, background:'linear-gradient(135deg,#0ea5e9,#0369a1)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 20px #0ea5e933' }}>
            <Icon.Shield />
          </div>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:'#38b2f8', letterSpacing:'.08em', lineHeight:1 }}>AQUA TWIN</div>
            <div style={{ fontSize:8, color:'#64748b', letterSpacing:'.12em', marginTop:2 }}>WATER MANAGEMENT SYSTEM</div>
          </div>
        </button>
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:14 }}>
          <span style={{ fontSize:9, color:'#4caf50', fontWeight:700, letterSpacing:'.06em' }}>● LIVE</span>
          <span style={{ fontSize:10, color:'#64748b', fontFamily:FONT }}>{time}</span>
          <button onClick={() => onNav('login')} style={{
            padding:'7px 18px', borderRadius:6, cursor:'pointer',
            fontSize:10, fontWeight:700, letterSpacing:'.06em',
            background:'transparent', color:'#475569',
            border:'1px solid #cbd5e1', fontFamily:FONT, transition:'all 0.2s',
          }}
          onMouseEnter={e=>{ e.currentTarget.style.borderColor='#38b2f8'; e.currentTarget.style.color='#38b2f8'; }}
          onMouseLeave={e=>{ e.currentTarget.style.borderColor='#cbd5e1'; e.currentTarget.style.color='#475569'; }}>
            Login / Register
          </button>
        </div>
      </div>
      <div style={{ borderTop:'1px solid #cbd5e1', padding:'0 40px', display:'flex', gap:0 }}>
        {TABS.map(tab => {
          const active = tab.id === activeTabId;
          return (
            <button key={tab.id} onClick={() => onNav(tab.id)} style={{
              height:44, padding:'0 22px', cursor:'pointer',
              display:'flex', alignItems:'center', gap:7,
              fontSize:11, fontWeight:active?700:500,
              fontFamily:FONT, letterSpacing:'.05em',
              background:'transparent', border:'none',
              color:        active?'#38b2f8':'#475569',
              borderBottom: active?'2px solid #38b2f8':'2px solid transparent',
              whiteSpace:'nowrap', transition:'all 0.2s',
            }}
            onMouseEnter={e=>{ if(!active){ e.currentTarget.style.color='#1e293b'; e.currentTarget.style.borderBottom='2px solid #38b2f844'; }}}
            onMouseLeave={e=>{ if(!active){ e.currentTarget.style.color='#475569'; e.currentTarget.style.borderBottom='2px solid transparent'; }}}>
              <tab.I /> {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HOME COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function Home() {
  const [activeTab, setActiveTab] = useState('home');
  const [scrolled,  setScrolled]  = useState(false);
  const [time,      setTime]      = useState(() => new Date().toLocaleTimeString('en-GB'));

  // ── Shared SCADA state ───────────────────────────────────────────────────────
  // Start as null so we never show stale hardcoded values before the first DB fetch.
  const [scadaLevels,      setScadaLevels]      = useState(null);
  const [scadaFlows,       setScadaFlows]       = useState(null);
  const [scadaConicLevel,  setScadaConicLevel]  = useState(null);
  const [scadaValveStates, setScadaValveStates] = useState(null);

  // True once the first DB fetch (or graceful fallback) has completed.
  const [dataLoaded, setDataLoaded] = useState(false);

  // Prevents the polling loop from overwriting optimistic UI updates AND
  // prevents the polling loop from overwriting simulation-driven level changes
  // while flows are active.
  const writePendingRef      = useRef(false);
  const simulationActiveRef  = useRef(false); // true while any flow > 0
  const dbSyncTickRef        = useRef(0);     // counts simulation ticks for periodic DB flush

  // ── Refs to always-current state (avoids stale closures in setInterval) ─────
  const latestRef = useRef({
    levels:      INITIAL_LEVELS,
    flows:       INITIAL_FLOWS,
    valveStates: INITIAL_VALVE_STATES,
    conicLevel:  CONIC_INITIAL_LEVEL,
  });

  // Keep latestRef in sync
  useEffect(() => {
    if (scadaLevels)      latestRef.current.levels      = scadaLevels;
  }, [scadaLevels]);
  useEffect(() => {
    if (scadaFlows)       latestRef.current.flows       = scadaFlows;
  }, [scadaFlows]);
  useEffect(() => {
    if (scadaValveStates) latestRef.current.valveStates = scadaValveStates;
  }, [scadaValveStates]);
  useEffect(() => {
    if (scadaConicLevel !== null) latestRef.current.conicLevel = scadaConicLevel;
  }, [scadaConicLevel]);

  // ── DATA LOADER (initial load + polling) ────────────────────────────────────
  const loadData = useCallback(async () => {
    if (writePendingRef.current) return;
    try {
      const dash = await fetchDashboard();

      // ── Levels: only accept DB values when no simulation is running ──────────
      if (!simulationActiveRef.current) {
        const newLevels = { ...INITIAL_LEVELS };
        const newConicLevel = CONIC_INITIAL_LEVEL;
        let conicFromDB = newConicLevel;

        (dash.tanks || []).forEach(tank => {
          if (tank.id === 'conic-sump') {
            conicFromDB = tank.level;
          } else if (tank.id in newLevels) {
            newLevels[tank.id] = tank.level;
          }
        });

        setScadaLevels(newLevels);
        setScadaConicLevel(conicFromDB);
      }

      // ── Flows: always accept from DB ─────────────────────────────────────────
      const newFlows = { ...INITIAL_FLOWS };
      (dash.flowmeters || []).forEach(fm => {
        if (fm.id in newFlows) newFlows[fm.id] = fm.flow;
      });
      setScadaFlows(newFlows);

      // ── Valve states: always accept from DB ──────────────────────────────────
      const newValves = { ...INITIAL_VALVE_STATES };
      (dash.valves || []).forEach(valve => {
        if (valve.id in newValves) newValves[valve.id] = valve.isOpen;
      });
      setScadaValveStates(newValves);

    } catch (err) {
      // Backend unavailable — fall back to hardcoded defaults on first load.
      console.warn('SCADA backend unavailable, using defaults');
      if (!dataLoaded) {
        setScadaLevels({ ...INITIAL_LEVELS });
        setScadaFlows({ ...INITIAL_FLOWS });
        setScadaConicLevel(CONIC_INITIAL_LEVEL);
        setScadaValveStates({ ...INITIAL_VALVE_STATES });
      }
    } finally {
      // Mark data as ready after the very first attempt (success or failure).
      setDataLoaded(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadData]);

  // ── FRONTEND LEVEL SIMULATION ────────────────────────────────────────────────
  // Runs every second. When the main inlet valve is open and flow > 0,
  // branch pipes fill tanks (levels rise). When outlet flowmeters are active,
  // the corresponding tanks drain (levels fall).
  // The simulation only changes local React state — it does NOT write to the DB.
  // The DB poll will re-sync baseline values whenever all flows stop.
  useEffect(() => {
    const simInterval = setInterval(() => {
      const { flows, valveStates, levels, conicLevel } = latestRef.current;

      const mainFlow   = flows['flowmeter-001'] ?? 0;
      const masterOpen = valveStates['valve-main-001'] ?? true;

      // Check if any flow is active at all.
      const anyOutletFlow = Object.entries(TANK_TO_OUTLET_FM).some(
        ([, fmId]) => (flows[fmId] ?? 0) > 0
      );
      const anyFlow = (mainFlow > 0 && masterOpen) || anyOutletFlow;

      // ── Detect simulation stopping → flush final levels to DB ──────────────
      // FIX: The simulation only ever wrote levels into React state, never to the
      // DB. So when the main slider was turned off, simulationActiveRef became
      // false, the next 5-second DB poll read the stale DB values, and the UI
      // snapped back to the original static data. Now we flush the latest
      // simulation-computed levels to the DB the moment flow stops, and also
      // sync every 5 ticks while flowing so progress is never lost.
      const wasActive = simulationActiveRef.current;
      simulationActiveRef.current = anyFlow;

      if (!anyFlow) {
        if (wasActive && !writePendingRef.current) {
          // Simulation just stopped — persist the last known levels immediately
          // so the upcoming DB poll reads current values, not stale ones.
          writePendingRef.current = true;
          const { levels: finalLevels, conicLevel: finalConic } = latestRef.current;
          Promise.all([
            ...Object.entries(finalLevels).map(([id, lvl]) =>
              updateTankLevel(id, lvl).catch(() => {})
            ),
            updateTankLevel('conic-sump', finalConic).catch(() => {}),
          ]).finally(() => { writePendingRef.current = false; });
        }
        return; // nothing to simulate — DB poll handles idle state
      }

      // Count tanks that are actively receiving inlet water right now.
      const activeTankIds = Object.keys(TANK_TO_OUTLET_FM).filter(tankId => {
        const valveId   = TANK_TO_INLET_VALVE[tankId];
        const valveOpen = valveStates[valveId] ?? true;
        const level     = levels[tankId] ?? 0;
        return masterOpen && mainFlow > 0 && valveOpen && level < 100 && conicLevel > 0;
      });

      const fillPerTank = activeTankIds.length > 0
        ? (mainFlow * FILL_COEFF) / activeTankIds.length
        : 0;

      // ── Update tank levels ──────────────────────────────────────────────────
      // Capture the newly-computed levels synchronously inside the updater so
      // we can write them to the DB without a separate state-read round-trip.
      let computedLevels = null;
      setScadaLevels(prev => {
        if (!prev) return prev;
        const next = { ...prev };
        Object.keys(TANK_TO_OUTLET_FM).forEach(tankId => {
          const valveId    = TANK_TO_INLET_VALVE[tankId];
          const valveOpen  = valveStates[valveId] ?? true;
          const outletFmId = TANK_TO_OUTLET_FM[tankId];
          const outletFlow = flows[outletFmId] ?? 0;

          // How much this tank fills this second (inlet).
          const fillRate = (
            masterOpen &&
            mainFlow > 0 &&
            valveOpen &&
            (prev[tankId] ?? 0) < 100 &&
            conicLevel > 0
          ) ? fillPerTank : 0;

          // How much this tank drains this second (outlet).
          const drainRate = outletFlow > 0 && (prev[tankId] ?? 0) > 0
            ? outletFlow * DRAIN_COEFF
            : 0;

          next[tankId] = Math.max(0, Math.min(100,
            (prev[tankId] ?? 0) + fillRate - drainRate
          ));
        });
        computedLevels = next; // captured synchronously — updater runs immediately
        return next;
      });

      // ── Drain the sump (conic) when inlet flow is active ───────────────────
      let computedConic = null;
      if (mainFlow > 0 && masterOpen && conicLevel > 0) {
        setScadaConicLevel(prev => {
          computedConic = Math.max(0, (prev ?? CONIC_INITIAL_LEVEL) - mainFlow * SUMP_DRAIN_COEFF);
          return computedConic;
        });
      }

      // ── Periodic DB sync while flowing (every 5 simulation ticks ≈ 5 s) ────
      // Keeps the DB from drifting too far behind so a page refresh or backend
      // restart sees reasonably current values even mid-simulation.
      dbSyncTickRef.current = (dbSyncTickRef.current + 1) % 5;
      if (dbSyncTickRef.current === 0 && computedLevels && !writePendingRef.current) {
        writePendingRef.current = true;
        Promise.all([
          ...Object.entries(computedLevels).map(([id, lvl]) =>
            updateTankLevel(id, lvl).catch(() => {})
          ),
          ...(computedConic !== null
            ? [updateTankLevel('conic-sump', computedConic).catch(() => {})]
            : []
          ),
        ]).finally(() => { writePendingRef.current = false; });
      }
    }, 1000);

    return () => clearInterval(simInterval);
  }, []); // single setup — reads live values from latestRef

  // ── CHANGE HANDLERS ──────────────────────────────────────────────────────────

  const handleFlowChange = useCallback(async (fmId, newValue) => {
    setScadaFlows(prev => prev ? { ...prev, [fmId]: newValue } : { ...INITIAL_FLOWS, [fmId]: newValue });
    writePendingRef.current = true;
    try {
      await updateFlowRate(fmId, newValue);
    } catch (err) {
      console.error(`updateFlowRate(${fmId}) failed:`, err.message);
    } finally {
      writePendingRef.current = false;
    }
  }, []);

  const handleLevelChange = useCallback(async (id, newValue) => {
    writePendingRef.current = true;
    if (id === '__conic__') {
      setScadaConicLevel(newValue);
      try { await updateTankLevel('conic-sump', newValue); }
      catch (err) { console.error('updateTankLevel(conic-sump) failed:', err.message); }
    } else {
      setScadaLevels(prev => prev ? { ...prev, [id]: newValue } : { ...INITIAL_LEVELS, [id]: newValue });
      try { await updateTankLevel(id, newValue); }
      catch (err) { console.error(`updateTankLevel(${id}) failed:`, err.message); }
    }
    writePendingRef.current = false;
  }, []);

  const handleValveToggle = useCallback(async (valveId) => {
    const currentState = latestRef.current.valveStates[valveId];
    const newState = !currentState;
    setScadaValveStates(prev => prev ? { ...prev, [valveId]: newState } : { ...INITIAL_VALVE_STATES, [valveId]: newState });
    writePendingRef.current = true;
    try {
      await toggleValve(valveId, newState);
    } catch (err) {
      console.error(`toggleValve(${valveId}) failed:`, err.message);
      setScadaValveStates(prev => prev ? { ...prev, [valveId]: currentState } : null);
    } finally {
      writePendingRef.current = false;
    }
  }, []);

  const handleReset = useCallback(async () => {
    setScadaLevels({ ...INITIAL_LEVELS });
    setScadaFlows({ ...INITIAL_FLOWS });
    setScadaConicLevel(CONIC_INITIAL_LEVEL);
    setScadaValveStates({ ...INITIAL_VALVE_STATES });
    simulationActiveRef.current = false;
    writePendingRef.current = true;
    try {
      await Promise.all([
        ...Object.entries(INITIAL_LEVELS).map(([id, lvl])       => updateTankLevel(id, lvl)),
        ...Object.entries(INITIAL_FLOWS).map(([id, flow])        => updateFlowRate(id, flow)),
        ...Object.entries(INITIAL_VALVE_STATES).map(([id, open]) => toggleValve(id, open)),
        updateTankLevel('conic-sump', CONIC_INITIAL_LEVEL),
      ]);
    } catch (err) {
      console.error('Reset failed (UI is still reset):', err.message);
    } finally {
      writePendingRef.current = false;
    }
  }, []);

  // ── LIFECYCLE ────────────────────────────────────────────────────────────────
  useEffect(() => { injectGlobalCSS(); }, []);
  useEffect(() => {
    const iv = setInterval(() => setTime(new Date().toLocaleTimeString('en-GB')), 1000);
    return () => clearInterval(iv);
  }, []);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const onNav = (tab) => {
    window.scrollTo(0, 0);
    setScrolled(false);
    setActiveTab(tab);
  };

  // Resolved state: fall back to INITIAL values only as a last resort so
  // JsonDisplay / ControlPanel never receive null props.
  const resolvedLevels      = scadaLevels      ?? INITIAL_LEVELS;
  const resolvedFlows       = scadaFlows       ?? INITIAL_FLOWS;
  const resolvedConicLevel  = scadaConicLevel  ?? CONIC_INITIAL_LEVEL;
  const resolvedValveStates = scadaValveStates ?? INITIAL_VALVE_STATES;

  // Props shared between Digital Twin and Controls pages.
  const scadaProps = {
    externalLevels:      resolvedLevels,
    externalFlows:       resolvedFlows,
    externalConicLevel:  resolvedConicLevel,
    externalValveStates: resolvedValveStates,
    onFlowChange:        handleFlowChange,
    onLevelChange:       handleLevelChange,
    onValveToggle:       handleValveToggle,
    onReset:             handleReset,
  };

  // ── RENDER ───────────────────────────────────────────────────────────────────

  if (activeTab === 'login') {
    return <LoginPage onBack={() => onNav('home')} />;
  }

  if (activeTab === 'digital-twin') {
    return (
      <div style={{ width:'100vw', height:'100vh', display:'flex', flexDirection:'column', background:'#f8fafc', fontFamily:FONT, overflow:'hidden' }}>
        <LiveHeader activeTabId="digital-twin" onNav={onNav} time={time} />
        {/* Show a loading screen until the first DB fetch resolves so no
            stale hardcoded data ever flashes on screen. */}
        {!dataLoaded
          ? <ScadaLoadingScreen />
          : (
            <div style={{ flex:1, overflow:'hidden' }}>
              <JsonDisplay {...scadaProps} />
            </div>
          )
        }
      </div>
    );
  }

  if (activeTab === 'controls') {
    return (
      <div style={{ width:'100vw', height:'100vh', display:'flex', flexDirection:'column', background:'#f8fafc', fontFamily:FONT, overflow:'hidden' }}>
        <LiveHeader activeTabId="controls" onNav={onNav} time={time} />
        {!dataLoaded
          ? <ScadaLoadingScreen />
          : (
            <div style={{ flex:1, overflow:'auto' }}>
              <ControlPanelPage {...scadaProps} />
            </div>
          )
        }
      </div>
    );
  }

  if (activeTab === 'alerts' || activeTab === 'performance' || activeTab === 'maintenance') {
    return (
      <div style={{ background:'#f8fafc', fontFamily:FONT, minHeight:'100vh' }}>
        <SiteHeader activeTab={activeTab} onNav={onNav} scrolled={scrolled} />
        {activeTab === 'alerts'      && <AlertsPage />}
        {activeTab === 'performance' && <PerformancePage />}
        {activeTab === 'maintenance' && <MaintenancePage />}
        <SiteFooter />
      </div>
    );
  }

  // ── HOME LANDING PAGE ────────────────────────────────────────────────────────
  return (
    <div style={{ background:'#f8fafc', fontFamily:FONT, color:'#1e293b', minHeight:'100vh' }}>
      <SiteHeader activeTab="home" onNav={onNav} scrolled={scrolled} />
      <section style={{
        position: 'relative',
        background: 'linear-gradient(160deg, #f0f4f8 0%, #eff6ff 35%, #dbeafe 65%, #f0f4f8 100%)',
        padding: '80px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '70vh',
      }}>
        <div style={{ position:'absolute', inset:0, opacity:0.07, backgroundImage:'radial-gradient(#38b2f8 1px, transparent 1px)', backgroundSize:'30px 30px', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', top:'-8%', right:'8%', width:480, height:480, borderRadius:'50%', background:'radial-gradient(circle,rgba(56,178,248,0.12) 0%,transparent 68%)', animation:'floatOrb 9s ease-in-out infinite', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:'-10%', left:'4%', width:380, height:380, borderRadius:'50%', background:'radial-gradient(circle,rgba(14,165,233,0.09) 0%,transparent 68%)', animation:'floatOrb 12s ease-in-out infinite', animationDelay:'4s', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', left:0, width:'100%', height:2, background:'linear-gradient(90deg,transparent,#38b2f822,transparent)', animation:'scanLine 7s linear infinite', pointerEvents:'none' }}/>
        <div style={{ position:'relative', zIndex:2, textAlign:'center', maxWidth:760, width:'100%' }}>
          <div className="hero-drop" style={{ display:'flex', justifyContent:'center', marginBottom:24 }}>
            <div style={{ width:72, height:72, borderRadius:'50%', background:'rgba(56,178,248,0.12)', border:'2px solid rgba(56,178,248,0.25)', display:'flex', alignItems:'center', justifyContent:'center', animation:'pulse 2.5s ease-in-out infinite' }}>
              <Icon.Drop />
            </div>
          </div>
          <div className="hero-badge" style={{ display:'inline-flex', alignItems:'center', gap:8, marginBottom:24, padding:'6px 18px', borderRadius:20, background:'rgba(56,178,248,0.08)', border:'1px solid rgba(56,178,248,0.22)' }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'#38b2f8', boxShadow:'0 0 8px #38b2f8', display:'inline-block' }}/>
            <span style={{ fontSize:10, fontWeight:700, color:'#475569', letterSpacing:'.14em', textTransform:'uppercase' }}>AquaTwin SCADA Platform</span>
          </div>
          <div className="hero-btn" style={{ marginBottom:16 }}>
            <button className="launch-btn" onClick={() => onNav('digital-twin')} style={{
              padding:'16px 48px', borderRadius:10, cursor:'pointer',
              fontSize:15, fontWeight:700, letterSpacing:'.08em',
              background:'linear-gradient(135deg,#0ea5e9,#0369a1)',
              color:'#fff', border:'none', fontFamily:FONT,
              animation:'glow 3s ease-in-out infinite',
              transition:'transform 0.25s, box-shadow 0.25s',
              display:'inline-flex', alignItems:'center', gap:12,
            }}>
              Launch Digital Twin <Icon.ArrowRight />
            </button>
          </div>
          <div className="hero-sub" style={{ fontSize:11, color:'#64748b', marginBottom:48, letterSpacing:'.04em' }}>
            Live SCADA · Real-time tank levels · Valve controls · Flow animations
          </div>
          <div className="hero-stats" style={{ display:'inline-flex', gap:0, borderRadius:10, overflow:'hidden', border:'1px solid #cbd5e1', background:'rgba(255,255,255,0.90)' }}>
            {[
              { v:'6',     l:'Zones Active', c:'#38b2f8' },
              { v:'99.1%', l:'Uptime',       c:'#22c55e' },
              { v:'1.2M',  l:'Litres / Day', c:'#a78bfa' },
              { v:'7',     l:'Flow Meters',  c:'#f59e0b' },
            ].map((s,i,arr)=>(
              <div key={s.l} style={{ padding:'16px 28px', textAlign:'center', borderRight:i<arr.length-1?'1px solid #cbd5e1':'none' }}>
                <div style={{ fontSize:22, fontWeight:700, color:s.c, lineHeight:1 }}>{s.v}</div>
                <div style={{ fontSize:8, color:'#64748b', textTransform:'uppercase', letterSpacing:'.1em', marginTop:5 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <FeatureStrip onNav={onNav} />
      <section style={{ padding:'64px 40px', background:'#f8fafc' }}>
        <div style={{ textAlign:'center', marginBottom:52 }}>
          <div style={{ fontSize:9, color:'#64748b', letterSpacing:'.16em', textTransform:'uppercase', marginBottom:10 }}>Why AquaTwin</div>
          <div style={{ fontSize:32, fontWeight:700, color:'#1e293b', maxWidth:520, margin:'0 auto', lineHeight:1.3 }}>
            Everything you need to manage water infrastructure
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:22, maxWidth:920, margin:'0 auto' }}>
          {[
            { icon:'⚡', title:'Real-Time Monitoring',  desc:'Live tank levels, pipe flow rates and valve states updated every second via local simulation, synced to the database every 5 s.' },
            { icon:'🎛️', title:'Full Valve Control',    desc:'Open or close any valve from the Controls tab. Watch flow paths respond instantly.' },
            { icon:'📉', title:'Smart Auto-Stop',       desc:'Flow auto-stops when tanks are full or the sump source runs empty.' },
            { icon:'🗺️', title:'Zone Navigation',       desc:'Click any zone flowmeter to drill into its dedicated zone distribution view.' },
            { icon:'🔔', title:'Alert System',          desc:'Critical, warning, and OK events tracked with timestamps and acknowledgement.' },
            { icon:'🔧', title:'Maintenance Tracker',   desc:'Scheduled and corrective maintenance tasks with overdue detection.' },
          ].map(w => (
            <div key={w.title} className="why-card" style={{ background:'#f1f5f9', borderRadius:12, padding:'26px 24px', border:'1px solid #cbd5e1', transition:'all 0.25s', cursor:'default' }}>
              <div style={{ fontSize:28, marginBottom:14 }}>{w.icon}</div>
              <div style={{ fontSize:13, fontWeight:700, color:'#1e293b', marginBottom:8 }}>{w.title}</div>
              <div style={{ fontSize:11, color:'#475569', lineHeight:1.65 }}>{w.desc}</div>
            </div>
          ))}
        </div>
      </section>
      <section style={{ padding:'0 40px 48px' }}>
        <div style={{
          borderRadius:14,
          background:'linear-gradient(135deg,#eff6ff 0%,#dbeafe 55%,#0369a1 100%)',
          border:'1px solid rgba(56,178,248,0.2)',
          padding:'44px 52px', display:'flex', alignItems:'center', justifyContent:'space-between',
          boxShadow:'0 8px 40px rgba(0,0,0,0.5)',
        }}>
          <div>
            <div style={{ fontSize:24, fontWeight:700, color:'#1e293b', marginBottom:10, lineHeight:1.2 }}>Ready to explore the Digital Twin?</div>
            <div style={{ fontSize:12, color:'#475569', lineHeight:1.6, maxWidth:480 }}>Launch the full SCADA interface with live flow animations, tank levels and valve controls.</div>
          </div>
          <button className="launch-btn" onClick={() => onNav('digital-twin')} style={{
            padding:'14px 32px', borderRadius:8, cursor:'pointer', flexShrink:0, marginLeft:32,
            fontSize:12, fontWeight:700, letterSpacing:'.08em',
            background:'linear-gradient(135deg,#0ea5e9,#0369a1)',
            color:'#fff', border:'none', fontFamily:FONT,
            transition:'transform 0.25s, box-shadow 0.25s',
          }}>
            Launch Digital Twin ↗
          </button>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
