import React, { useEffect, useRef, useState } from 'react';
import * as joint from '@joint/core';
import config from '../config/complete-scada-config.json';
import Tap from './Tap';

// ─── Constants ────────────────────────────────────────────────────────────────
const PAPER_W_DEFAULT = 800;
const PAPER_H_DEFAULT = 600;
const TANK_BODY_HEIGHT = 80;

const INITIAL_LEVELS = {
  'glsr-01': 70,
  'glsr-02': 60,
  'glsr-03': 80,
  'oht-01': 50,
  'oht-02': 40,
  'oht-03': 30,
};

const INITIAL_FLOWS = {
  'flowmeter-001': 0,
  'flowmeter-glsr-01': 0,
  'flowmeter-glsr-02': 0,
  'flowmeter-glsr-03': 0,
  'flowmeter-oht-01': 0,
  'flowmeter-oht-02': 0,
  'flowmeter-oht-03': 0,
};

// ── Valve metadata ─────────────────────────────────────────────────────────────
const TANK_TO_VALVE = {
  'oht-01': 'valve-oht-01',
  'glsr-01': 'valve-glsr-01',
  'oht-02': 'valve-oht-02',
  'glsr-02': 'valve-glsr-02',
  'oht-03': 'valve-oht-03',
  'glsr-03': 'valve-glsr-03',
};

// Pipes that become active when the master inlet valve opens.
const MASTER_VALVE_DOWNSTREAM_PIPES = [
  'pipe-valve-main-to-header',
  'pipe-header-to-valve-oht-01', 'pipe-header-to-valve-glsr-01',
  'pipe-header-to-valve-oht-02', 'pipe-header-to-valve-glsr-02',
  'pipe-header-to-valve-oht-03', 'pipe-header-to-valve-glsr-03',
  'pipe-valve-oht-01-to-tank', 'pipe-valve-glsr-01-to-tank',
  'pipe-valve-oht-02-to-tank', 'pipe-valve-glsr-02-to-tank',
  'pipe-valve-oht-03-to-tank', 'pipe-valve-glsr-03-to-tank',
  'pipe-header-to-oht-01', 'pipe-header-to-glsr-01',
  'pipe-header-to-oht-02', 'pipe-header-to-glsr-02',
  'pipe-header-to-oht-03', 'pipe-header-to-glsr-03',
  'header-pipe-main',
];

// ─── Pipe groups per flowmeter ─────────────────────────────────────────────────
// flowmeter-001 → INLET pipes (main supply → header → branch → tanks)
// flowmeter-glsr-*/oht-* → OUTLET pipes (tanks → distribution network)
const PIPE_GROUPS = {
  'flowmeter-001': [
    'main-pipe-001', 'main-pipe-002', 'main-pipe-003',
    'pipe-valve-main-to-header',
    'pipe-header-to-valve-oht-01', 'pipe-header-to-valve-glsr-01',
    'pipe-header-to-valve-oht-02', 'pipe-header-to-valve-glsr-02',
    'pipe-header-to-valve-oht-03', 'pipe-header-to-valve-glsr-03',
    'pipe-valve-oht-01-to-tank', 'pipe-valve-glsr-01-to-tank',
    'pipe-valve-oht-02-to-tank', 'pipe-valve-glsr-02-to-tank',
    'pipe-valve-oht-03-to-tank', 'pipe-valve-glsr-03-to-tank',
    'pipe-header-to-oht-01', 'pipe-header-to-glsr-01',
    'pipe-header-to-oht-02', 'pipe-header-to-glsr-02',
    'pipe-header-to-oht-03', 'pipe-header-to-glsr-03',
  ],
  'flowmeter-glsr-01': ['pipe-glsr-01-1', 'pipe-glsr-01-2', 'pipe-glsr-01-to-distribution'],
  'flowmeter-glsr-02': ['pipe-glsr-02-1', 'pipe-glsr-02-2', 'pipe-glsr-02-to-distribution'],
  'flowmeter-glsr-03': ['pipe-glsr-03-1', 'pipe-glsr-03-2', 'pipe-glsr-03-to-distribution'],
  'flowmeter-oht-01':  ['pipe-oht-01-1', 'pipe-oht-01-2', 'pipe-oht-01-to-distribution'],
  'flowmeter-oht-02':  ['pipe-oht-02-1', 'pipe-oht-02-2', 'pipe-oht-02-to-distribution'],
  'flowmeter-oht-03':  ['pipe-oht-03-1', 'pipe-oht-03-2', 'pipe-oht-03-to-distribution'],
};

// Outlet flowmeter IDs — these pipes carry water AWAY from tanks.
const OUTLET_FLOWMETER_IDS = new Set([
  'flowmeter-glsr-01', 'flowmeter-glsr-02', 'flowmeter-glsr-03',
  'flowmeter-oht-01',  'flowmeter-oht-02',  'flowmeter-oht-03',
]);

// Maps every individual pipe to the tank it is connected to.
// INLET pipes: used to check "tank is not full" before animating.
// OUTLET pipes: used to check "tank is not empty" before animating.
const BRANCH_PIPE_TO_TANK = {
  // ── Inlet branch pipes (main header → each tank) ──
  'pipe-header-to-valve-oht-01':  'oht-01',
  'pipe-header-to-valve-glsr-01': 'glsr-01',
  'pipe-header-to-valve-oht-02':  'oht-02',
  'pipe-header-to-valve-glsr-02': 'glsr-02',
  'pipe-header-to-valve-oht-03':  'oht-03',
  'pipe-header-to-valve-glsr-03': 'glsr-03',
  'pipe-valve-oht-01-to-tank':    'oht-01',
  'pipe-valve-glsr-01-to-tank':   'glsr-01',
  'pipe-valve-oht-02-to-tank':    'oht-02',
  'pipe-valve-glsr-02-to-tank':   'glsr-02',
  'pipe-valve-oht-03-to-tank':    'oht-03',
  'pipe-valve-glsr-03-to-tank':   'glsr-03',
  'pipe-header-to-oht-01':        'oht-01',
  'pipe-header-to-glsr-01':       'glsr-01',
  'pipe-header-to-oht-02':        'oht-02',
  'pipe-header-to-glsr-02':       'glsr-02',
  'pipe-header-to-oht-03':        'oht-03',
  'pipe-header-to-glsr-03':       'glsr-03',
  // ── Outlet distribution pipes (each tank → distribution) ──
  'pipe-glsr-01-1':               'glsr-01',
  'pipe-glsr-01-2':               'glsr-01',
  'pipe-glsr-01-to-distribution': 'glsr-01',
  'pipe-glsr-02-1':               'glsr-02',
  'pipe-glsr-02-2':               'glsr-02',
  'pipe-glsr-02-to-distribution': 'glsr-02',
  'pipe-glsr-03-1':               'glsr-03',
  'pipe-glsr-03-2':               'glsr-03',
  'pipe-glsr-03-to-distribution': 'glsr-03',
  'pipe-oht-01-1':                'oht-01',
  'pipe-oht-01-2':                'oht-01',
  'pipe-oht-01-to-distribution':  'oht-01',
  'pipe-oht-02-1':                'oht-02',
  'pipe-oht-02-2':                'oht-02',
  'pipe-oht-02-to-distribution':  'oht-02',
  'pipe-oht-03-1':                'oht-03',
  'pipe-oht-03-2':                'oht-03',
  'pipe-oht-03-to-distribution':  'oht-03',
};

const FLOWMETER_ZONE_LABELS = {
  'flowmeter-glsr-01': 'Zone-09',
  'flowmeter-glsr-02': 'Zone-06',
  'flowmeter-glsr-03': 'Zone-01',
  'flowmeter-oht-01':  'Zone-04',
  'flowmeter-oht-02':  'Zone-07',
  'flowmeter-oht-03':  'Zone-02',
};

const ZONE_INFO_MAP = {
  'flowmeter-glsr-01': { zoneName: 'Zone-09', tankId: 'GLSR-01', tankLabel: 'Gangamma',     tankRef: 'glsr-01', fmId: 'FT-GLSR-01', fmRef: 'flowmeter-glsr-01' },
  'flowmeter-glsr-02': { zoneName: 'Zone-06', tankId: 'GLSR-02', tankLabel: 'Meher Nagara', tankRef: 'glsr-02', fmId: 'FT-GLSR-02', fmRef: 'flowmeter-glsr-02' },
  'flowmeter-glsr-03': { zoneName: 'Zone-01', tankId: 'GLSR-03', tankLabel: 'Guttahalli',   tankRef: 'glsr-03', fmId: 'FT-GLSR-03', fmRef: 'flowmeter-glsr-03' },
  'flowmeter-oht-01':  { zoneName: 'Zone-04', tankId: 'OHT-01',  tankLabel: 'Kumar Swamy',  tankRef: 'oht-01',  fmId: 'FT-OHT-01',  fmRef: 'flowmeter-oht-01'  },
  'flowmeter-oht-02':  { zoneName: 'Zone-07', tankId: 'OHT-02',  tankLabel: 'Nearby GLSR',  tankRef: 'oht-02',  fmId: 'FT-OHT-02',  fmRef: 'flowmeter-oht-02'  },
  'flowmeter-oht-03':  { zoneName: 'Zone-02', tankId: 'OHT-03',  tankLabel: 'Stadium Rd',   tankRef: 'oht-03',  fmId: 'FT-OHT-03',  fmRef: 'flowmeter-oht-03'  },
};

// ── Theme ─────────────────────────────────────────────────────────────────────
const BG_IDLE    = '#FFFFFF';
const BG_FLOWING = '#FFFFFF';
const PIPE_COLOR_IDLE    = '#2a4a6a';
const PIPE_COLOR_FLOWING = '#38b2f8';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function flowSpeed(val) {
  if (val <= 0) return null;
  if (val < 40) return '2.4s';
  if (val < 80) return '1.2s';
  return '0.7s';
}

/**
 * Apply animated flow to a JointJS pipe link cell.
 * @param {object}  cell     - JointJS cell
 * @param {boolean} flowing  - whether water is currently flowing
 * @param {number}  flowVal  - flow value (m³/h) used to set animation speed
 * @param {boolean} reversed - true for outlet pipes (animation goes in opposite direction)
 */
function applyPipeFlow(cell, flowing, flowVal, reversed = false) {
  if (!cell) return;
  const speed = flowSpeed(flowVal);
  cell.attr('line/stroke', flowing ? PIPE_COLOR_FLOWING : PIPE_COLOR_IDLE);
  if (flowing && speed) {
    cell.attr('liquid/opacity', 1);
    cell.attr('liquid/strokeDasharray', '8,16');
    // Use reverse animation for outlet pipes so the animation direction
    // visually matches water flowing OUT of the tank.
    const animName = reversed ? 'flowAnimationReverse' : 'flowAnimation';
    cell.attr('liquid/style', { animation: `${animName} ${speed} linear infinite` });
  } else {
    cell.attr('liquid/opacity', 0);
    cell.attr('liquid/strokeDasharray', 'none');
    cell.attr('liquid/style', { animation: 'none' });
  }
}

function applyValveVisual(cell, isOpen) {
  if (!cell) return;
  cell.attr('body/fill',         isOpen ? '#1a6b3a' : '#7a1a1a');
  cell.attr('body/stroke',       isOpen ? '#4caf50' : '#f44336');
  cell.attr('handwheel/fill',    isOpen ? '#2e7d32' : '#c62828');
  cell.attr('handwheel/stroke',  isOpen ? '#4caf50' : '#f44336');
  cell.attr('cover/fill',        isOpen ? '#38b2f8' : '#888888');
  cell.attr('cover/opacity',     isOpen ? 0.7       : 0.3);
}

function liquidAttrs(levelPct) {
  const pct   = Math.max(0, Math.min(100, levelPct)) / 100;
  const h     = Math.round(TANK_BODY_HEIGHT * pct);
  const y     = TANK_BODY_HEIGHT - h;
  const color = pct < 0.25 ? '#e74c3c' : '#38b2f8';
  return { y, height: h, fill: color, surfaceY: y - 1 };
}

const CONIC_LIQUID_TOP    = 80;
const CONIC_LIQUID_HEIGHT = 120;

function conicLiquidAttrs(levelPct) {
  const pct  = Math.max(0, Math.min(100, levelPct)) / 100;
  const h    = Math.round(CONIC_LIQUID_HEIGHT * pct);
  const y    = CONIC_LIQUID_TOP + (CONIC_LIQUID_HEIGHT - h);
  const fill = pct < 0.25 ? '#e74c3c' : '#38b2f8';
  return { x: 4, y, width: 352, height: h, fill, opacity: 0.82, surfaceY: y };
}

function flowColor(val) {
  if (val <= 0) return '#4a7a9b';
  if (val < 40) return '#f5a623';
  if (val < 80) return '#4caf50';
  return '#38b2f8';
}

// ─── Top Status Bar ───────────────────────────────────────────────────────────
function TopStatusBar({ levels, flows, conicLevel, valveStates }) {
  const anyFlow   = Object.values(flows).some(v => v > 0);
  const mainFlow  = flows['flowmeter-001'] ?? 0;
  const active    = Object.entries(flows).filter(([k, v]) => k !== 'flowmeter-001' && v > 0).length;
  const total     = Object.keys(flows).length - 1;
  const avgLevel  = Math.round(Object.values(levels).reduce((a, b) => a + b, 0) / Object.keys(levels).length);
  const masterOpen = valveStates['valve-main-001'] ?? true;

  const [time, setTime] = useState(() => new Date().toLocaleTimeString('en-GB'));
  useEffect(() => {
    const iv = setInterval(() => setTime(new Date().toLocaleTimeString('en-GB')), 1000);
    return () => clearInterval(iv);
  }, []);

  const S = ({ label, value, accent }) => (
    <div style={{ display:'flex', flexDirection:'column', gap:2, paddingRight:14, borderRight:'1px solid #1e3a5c' }}>
      <span style={{ fontSize:9, color:'#4a7a9b', textTransform:'uppercase', letterSpacing:'.06em' }}>{label}</span>
      <span style={{ fontSize:13, fontWeight:700, color: accent || '#e8f4ff', fontFamily:"'Courier New',monospace" }}>{value}</span>
    </div>
  );

  return (
    <div style={{ background:'#FFFFFF', borderBottom:'1px solid #1e3a5c', padding:'7px 16px', display:'flex', alignItems:'center', gap:14, flexShrink:0 }}>
      <S label="System" value={
        <span style={{ display:'inline-flex', alignItems:'center', gap:5 }}>
          <span style={{ width:7, height:7, borderRadius:'50%', background: anyFlow ? '#4caf50' : '#f44336', display:'inline-block', boxShadow: anyFlow ? '0 0 5px #4caf5088' : 'none' }} />
          {anyFlow ? 'FLOWING' : 'IDLE'}
        </span>
      } />
      <S label="Main inlet"   value={`${mainFlow.toFixed(1)} m³/h`} accent={mainFlow > 0 ? '#38b2f8' : '#4a7a9b'} />
      <S label="Active lines" value={`${active} / ${total}`}        accent={active > 0 ? '#4caf50' : '#4a7a9b'} />
      <S label="Avg level"    value={`${avgLevel}%`}                accent={avgLevel < 25 ? '#ef9f27' : '#e8f4ff'} />
      <S label="Sump/Source"  value={`${Math.round(conicLevel)}%`}  accent={conicLevel <= 0 ? '#f44336' : conicLevel < 25 ? '#ef9f27' : '#38b2f8'} />
      <S label="V-Main"       value={masterOpen ? '● OPEN' : '● CLOSED'} accent={masterOpen ? '#4caf50' : '#f44336'} />
      <div style={{ marginLeft:'auto', display:'flex', flexDirection:'column', gap:2 }}>
        <span style={{ fontSize:9, color:'#4a7a9b', textTransform:'uppercase', letterSpacing:'.06em' }}>Live</span>
        <span style={{ fontSize:13, fontWeight:700, color:'#38b2f8', fontFamily:"'Courier New',monospace" }}>{time}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
function JsonDisplay({
  externalLevels      = INITIAL_LEVELS,
  externalFlows       = INITIAL_FLOWS,
  externalConicLevel  = 75,
  externalValveStates = {},
}) {
  const paperRef     = useRef(null);
  const containerRef = useRef(null);
  const graphRef     = useRef(null);
  const paperObjRef  = useRef(null);

  const [tapZoneInfo, setTapZoneInfo] = useState(null);

  const levels      = externalLevels;
  const flows       = externalFlows;
  const conicLevel  = externalConicLevel;
  const valveStates = externalValveStates;

  const [bgColor, setBgColor] = useState(BG_IDLE);

  // ── Background colour based on flow ─────────────────────────────────────────
  useEffect(() => {
    const anyFlowing = Object.values(flows).some(v => v > 0);
    const newBg = anyFlowing ? BG_FLOWING : BG_IDLE;
    setBgColor(newBg);
    if (paperObjRef.current) paperObjRef.current.drawBackground({ color: newBg });
  }, [flows]);

  // ── Sync valve visuals ───────────────────────────────────────────────────────
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    Object.entries(valveStates).forEach(([valveId, isOpen]) => {
      applyValveVisual(graph.getCell(valveId), isOpen);
    });
  }, [valveStates]);

  // ── Sync conic (sump) level ──────────────────────────────────────────────────
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    const cell = graph.getCell('conic-tank-001');
    if (!cell) return;
    const { x, y, width, height, fill, opacity, surfaceY } = conicLiquidAttrs(conicLevel);
    cell.attr('liquid/x', x);
    cell.attr('liquid/y', y);
    cell.attr('liquid/width', width);
    cell.attr('liquid/height', height);
    cell.attr('liquid/fill', fill);
    cell.attr('liquid/opacity', opacity);
    cell.attr('liquidSurface/y', surfaceY);
    cell.attr('levelIndicator/text', `${Math.round(conicLevel)}%`);
  }, [conicLevel]);

  // ── Sync tank levels ─────────────────────────────────────────────────────────
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    Object.entries(levels).forEach(([tankId, pct]) => {
      const cell = graph.getCell(tankId);
      if (!cell) return;
      const { y, height, fill, surfaceY } = liquidAttrs(pct);
      cell.attr('liquid/y',            y);
      cell.attr('liquid/height',       height);
      cell.attr('liquid/fill',         fill);
      cell.attr('liquidSurface/y',     surfaceY);
      cell.attr('levelIndicator/text', `${Math.round(pct)}%`);
    });
  }, [levels]);

  // ── Sync flows & pipe animations ─────────────────────────────────────────────
  // KEY FIX:
  //   • Inlet pipes  (flowmeter-001 group) — stop when tank is FULL  (level ≥ 100)
  //   • Outlet pipes (distribution group)  — stop when tank is EMPTY (level ≤ 0)
  //   • Outlet pipes use the REVERSED animation so dashes visually flow away from tanks.
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;

    const mainFlow   = flows['flowmeter-001'] ?? 0;
    const masterOpen = valveStates['valve-main-001'] ?? true;

    Object.entries(flows).forEach(([fmId, flowVal]) => {
      const flowing  = flowVal > 0;
      const isOutlet = OUTLET_FLOWMETER_IDS.has(fmId);

      // ── Update flowmeter display ─────────────────────────────────────────────
      const fmCell = graph.getCell(fmId);
      if (fmCell) {
        const fc = flowColor(flowVal);
        fmCell.attr('flowValue/text',     flowVal.toFixed(1));
        fmCell.attr('flowValue/fill',     fc);
        fmCell.attr('flowIndicator/fill', fc);
        fmCell.attr('statusLED/fill',     flowing ? '#32CD32' : '#e74c3c');
        fmCell.attr('unitLabel/text',     'm³/h');
      }

      // ── Animate pipes ────────────────────────────────────────────────────────
      if (fmId === 'flowmeter-001') {
        // INLET: main supply → header → branch pipes → tanks
        (PIPE_GROUPS[fmId] || []).forEach(pipeId => {
          const isTrunk           = ['main-pipe-001', 'main-pipe-002', 'main-pipe-003'].includes(pipeId);
          const isMasterDownstream = MASTER_VALVE_DOWNSTREAM_PIPES.includes(pipeId);

          let shouldFlow = false;
          if (isTrunk) {
            // Trunk pipes animate whenever the main flow is active.
            shouldFlow = flowing;
          } else if (isMasterDownstream) {
            if (!masterOpen) {
              shouldFlow = false;
            } else {
              const linkedTank = BRANCH_PIPE_TO_TANK[pipeId];
              if (linkedTank) {
                const tankValveId  = TANK_TO_VALVE[linkedTank];
                const tankValveOpen = tankValveId ? (valveStates[tankValveId] ?? true) : true;
                // Stop filling inlet branch pipe when the tank is FULL (100 %).
                const tankFull = (levels[linkedTank] ?? 0) >= 100;
                shouldFlow = flowing && tankValveOpen && !tankFull;
              } else {
                const allFull = Object.keys(INITIAL_LEVELS).every(id => (levels[id] ?? 0) >= 100);
                shouldFlow = flowing && !allFull;
              }
            }
          }
          // Inlet pipes — normal (forward) animation direction
          applyPipeFlow(graph.getCell(pipeId), shouldFlow, flowVal, false);
        });

        // Header pipe
        const allFull = Object.keys(INITIAL_LEVELS).every(id => (levels[id] ?? 0) >= 100);
        applyPipeFlow(
          graph.getCell('header-pipe-main'),
          flowing && masterOpen && !allFull,
          flowVal,
          false // inlet direction
        );

      } else if (isOutlet) {
        // OUTLET: tanks → distribution network
        (PIPE_GROUPS[fmId] || []).forEach(pipeId => {
          const linkedTank = BRANCH_PIPE_TO_TANK[pipeId];
          // Stop animating outlet pipe when the tank is EMPTY (≤ 0 %).
          // (Previously this incorrectly used "tankFull" which caused reversed behaviour.)
          const tankEmpty = linkedTank ? (levels[linkedTank] ?? 0) <= 0 : false;
          // Outlet pipes use REVERSED animation — water appears to leave the tank.
          applyPipeFlow(graph.getCell(pipeId), flowing && !tankEmpty, flowVal, true);
        });
      }
    });
  }, [flows, levels, valveStates]);

  // ── Initial JointJS setup (runs once) ────────────────────────────────────────
  useEffect(() => {
    if (!paperRef.current) return;

    const styleTag = document.createElement('style');
    styleTag.textContent = `
      /* ── Forward flow: dashes scroll toward the tank (inlet) ── */
      @keyframes flowAnimation {
        0%   { stroke-dashoffset: 24; }
        100% { stroke-dashoffset:  0; }
      }
      /* ── Reverse flow: dashes scroll away from the tank (outlet) ── */
      @keyframes flowAnimationReverse {
        0%   { stroke-dashoffset:  0; }
        100% { stroke-dashoffset: 24; }
      }
      .joint-cell:not([data-type="html.GLSRTank"]):not([data-type="html.OHTank"]) .joint-port > * {
        display: none !important; visibility: hidden !important; opacity: 0 !important;
      }
      .joint-cell:not([data-type="html.GLSRTank"]):not([data-type="html.OHTank"]) .joint-port-body {
        display: none !important; visibility: hidden !important; opacity: 0 !important;
      }
      .zone-link-label {
        cursor: pointer !important;
        text-decoration: underline;
        fill: #38b2f8 !important;
      }
      .zone-link-label:hover { fill: #64b5f6 !important; }
    `;
    document.head.appendChild(styleTag);

    const defs = config.elementDefinitions;

    const registerElement = (type, def) => {
      joint.shapes.html = joint.shapes.html || {};
      const markup = def.markup?.map(m => ({
        tagName: m.tagName,
        selector: m.selector,
        ...(m.attributes ? { attributes: m.attributes } : {}),
      })) || [];
      joint.shapes.html[type] = joint.dia.Element.define(
        `html.${type}`,
        { attrs: JSON.parse(JSON.stringify(def.attrs || {})), ports: def.ports || {} },
        { markup }
      );
    };

    const registerLink = (type, def) => {
      joint.shapes.html = joint.shapes.html || {};
      const selectors = def.markup?.map(m => m.selector).filter(Boolean) || ['line'];
      const baseAttrs = JSON.parse(JSON.stringify(def.attrs || {}));
      selectors.forEach(sel => {
        baseAttrs[sel] = { ...(baseAttrs[sel] || {}), connection: true, fill: 'none' };
      });
      const markup = def.markup?.map(m => ({
        tagName: m.tagName,
        selector: m.selector,
        ...(m.attributes ? { attributes: m.attributes } : {}),
      })) || [{ tagName: 'path', selector: 'line' }];
      joint.shapes.html[type] = joint.dia.Link.define(
        `html.${type}`,
        {
          attrs: baseAttrs,
          router:    def.router    || { name: 'manhattan' },
          connector: def.connector || { name: 'rounded' },
          z: def.z ?? -1,
        },
        { markup }
      );
    };

    Object.entries(defs).forEach(([type, def]) => {
      if (def.type === 'link') registerLink(type, def);
      else registerElement(type, def);
    });

    const graph = new joint.dia.Graph({}, { cellNamespace: joint.shapes });
    graphRef.current = graph;

    const pw = containerRef.current?.offsetWidth  || PAPER_W_DEFAULT;
    const ph = containerRef.current?.offsetHeight || PAPER_H_DEFAULT;

    const paper = new joint.dia.Paper({
      el:         paperRef.current,
      width:      pw,
      height:     ph,
      model:      graph,
      gridSize:   config.paper?.gridSize || 18,
      drawGrid:   { name: 'dot', args: { color: '#5f6163' } },
      background: { color: BG_IDLE },
      cellViewNamespace: joint.shapes,
      async:      false,
      defaultLink: () => new joint.dia.Link(),
      validateConnection: () => false,
      interactive: cellView => {
        if (cellView.model.isLink()) {
          return { vertexAdd: false, vertexMove: false, vertexRemove: false, arrowheadMove: false };
        }
        return { elementMove: true };
      },
    });
    paperObjRef.current = paper;

    const EXCLUDED_IDS = new Set([
      'oht-new', 'wqs-new', 'fm-new', 'valve-main-new', 'header-vertical',
      'pipe-oht-to-wqs', 'pipe-wqs-to-fm', 'pipe-fm-to-valve', 'pipe-valve-to-header',
      'pump-zone1', 'valve-zone1', 'zone-1',
      'pump-zone2', 'valve-zone2', 'zone-2',
      'pump-zone3', 'valve-zone3', 'zone-3',
      'pump-zone4', 'valve-zone4', 'zone-4',
      'pump-zone5', 'valve-zone5', 'zone-5',
      'pump-zone6', 'valve-zone6', 'zone-6',
      'pipe-header-to-pump1', 'pipe-pump1-to-valve1', 'pipe-valve1-to-zone1',
      'pipe-header-to-pump2', 'pipe-pump2-to-valve2', 'pipe-valve2-to-zone2',
      'pipe-header-to-pump3', 'pipe-pump3-to-valve3', 'pipe-valve3-to-zone3',
      'pipe-header-to-pump4', 'pipe-pump4-to-valve4', 'pipe-valve4-to-zone4',
      'pipe-header-to-pump5', 'pipe-pump5-to-valve5', 'pipe-valve5-to-zone5',
      'pipe-header-to-pump6', 'pipe-pump6-to-valve6', 'pipe-valve6-to-zone6',
    ]);

    const elementCells = [];
    const linkCells    = [];

    config.instances.forEach(instance => {
      if (EXCLUDED_IDS.has(instance.id)) return;
      const def        = defs[instance.type];
      if (!def) { console.warn(`No def: ${instance.type}`); return; }
      const ShapeClass = joint.shapes.html[instance.type];
      if (!ShapeClass) { console.warn(`No shape: ${instance.type}`); return; }

      if (def.type === 'link') {
        const instanceAttrs = JSON.parse(JSON.stringify(instance.attrs || {}));
        const selectors     = def.markup?.map(m => m.selector).filter(Boolean) || ['line'];
        selectors.forEach(sel => {
          instanceAttrs[sel] = { ...(instanceAttrs[sel] || {}), connection: true, fill: 'none' };
        });
        if (instanceAttrs.liquid) {
          instanceAttrs.liquid.opacity = 0;
          instanceAttrs.liquid.style   = { animation: 'none' };
        }
        linkCells.push(new ShapeClass({
          id:        instance.id,
          source:    instance.source,
          target:    instance.target,
          vertices:  instance.vertices || [],
          router:    instance.router    || def.router    || { name: 'manhattan' },
          connector: instance.connector || def.connector || { name: 'rounded' },
          attrs:     instanceAttrs,
          z:         instance.z ?? def.z ?? -1,
        }));
      } else {
        const portItems  = instance.ports?.items || def.ports?.items || [];
        const portGroups = def.ports?.groups || {};
        const isTank     = instance.type === 'GLSRTank' || instance.type === 'OHTank';

        const resolvedPortGroups = JSON.parse(JSON.stringify(portGroups));
        if (!isTank) {
          Object.values(resolvedPortGroups).forEach(group => {
            if (group.attrs) {
              Object.keys(group.attrs).forEach(sel => {
                group.attrs[sel] = {
                  ...group.attrs[sel],
                  fill: 'none', stroke: 'none', strokeWidth: 0,
                  opacity: 0, visibility: 'hidden', magnet: false, cursor: 'default',
                };
              });
            }
          });
        }

        const ports = {
          groups: resolvedPortGroups,
          items: portItems.map(port => {
            const groupDef       = resolvedPortGroups[port.group] || {};
            const basePortAttrs  = groupDef.attrs || {};
            const mergedPortAttrs = {};
            Object.keys(basePortAttrs).forEach(key => {
              mergedPortAttrs[key] = {
                ...basePortAttrs[key],
                ...(isTank ? { magnet: true } : {}),
                ...(port.attrs?.[key] || {}),
              };
            });
            if (!Object.keys(mergedPortAttrs).length) {
              mergedPortAttrs.portBody = isTank
                ? { magnet: true, fill: '#A9A9A9', stroke: '#5a5a5a', strokeWidth: 2, width: 8, height: 8 }
                : { magnet: false, fill: 'none', stroke: 'none', strokeWidth: 0, width: 8, height: 8, opacity: 0, visibility: 'hidden' };
            }
            return {
              id:    port.id,
              group: port.group,
              args:  port.args || groupDef.position?.args || {},
              attrs: mergedPortAttrs,
            };
          }),
        };

        const deepMergedAttrs = JSON.parse(JSON.stringify(def.attrs || {}));
        Object.entries(instance.attrs || {}).forEach(([sel, overrides]) => {
          deepMergedAttrs[sel] = { ...(deepMergedAttrs[sel] || {}), ...overrides };
        });

        const initLevel = INITIAL_LEVELS[instance.id];
        if (initLevel !== undefined && (instance.type === 'GLSRTank' || instance.type === 'OHTank')) {
          const { y, height, fill, surfaceY } = liquidAttrs(initLevel);
          deepMergedAttrs.liquid        = { ...deepMergedAttrs.liquid,        y, height, fill };
          deepMergedAttrs.liquidSurface = { ...deepMergedAttrs.liquidSurface, y: surfaceY };
          deepMergedAttrs.levelIndicator = { ...deepMergedAttrs.levelIndicator, text: `${Math.round(initLevel)}%` };
        }

        if (instance.id === 'conic-tank-001') {
          const { x, y, width, height, fill, opacity, surfaceY } = conicLiquidAttrs(75);
          deepMergedAttrs.liquid        = { ...deepMergedAttrs.liquid,        x, y, width, height, fill, opacity };
          deepMergedAttrs.liquidSurface = { ...deepMergedAttrs.liquidSurface, y: surfaceY };
          deepMergedAttrs.levelIndicator = { ...deepMergedAttrs.levelIndicator, text: `75%` };
        }

        if (instance.type === 'HeaderPipe' && deepMergedAttrs.liquid) {
          deepMergedAttrs.liquid.opacity = 0;
          deepMergedAttrs.liquid.style   = { animation: 'none' };
        }

        elementCells.push(new ShapeClass({
          id:       instance.id,
          position: instance.position || { x: 0, y: 0 },
          size:     instance.size     || def.size || { width: 60, height: 40 },
          angle:    instance.angle    ?? 0,
          attrs:    deepMergedAttrs,
          ports,
          z:        instance.z ?? def.z ?? 1,
        }));
      }
    });

    graph.addCells(elementCells);
    graph.addCells(linkCells);

    // Zone click handler
    setTimeout(() => {
      const svgRoot = paperRef.current?.querySelector('svg');
      if (!svgRoot) return;

      Object.keys(FLOWMETER_ZONE_LABELS).forEach(fmId => {
        const cell = graph.getCell(fmId);
        if (!cell) return;
        const view = paper.findViewByModel(cell);
        if (!view) return;
        const textEl = view.el.querySelector('[joint-selector="meterLabelLine1"]');
        if (textEl) textEl.classList.add('zone-link-label');
      });

      const handleSvgPointerUp = (e) => {
        let node = e.target;
        while (node && node !== svgRoot) {
          const modelId = node.getAttribute?.('model-id');
          if (modelId && FLOWMETER_ZONE_LABELS[modelId]) {
            e.stopPropagation();
            const meta = ZONE_INFO_MAP[modelId];
            if (meta) setTapZoneInfo({ ...meta, _fmId: modelId });
            return;
          }
          if (node.classList?.contains('zone-link-label')) {
            let parent = node.parentElement;
            while (parent && parent !== svgRoot) {
              const mid = parent.getAttribute?.('model-id');
              if (mid && FLOWMETER_ZONE_LABELS[mid]) {
                e.stopPropagation();
                const meta = ZONE_INFO_MAP[mid];
                if (meta) setTapZoneInfo({ ...meta, _fmId: mid });
                return;
              }
              parent = parent.parentElement;
            }
            e.stopPropagation();
            return;
          }
          node = node.parentElement;
        }
      };
      svgRoot.addEventListener('pointerup', handleSvgPointerUp);
      svgRoot._zoneClickHandler = handleSvgPointerUp;
    }, 400);

    // Fit viewport
    setTimeout(() => {
      graph.getLinks().forEach(link => {
        const view = paper.findViewByModel(link);
        if (view) { view.update(); view.requestConnectionUpdate(); }
      });
      try {
        const els = graph.getElements();
        if (!els.length) return;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        els.forEach(el => {
          const { x, y }          = el.position();
          const { width, height } = el.size();
          minX = Math.min(minX, x);      minY = Math.min(minY, y);
          maxX = Math.max(maxX, x + width); maxY = Math.max(maxY, y + height);
        });
        const padding  = 40;
        const contentW = maxX - minX + padding * 2;
        const contentH = maxY - minY + padding * 2;
        const scale    = Math.min(Math.max(Math.min(pw / contentW, ph / contentH), 0.05), 1.5);
        paper.scale(scale);
        paper.translate(
          (padding - minX) * scale + (pw - contentW * scale) / 2,
          (padding - minY) * scale + (ph - contentH * scale) / 2
        );
      } catch (e) {
        console.warn('Viewport fit error:', e.message);
      }
    }, 300);

    return () => {
      graph.clear();
      document.head.removeChild(styleTag);
      const svgRoot = paperRef.current?.querySelector('svg');
      if (svgRoot?._zoneClickHandler) {
        svgRoot.removeEventListener('pointerup', svgRoot._zoneClickHandler);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Tap overlay
  if (tapZoneInfo) {
    const liveLevel  = levels[tapZoneInfo.tankRef] ?? 50;
    const liveFlow   = flows[tapZoneInfo.fmRef]    ?? 0;
    const zoneInfoForTap = { ...tapZoneInfo, initialLevel: liveLevel, initialFlow: liveFlow };
    return (
      <div style={{ position:'relative', width:'100%', height:'100%', background:'#0d1b2e' }}>
        <button onClick={() => setTapZoneInfo(null)} style={{
          position:'absolute', top:14, left:14, zIndex:9999,
          padding:'7px 18px', borderRadius:6, border:'1px solid #1e3a5c',
          background:'#132236', color:'#64b5f6', fontWeight:700, fontSize:12,
          cursor:'pointer', fontFamily:"'Courier New', monospace", letterSpacing:'.05em',
        }}>
          ← Back to SCADA
        </button>
        <div style={{ position:'absolute', top:14, left:'50%', transform:'translateX(-50%)', zIndex:9999, display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:13, fontWeight:700, color:'#38b2f8', fontFamily:"'Courier New',monospace", letterSpacing:'.06em', textTransform:'uppercase' }}>{zoneInfoForTap.zoneName}</span>
          <span style={{ fontSize:10, color:'#64b5f6', fontFamily:"'Courier New',monospace" }}>— {zoneInfoForTap.tankId} · {zoneInfoForTap.tankLabel}</span>
        </div>
        <Tap zoneInfo={zoneInfoForTap} />
      </div>
    );
  }

  return (
    <div style={{
      display:'flex', flexDirection:'column', width:'100%', height:'100%',
      overflow:'hidden', backgroundColor: bgColor,
      transition:'background-color 0.6s ease',
      fontFamily:"'Courier New', monospace",
    }}>
      <TopStatusBar
        levels={levels}
        flows={flows}
        conicLevel={conicLevel}
        valveStates={valveStates}
      />
      <div ref={containerRef} style={{ flex:1, overflow:'hidden', backgroundColor:'transparent' }}>
        <div ref={paperRef} style={{ width:'100%', height:'100%', cursor:'default', userSelect:'none' }} />
      </div>
    </div>
  );
}

export default JsonDisplay;