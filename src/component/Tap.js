
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as joint from '@joint/core';
import config from '../config/complete-scada-config.json';

// ─── Target instances ─────────────────────────────────────────────────────────
const TARGET_IDS = new Set([
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

// All link-type pipe IDs in the Tap network (full path: OHT → zones)
const ALL_LINK_PIPE_IDS = [
  'pipe-oht-to-wqs', 'pipe-wqs-to-fm', 'pipe-fm-to-valve', 'pipe-valve-to-header',
  'pipe-header-to-pump1', 'pipe-pump1-to-valve1', 'pipe-valve1-to-zone1',
  'pipe-header-to-pump2', 'pipe-pump2-to-valve2', 'pipe-valve2-to-zone2',
  'pipe-header-to-pump3', 'pipe-pump3-to-valve3', 'pipe-valve3-to-zone3',
  'pipe-header-to-pump4', 'pipe-pump4-to-valve4', 'pipe-valve4-to-zone4',
  'pipe-header-to-pump5', 'pipe-pump5-to-valve5', 'pipe-valve5-to-zone5',
  'pipe-header-to-pump6', 'pipe-pump6-to-valve6', 'pipe-valve6-to-zone6',
];

// ─── Constants ────────────────────────────────────────────────────────────────
// Must match LargeOHTank's tankBody.height in complete-scada-config.json
const TANK_BODY_HEIGHT   = 120;
const BG_IDLE            = '#0d1b2e';
const BG_FLOWING         = '#0f2240';
const PIPE_COLOR_IDLE    = '#2a4a6a';
const PIPE_COLOR_FLOWING = '#38b2f8';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function flowSpeed(val) {
  if (val <= 0) return null;
  if (val < 40) return '2.4s';
  if (val < 80) return '1.2s';
  return '0.7s';
}

// For JointJS Pipe *link* cells
function applyPipeFlow(cell, flowing, flowVal) {
  if (!cell) return;
  const speed = flowSpeed(flowVal);
  cell.attr('line/stroke', flowing ? PIPE_COLOR_FLOWING : PIPE_COLOR_IDLE);
  if (flowing && speed) {
    cell.attr('liquid/opacity',         1);
    cell.attr('liquid/strokeDasharray', '8,16');
    cell.attr('liquid/style', { animation: `flowAnimation ${speed} linear infinite` });
  } else {
    cell.attr('liquid/opacity',         0);
    cell.attr('liquid/strokeDasharray', 'none');
    cell.attr('liquid/style',           { animation: 'none' });
  }
}

// For the VerticalHeaderPipe *element* — drives pipeBody fill + injected <line>
function applyVerticalHeaderFlow(cell, flowing, flowVal) {
  if (!cell) return;
  const speed = flowSpeed(flowVal);

  // Match pipeBody bg colour exactly to other pipe link colours
  cell.attr('pipeBody/fill',        flowing ? PIPE_COLOR_FLOWING : PIPE_COLOR_IDLE);
  cell.attr('pipeBody/stroke',      flowing ? PIPE_COLOR_FLOWING : PIPE_COLOR_IDLE);
  cell.attr('pipeBody/strokeWidth', 0); // no border — same as flat pipe links

  // liquid <line>: bright white-blue dashes scrolling over the pipe body
  if (flowing && speed) {
    cell.attr('liquid/opacity',         1);
    cell.attr('liquid/stroke',          '#0f65ba'); // light sky-blue dash — matches pipe liquid dashes
    cell.attr('liquid/strokeDasharray', '8,16');
    cell.attr('liquid/style', { animation: `flowAnimation ${speed} linear infinite` });
  } else {
    cell.attr('liquid/opacity',         0);
    cell.attr('liquid/strokeDasharray', 'none');
    cell.attr('liquid/style',           { animation: 'none' });
  }
}

function liquidAttrs(levelPct) {
  const pct   = Math.max(0, Math.min(100, levelPct)) / 100;
  const h     = Math.round(TANK_BODY_HEIGHT * pct);
  const y     = TANK_BODY_HEIGHT - h;
  const color = pct < 0.25 ? '#e74c3c' : '#38b2f8';
  return { y, height: h, fill: color, surfaceY: y };
}

function flowColor(val) {
  if (val <= 0) return '#4a7a9b';
  if (val < 40) return '#f5a623';
  if (val < 80) return '#4caf50';
  return '#38b2f8';
}

// ─── Control Panel ─────────────────────────────────────────────────────────────
function BranchControlPanel({ level, flow, zoneInfo, onLevelChange, onFlowChange }) {
  const barCol = level < 25 ? '#f44336' : '#38b2f8';

  const Slider = ({ value, min, max, step, onChange, color }) => {
    const pct = ((value - min) / (max - min)) * 100;
    return (
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{
          width: '100%', height: 3, borderRadius: 2,
          outline: 'none', cursor: 'pointer',
          WebkitAppearance: 'none', appearance: 'none',
          background: `linear-gradient(to right,${color} ${pct}%,#1e3a5c ${pct}%)`,
        }}
      />
    );
  };

  return (
    <div style={{
      width: '100%', height: '100%', background: '#0d1b2e',
      borderLeft: '1px solid #1e3a5c', display: 'flex', flexDirection: 'column',
      fontFamily: "'Courier New',monospace", overflow: 'hidden', color: '#e8f4ff',
    }}>
      {/* ── Header ── */}
      <div style={{
        background: '#0a1628', borderBottom: '1px solid #1e3a5c',
        color: '#7eabcb', padding: '10px 14px', flexShrink: 0,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: 11, letterSpacing: '.07em', textTransform: 'uppercase' }}>
            {zoneInfo?.zoneName || 'Zone Distribution'}
          </span>
          {zoneInfo?.tankLabel && (
            <div style={{ fontSize: 9, color: '#4a7a9b', marginTop: 2 }}>{zoneInfo.tankLabel}</div>
          )}
        </div>
        <span style={{
          fontSize: 9, padding: '3px 9px', borderRadius: 20, fontWeight: 700,
          background: flow > 0 ? '#1a2e1a' : '#2a1515',
          color:      flow > 0 ? '#4caf50' : '#f44336',
          border: `1px solid ${flow > 0 ? '#4caf5044' : '#f4433644'}`,
        }}>
          {flow > 0 ? 'FLOWING' : 'IDLE'}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>

        {/* ── Tank Level card ── */}
        <div style={{
          marginBottom: 12, padding: '10px 12px', borderRadius: 8,
          background: '#132236', border: `1px solid ${barCol}44`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: 9, color: '#4a7a9b', textTransform: 'uppercase', letterSpacing: '.07em' }}>
                {zoneInfo?.tankId || 'OHT-New'}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: barCol, lineHeight: 1.1 }}>
                {Math.round(level)}<span style={{ fontSize: 10, marginLeft: 2 }}>%</span>
              </div>
            </div>
            <span style={{
              fontSize: 9, padding: '2px 8px', borderRadius: 20, alignSelf: 'flex-start',
              background: level < 25 ? '#2a1515' : '#1e3a5c',
              color:      level < 25 ? '#f44336' : '#64b5f6',
              border: `1px solid ${level < 25 ? '#f4433644' : '#2a5a8c'}`,
              fontWeight: 600,
            }}>
              {level < 25 ? 'CRITICAL' : 'Normal'}
            </span>
          </div>
          {/* Fill bar */}
          <div style={{ background: '#0a1628', borderRadius: 3, height: 5, marginBottom: 8, overflow: 'hidden' }}>
            <div style={{ width: `${level}%`, height: '100%', background: barCol, borderRadius: 3, transition: 'width 0.4s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 9, color: '#4a7a9b', textTransform: 'uppercase', letterSpacing: '.05em' }}>Level</span>
            <span style={{ fontSize: 9, color: barCol, fontWeight: 700 }}>{Math.round(level)}%</span>
          </div>
          <Slider value={level} min={0} max={100} step={1} onChange={onLevelChange} color={barCol} />
        </div>

        {/* ── Flow card ── */}
        <div style={{
          marginBottom: 12, padding: '10px 12px', borderRadius: 8,
          background: '#132236',
          border: `1px solid ${flow > 0 ? '#38b2f844' : '#1e3a5c'}`,
          transition: 'border-color 0.4s',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 9, color: '#4a7a9b', textTransform: 'uppercase', letterSpacing: '.07em' }}>
                {zoneInfo?.fmId ? `FM: ${zoneInfo.fmId}` : 'Main Flow'}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: flow > 0 ? '#38b2f8' : '#4a7a9b', lineHeight: 1.1 }}>
                {flow.toFixed(1)}<span style={{ fontSize: 10, marginLeft: 3 }}>m³/h</span>
              </div>
            </div>
            <span style={{
              fontSize: 9, padding: '2px 8px', borderRadius: 20,
              background: flow > 0 ? '#1e3a5c' : '#1a1a2a',
              color:      flow > 0 ? '#64b5f6' : '#4a7a9b',
              border: '1px solid #1e3a5c',
            }}>
              {flow > 0 ? 'Active' : 'Stopped'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 9, color: '#4a7a9b', textTransform: 'uppercase', letterSpacing: '.05em' }}>Flow rate</span>
            <span style={{ fontSize: 9, color: flowColor(flow), fontWeight: 700 }}>{flow.toFixed(1)} m³/h</span>
          </div>
          <Slider value={flow} min={0} max={150} step={0.5} onChange={onFlowChange} color="#38b2f8" />
        </div>

        {/* ── Flow Path card ── */}
        <div style={{
          padding: '8px 10px', borderRadius: 8,
          background: '#0a1628', border: '1px solid #1e3a5c',
        }}>
          <div style={{ fontSize: 9, color: '#4a7a9b', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>
            Flow Path
          </div>
          {[
            'OHT Tank', 'Sensor (WQS)', 'Flowmeter',
            'Main Valve', 'Vert. Header', 'Zone Pumps ×6',
            'Zone Valves ×6', 'Street Zones',
          ].map((label, i, arr) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: i < arr.length - 1 ? 4 : 0 }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                background: flow > 0 ? '#38b2f8' : '#2a4a6a',
                boxShadow:  flow > 0 ? '0 0 5px #38b2f888' : 'none',
                transition: 'background 0.3s, box-shadow 0.3s',
              }} />
              <span style={{ fontSize: 9, color: flow > 0 ? '#a8d8f8' : '#4a7a9b', transition: 'color 0.3s' }}>
                {label}
              </span>
              {i < arr.length - 1 && (
                <span style={{ marginLeft: 'auto', fontSize: 9, color: flow > 0 ? '#38b2f8' : '#2a4a6a' }}>↓</span>
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function Tap({ zoneInfo }) {
  const paperRef     = useRef(null);
  const containerRef = useRef(null);
  const graphRef     = useRef(null);
  const paperObjRef  = useRef(null);
  const depletionRef = useRef(null);

  const [level,   setLevel]   = useState(zoneInfo?.initialLevel ?? 50);
  const [flow,    setFlow]    = useState(zoneInfo?.initialFlow  ?? 60);
  const [bgColor, setBgColor] = useState(BG_IDLE);

  const handleLevelChange = useCallback(v => setLevel(v), []);
  const handleFlowChange  = useCallback(v => setFlow(v),  []);

  // ── Background colour reacts to flow ────────────────────────────────────────
  useEffect(() => {
    const newBg = flow > 0 ? BG_FLOWING : BG_IDLE;
    setBgColor(newBg);
    if (paperObjRef.current) paperObjRef.current.drawBackground({ color: newBg });
  }, [flow]);

  // ── Flow depletes tank level (slower, per‑minute rate) ─────────────────────
  // Flow is in m³/h. New rate: 10 % per minute when flow = 100 m³/h
  useEffect(() => {
    if (depletionRef.current) clearInterval(depletionRef.current);
    if (flow <= 0) return;
    // depPerTick = flow / 3000   (for 200 ms interval → 10 %/min at flow=100)
    const depPerTick = flow / 3000;
    depletionRef.current = setInterval(() => {
      setLevel(prev => {
        const newLevel = Math.max(0, prev - depPerTick);
        // If tank becomes empty, stop the flow
        if (newLevel <= 0) {
          setFlow(0);
        }
        return newLevel;
      });
    }, 200);
    return () => clearInterval(depletionRef.current);
  }, [flow]);

  // ── Sync OHT tank liquid → JointJS ──────────────────────────────────────────
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    const tank = graph.getCell('oht-new');
    if (!tank) return;
    const { y, height, fill, surfaceY } = liquidAttrs(level);
    tank.attr('liquid/y',            y);
    tank.attr('liquid/height',       height);
    tank.attr('liquid/fill',         fill);
    tank.attr('liquidSurface/y',     surfaceY);
    tank.attr('levelIndicator/text', `${Math.round(level)}%`);
  }, [level]);

  // ── Sync flow → pipes + vertical header + flowmeter ─────────────────────────
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    const flowing = flow > 0;

    // 1. Flowmeter display
    const fm = graph.getCell('fm-new');
    if (fm) {
      const fc = flowColor(flow);
      fm.attr('flowValue/text',     flow.toFixed(1));
      fm.attr('flowValue/fill',     fc);
      fm.attr('flowIndicator/fill', fc);
      fm.attr('statusLED/fill',     flowing ? '#32CD32' : '#e74c3c');
      fm.attr('unitLabel/text',     'm³/h');
      if (zoneInfo?.fmId)    fm.attr('meterLabelLine1/text', zoneInfo.fmId);
      if (zoneInfo?.zoneName) fm.attr('meterLabelLine2/text', zoneInfo.zoneName);
    }

    // 2. OHT tank zone labels
    const ohtTank = graph.getCell('oht-new');
    if (ohtTank && zoneInfo?.tankId) {
      ohtTank.attr('tankLabel/text', zoneInfo.tankId);
      ohtTank.attr('tankId/text',    zoneInfo.tankLabel || '');
    }

    // 3. All Pipe link cells
    ALL_LINK_PIPE_IDS.forEach(id =>
      applyPipeFlow(graph.getCell(id), flowing, flow)
    );

    // 4. Vertical header pipe element (pipeBody + injected liquid line)
    applyVerticalHeaderFlow(graph.getCell('header-vertical'), flowing, flow);

  }, [flow, zoneInfo]);

  // ── One-time JointJS setup ───────────────────────────────────────────────────
  useEffect(() => {
    if (!paperRef.current) return;
    const vhDef = config.elementDefinitions['VerticalHeaderPipe'];
    if (vhDef && !vhDef.markup.find(m => m.selector === 'liquid')) {
      vhDef.markup.push({ tagName: 'line', selector: 'liquid' });
     vhDef.attrs['liquid'] = {
        x1: 10, y1: -300,
        x2: 10, y2: 500,
        stroke:          PIPE_COLOR_IDLE,
        strokeWidth:     6,
        strokeLinecap:   'butt',
        strokeDasharray: 'none',
        opacity:         0,
        style:           { animation: 'none' },
      };
    }

    // CSS: keyframes for all flow animations (pipes + vertical header line)
    const styleTag = document.createElement('style');
    styleTag.textContent = `
      @keyframes flowAnimation {
        0%   { stroke-dashoffset: 24; }
        100% { stroke-dashoffset:  0; }
      }
      /* hide all port circles by default */
      .joint-port-body { display: none !important; }
      /* keep the outlet port visible on the OHT tank only */
      [model-id="oht-new"] [port="outlet"] .joint-port-body { display: block !important; }
    `;
    document.head.appendChild(styleTag);

    const defs = config.elementDefinitions;

    const registerElement = (type, def) => {
      joint.shapes.html = joint.shapes.html || {};
      const markup = def.markup?.map(m => ({
        tagName: m.tagName, selector: m.selector,
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
        tagName: m.tagName, selector: m.selector,
        ...(m.attributes ? { attributes: m.attributes } : {}),
      })) || [{ tagName: 'path', selector: 'line' }];
      joint.shapes.html[type] = joint.dia.Link.define(
        `html.${type}`,
        {
          attrs:     baseAttrs,
          router:    def.router    || { name: 'manhattan' },
          connector: def.connector || { name: 'rounded' },
          z:         def.z ?? -1,
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

    const getContainerSize = () => ({
      pw: containerRef.current?.offsetWidth  || 800,
      ph: containerRef.current?.offsetHeight || 600,
    });
    const { pw, ph } = getContainerSize();

    const paper = new joint.dia.Paper({
      el:                 paperRef.current,
      width:              pw,
      height:             ph,
      model:              graph,
      gridSize:           config.paper?.gridSize || 10,
      drawGrid:           { name: 'dot', args: { color: '#1e3a5c' } },
      background:         { color: BG_IDLE },
      cellViewNamespace:  joint.shapes,
      async:              false,
      defaultLink:        () => new joint.dia.Link(),
      validateConnection: () => false,
      interactive: cellView => {
        if (cellView.model.isLink()) {
          return { vertexAdd: false, vertexMove: false, vertexRemove: false, arrowheadMove: false };
        }
        return { elementMove: true };
      },
    });
    paperObjRef.current = paper;

    // Closure-safe snapshots of initial values
    const initLevel = zoneInfo?.initialLevel ?? 50;
    const initFlow  = zoneInfo?.initialFlow  ?? 60;

    const branchInstances = config.instances.filter(inst => TARGET_IDS.has(inst.id));
    const elementCells = [];
    const linkCells    = [];

    branchInstances.forEach(instance => {
      const def = defs[instance.type];
      if (!def) { console.warn(`No def: ${instance.type}`); return; }
      const ShapeClass = joint.shapes.html[instance.type];
      if (!ShapeClass) { console.warn(`No shape: ${instance.type}`); return; }

      if (def.type === 'link') {
        // ── Pipe link cell ───────────────────────────────────────────────────
        const instanceAttrs = JSON.parse(JSON.stringify(instance.attrs || {}));
        const selectors = def.markup?.map(m => m.selector).filter(Boolean) || ['line'];
        selectors.forEach(sel => {
          instanceAttrs[sel] = { ...(instanceAttrs[sel] || {}), connection: true, fill: 'none' };
        });
        // All pipes start idle; flow effect is applied after addCells
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
        // ── Element cell ─────────────────────────────────────────────────────
        const portItems   = instance.ports?.items || def.ports?.items || [];
        const portGroups  = def.ports?.groups || {};
        const isOhtTank   = instance.id === 'oht-new';
        const resolvedGroups = JSON.parse(JSON.stringify(portGroups));

        Object.entries(resolvedGroups).forEach(([groupName, group]) => {
          const keepVisible = isOhtTank && groupName === 'out';
          if (group.attrs) {
            Object.keys(group.attrs).forEach(sel => {
              group.attrs[sel] = {
                ...group.attrs[sel],
                magnet:      keepVisible,
                fill:        keepVisible ? (group.attrs[sel].fill   || '#FFFFFF') : 'none',
                stroke:      keepVisible ? (group.attrs[sel].stroke || '#1E3A5F') : 'none',
                strokeWidth: keepVisible ? (group.attrs[sel].strokeWidth ?? 2)    : 0,
                opacity:     keepVisible ? 1 : 0,
                visibility:  keepVisible ? 'visible' : 'hidden',
                cursor:      keepVisible ? 'pointer' : 'default',
              };
            });
          }
        });

        const ports = {
          groups: resolvedGroups,
          items: portItems.map(port => {
            const groupDef        = resolvedGroups[port.group] || {};
            const basePortAttrs   = groupDef.attrs || {};
            const keepVisible     = isOhtTank && port.group === 'out';
            const mergedPortAttrs = {};
            Object.keys(basePortAttrs).forEach(key => {
              mergedPortAttrs[key] = {
                ...basePortAttrs[key],
                magnet: keepVisible,
                ...(port.attrs?.[key] || {}),
              };
            });
            if (!Object.keys(mergedPortAttrs).length) {
              mergedPortAttrs.portBody = keepVisible
                ? { magnet: true,  fill: '#FFFFFF', stroke: '#1E3A5F', strokeWidth: 2, width: 8, height: 8 }
                : { magnet: false, fill: 'none',    stroke: 'none',    strokeWidth: 0, width: 8, height: 8,
                    opacity: 0, visibility: 'hidden' };
            }
            return {
              id:    port.id,
              group: port.group,
              args:  port.args || groupDef.position?.args || {},
              attrs: mergedPortAttrs,
            };
          }),
        };

        const mergedAttrs = JSON.parse(JSON.stringify(def.attrs || {}));
        Object.entries(instance.attrs || {}).forEach(([sel, overrides]) => {
          mergedAttrs[sel] = { ...(mergedAttrs[sel] || {}), ...overrides };
        });

        // OHT tank — zone-specific initial level + labels
        if (instance.id === 'oht-new') {
          const { y, height, fill, surfaceY } = liquidAttrs(initLevel);
          mergedAttrs.liquid         = { ...mergedAttrs.liquid,         y, height, fill };
          mergedAttrs.liquidSurface  = { ...mergedAttrs.liquidSurface,  y: surfaceY };
          mergedAttrs.levelIndicator = { ...mergedAttrs.levelIndicator, text: `${Math.round(initLevel)}%` };
          if (zoneInfo?.tankId)    mergedAttrs.tankLabel = { ...mergedAttrs.tankLabel, text: zoneInfo.tankId };
          if (zoneInfo?.tankLabel) mergedAttrs.tankId    = { ...mergedAttrs.tankId,    text: zoneInfo.tankLabel };
        }

        // Flowmeter — zone-specific labels + initial flow display
        if (instance.id === 'fm-new') {
          if (zoneInfo?.fmId)    mergedAttrs.meterLabelLine1 = { ...mergedAttrs.meterLabelLine1, text: zoneInfo.fmId };
          if (zoneInfo?.zoneName) mergedAttrs.meterLabelLine2 = { ...mergedAttrs.meterLabelLine2, text: zoneInfo.zoneName };
          const fc = flowColor(initFlow);
          mergedAttrs.flowValue     = { ...mergedAttrs.flowValue,     text: initFlow.toFixed(1), fill: fc };
          mergedAttrs.flowIndicator = { ...mergedAttrs.flowIndicator, fill: fc };
          mergedAttrs.statusLED     = { ...mergedAttrs.statusLED,     fill: initFlow > 0 ? '#32CD32' : '#e74c3c' };
          mergedAttrs.unitLabel     = { ...mergedAttrs.unitLabel,     text: 'm³/h' };
        }

        // Vertical header pipe — set initial pipeBody colour + liquid line state
        if (instance.id === 'header-vertical') {
          const flowing = initFlow > 0;
          const speed   = flowSpeed(initFlow);
          mergedAttrs.pipeBody = {
            ...mergedAttrs.pipeBody,
            fill:        flowing ? PIPE_COLOR_FLOWING : PIPE_COLOR_IDLE,
            stroke:      flowing ? PIPE_COLOR_FLOWING : PIPE_COLOR_IDLE,
            strokeWidth: 0,
          };
          mergedAttrs.liquid = {
            ...(mergedAttrs.liquid || {}),
            x1: 10, y1: -300, x2: 10, y2: 500,
            stroke:          '#87CEEB',
            strokeWidth:     6,
            strokeLinecap:   'butt',
            strokeDasharray: flowing ? '8,16' : 'none',
            opacity:         flowing ? 1 : 0,
            style: flowing && speed
              ? { animation: `flowAnimation ${speed} linear infinite` }
              : { animation: 'none' },
          };
        }

        elementCells.push(new ShapeClass({
          id:       instance.id,
          position: instance.position || { x: 0, y: 0 },
          size:     instance.size || def.size || { width: 60, height: 40 },
          angle:    instance.angle ?? 0,
          attrs:    mergedAttrs,
          ports,
          z:        instance.z ?? def.z ?? 1,
        }));
      }
    });

    // Elements first (so ports exist when links connect)
    graph.addCells(elementCells);
    graph.addCells(linkCells);

    // Apply initial flow state to all Pipe link cells
    ALL_LINK_PIPE_IDS.forEach(id =>
      applyPipeFlow(graph.getCell(id), initFlow > 0, initFlow)
    );

    // Apply initial flow state to vertical header pipe element
    applyVerticalHeaderFlow(graph.getCell('header-vertical'), initFlow > 0, initFlow);

    // ── Fit graph ─────────────────────────────────────────────────────────────
    const VISUAL_OVERFLOW = {
      'header-vertical': { top: -300, bottom: 500, left: 0, right: 350 },
    };

    const fitGraph = () => {
      try {
        graph.getLinks().forEach(link => {
          const view = paper.findViewByModel(link);
          if (view) { view.update(); view.requestConnectionUpdate(); }
        });

        const els = graph.getElements();
        if (!els.length) return;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        els.forEach(el => {
          const { x, y }          = el.position();
          const { width, height } = el.size();
          const ov = VISUAL_OVERFLOW[el.id] || {};
          minX = Math.min(minX, x + (ov.left   ?? 0));
          minY = Math.min(minY, y + (ov.top    ?? 0));
          maxX = Math.max(maxX, x + (ov.right  ?? width));
          maxY = Math.max(maxY, y + (ov.bottom ?? height));
        });

        const PADDING  = 60;
        const contentW = maxX - minX + PADDING * 2;
        const contentH = maxY - minY + PADDING * 2;
        const { pw: cpw, ph: cph } = getContainerSize();

        paper.setDimensions(cpw, cph);
        const scale = Math.min(Math.max(Math.min(cpw / contentW, cph / contentH), 0.05), 1.5);
        paper.scale(scale);
        paper.translate(
          (PADDING - minX) * scale + (cpw - contentW * scale) / 2,
          (PADDING - minY) * scale + (cph - contentH * scale) / 2,
        );
      } catch (e) {
        console.warn('Fit error:', e.message);
      }
    };

    setTimeout(fitGraph, 100);
    setTimeout(fitGraph, 400);

    const ro = new ResizeObserver(() => fitGraph());
    if (containerRef.current) ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      graph.clear();
      document.head.removeChild(styleTag);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  return (
    <div style={{
      display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden',
      backgroundColor: bgColor, transition: 'background-color 0.6s ease',
      fontFamily: "'Courier New', monospace",
    }}>
      {/* Graph area (85%) */}
      <div ref={containerRef} style={{ width: '85%', height: '100vh', overflow: 'hidden', flexShrink: 0 }}>
        <div ref={paperRef} style={{ width: '100%', height: '100%', cursor: 'default', userSelect: 'none' }} />
      </div>

      {/* Control panel (15%) */}
      <div style={{
        width: '15%', height: '100vh', overflow: 'hidden',
        borderLeft: '1px solid #1e3a5c', flexShrink: 0,
        background: '#0d1b2e',
      }}>
        <BranchControlPanel
          level={level}
          flow={flow}
          zoneInfo={zoneInfo}
          onLevelChange={handleLevelChange}
          onFlowChange={handleFlowChange}
        />
      </div>
    </div>
  );
}
