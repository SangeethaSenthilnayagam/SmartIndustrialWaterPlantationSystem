import React, { useState, useCallback } from 'react';
import ControlPanelPage from './ControlPanel';   // adjust path if needed
import JsonDisplay      from './jsonDisplay';    // adjust path if needed

// ─── Initial state (mirrors both files' INITIAL_* constants) ──────────────────
const INITIAL_LEVELS = {
  'glsr-01': 70, 'glsr-02': 60, 'glsr-03': 80,
  'oht-01':  50, 'oht-02':  40, 'oht-03':  30,
};

const INITIAL_FLOWS = {
  'flowmeter-001':     0,
  'flowmeter-glsr-01': 0, 'flowmeter-glsr-02': 0, 'flowmeter-glsr-03': 0,
  'flowmeter-oht-01':  0, 'flowmeter-oht-02':  0, 'flowmeter-oht-03':  0,
};

const INITIAL_VALVE_STATES = {
  'valve-main-001': true,
  'valve-oht-01':  true, 'valve-glsr-01': true,
  'valve-oht-02':  true, 'valve-glsr-02': true,
  'valve-oht-03':  true, 'valve-glsr-03': true,
};

const INITIAL_CONIC_LEVEL = 75;

// ─── SharedSCADA ──────────────────────────────────────────────────────────────
export default function SharedSCADA({ layout = 'split-h' }) {
  // ── Single source of truth ──────────────────────────────────────────────────
  const [levels,      setLevels]      = useState({ ...INITIAL_LEVELS });
  const [flows,       setFlows]       = useState({ ...INITIAL_FLOWS  });
  const [valveStates, setValveStates] = useState({ ...INITIAL_VALVE_STATES });
  const [conicLevel,  setConicLevel]  = useState(INITIAL_CONIC_LEVEL);

  // ── Handlers ────────────────────────────────────────────────────────────────
  /**
   * Called by either component when a tank level or the conic (sump) level
   * changes.  `id === '__conic__'` means the sump/conic tank.
   */
  const handleLevelChange = useCallback((id, value) => {
    if (id === '__conic__') {
      setConicLevel(value);
    } else {
      setLevels(prev => ({ ...prev, [id]: value }));
    }
  }, []);

  /**
   * Called by either component when a flow-meter value changes.
   */
  const handleFlowChange = useCallback((id, value) => {
    setFlows(prev => ({ ...prev, [id]: value }));
  }, []);

  /**
   * Called by either component when a valve is toggled.
   */
  const handleValveToggle = useCallback((valveId) => {
    setValveStates(prev => ({ ...prev, [valveId]: !prev[valveId] }));
  }, []);

  /**
   * Full reset — restore everything to initial defaults.
   */
  const handleReset = useCallback(() => {
    setLevels({ ...INITIAL_LEVELS });
    setFlows({ ...INITIAL_FLOWS });
    setValveStates({ ...INITIAL_VALVE_STATES });
    setConicLevel(INITIAL_CONIC_LEVEL);
  }, []);

  // ── Shared props object (passed to both children) ────────────────────────────
  const sharedProps = {
    levels,
    flows,
    conicLevel,
    valveStates,
    onLevelChange: handleLevelChange,
    onFlowChange:  handleFlowChange,
    onValveToggle: handleValveToggle,
    onReset:       handleReset,
  };

  // ── JsonDisplay expects `external*` prop names ────────────────────────────
  const scadaProps = {
    externalLevels:      levels,
    externalFlows:       flows,
    externalConicLevel:  conicLevel,
    externalValveStates: valveStates,
    onLevelChange:       handleLevelChange,
    onFlowChange:        handleFlowChange,
    onValveToggle:       handleValveToggle,
    onReset:             handleReset,
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return <Layout layout={layout} sharedProps={sharedProps} scadaProps={scadaProps} />;
}

// ─── Layout variants ──────────────────────────────────────────────────────────
function Layout({ layout, sharedProps, scadaProps }) {
  if (layout === 'split-h') {
    return (
      <div style={{ display: 'flex', width: '100%', height: '100vh', overflow: 'hidden', background: '#f0f4f8' }}>
        {/* ── Left: Control Panel (fixed width) ── */}
        <div style={{ width: '45%', minWidth: 480, flexShrink: 0, height: '100%', borderRight: '2px solid #cbd5e1', overflow: 'hidden' }}>
          <ControlPanelPage {...sharedProps} />
        </div>
        {/* ── Right: SCADA Graph ── */}
        <div style={{ flex: 1, height: '100%', overflow: 'hidden' }}>
          <JsonDisplay {...scadaProps} />
        </div>
      </div>
    );
  }

  if (layout === 'split-v') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100vh', overflow: 'hidden', background: '#f0f4f8' }}>
        <div style={{ height: '50%', borderBottom: '2px solid #cbd5e1', overflow: 'hidden' }}>
          <ControlPanelPage {...sharedProps} />
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <JsonDisplay {...scadaProps} />
        </div>
      </div>
    );
  }

  if (layout === 'tabs') {
    return <TabbedLayout sharedProps={sharedProps} scadaProps={scadaProps} />;
  }

  if (layout === 'scada-only') {
    return (
      <div style={{ width: '100%', height: '100vh' }}>
        <JsonDisplay {...scadaProps} />
      </div>
    );
  }

  if (layout === 'panel-only') {
    return (
      <div style={{ width: '100%', height: '100vh' }}>
        <ControlPanelPage {...sharedProps} />
      </div>
    );
  }

  // Fallback: split-h
  return <Layout layout="split-h" sharedProps={sharedProps} scadaProps={scadaProps} />;
}

// ─── Tabs layout ──────────────────────────────────────────────────────────────
function TabbedLayout({ sharedProps, scadaProps }) {
  const [tab, setTab] = useState('panel');
  const FONT = "'Courier New', monospace";

  const tabStyle = (active) => ({
    padding: '7px 20px',
    background: active ? '#dbeafe' : '#e8ecf1',
    color: active ? '#38b2f8' : '#64748b',
    border: 'none',
    borderBottom: active ? '2px solid #38b2f8' : '2px solid transparent',
    cursor: 'pointer',
    fontFamily: FONT,
    fontWeight: 700,
    fontSize: 11,
    letterSpacing: '.06em',
    transition: 'all 0.15s',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100vh', background: '#f0f4f8', overflow: 'hidden' }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', background: '#e8ecf1', borderBottom: '1px solid #cbd5e1', flexShrink: 0, paddingLeft: 12 }}>
        <button style={tabStyle(tab === 'panel')} onClick={() => setTab('panel')}>
          ⚙ CONTROL PANEL
        </button>
        <button style={tabStyle(tab === 'scada')} onClick={() => setTab('scada')}>
          🗺 SCADA VIEW
        </button>
        {/* Live summary pills */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, paddingRight: 16 }}>
          <LevelPill label="Avg Level"
            value={`${Math.round(Object.values(sharedProps.levels).reduce((a,b)=>a+b,0)/Object.keys(sharedProps.levels).length)}%`}
            color="#38b2f8" />
          <LevelPill label="Main Flow"
            value={`${(sharedProps.flows['flowmeter-001'] ?? 0).toFixed(1)} m³/h`}
            color={sharedProps.flows['flowmeter-001'] > 0 ? '#4caf50' : '#64748b'} />
          <LevelPill label="Sump"
            value={`${Math.round(sharedProps.conicLevel)}%`}
            color={sharedProps.conicLevel < 25 ? '#ef9f27' : '#38b2f8'} />
        </div>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <div style={{ display: tab === 'panel' ? 'block' : 'none', width: '100%', height: '100%' }}>
          <ControlPanelPage {...sharedProps} />
        </div>
        <div style={{ display: tab === 'scada' ? 'block' : 'none', width: '100%', height: '100%' }}>
          <JsonDisplay {...scadaProps} />
        </div>
      </div>
    </div>
  );
}

function LevelPill({ label, value, color }) {
  const FONT = "'Courier New', monospace";
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
      <span style={{ fontSize: 8, color: '#64748b', fontFamily: FONT, textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color, fontFamily: FONT }}>{value}</span>
    </div>
  );
}