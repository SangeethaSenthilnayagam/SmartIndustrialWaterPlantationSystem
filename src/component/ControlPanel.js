import React, { useState, useCallback } from 'react';

// ─── Exported constants (fallback defaults) ──────────────────────────────────
export const INITIAL_LEVELS = {
  'glsr-01': 70, 'glsr-02': 60, 'glsr-03': 80,
  'oht-01':  50, 'oht-02':  40, 'oht-03':  30,
};
export const INITIAL_FLOWS = {
  'flowmeter-001': 0,
  'flowmeter-glsr-01': 0, 'flowmeter-glsr-02': 0, 'flowmeter-glsr-03': 0,
  'flowmeter-oht-01':  0, 'flowmeter-oht-02':  0, 'flowmeter-oht-03':  0,
};
export const INITIAL_VALVE_STATES = {
  'valve-main-001': true,
  'valve-oht-01': true,  'valve-glsr-01': true,
  'valve-oht-02': true,  'valve-glsr-02': true,
  'valve-oht-03': true,  'valve-glsr-03': true,
};
export const CONIC_INITIAL_LEVEL = 75;

const FONT = "'Courier New', monospace";

// ─── All tanks ───────────────────────────────────────────────────────────────
const ALL_TANKS = [
  { id:'oht-01',  fm:'flowmeter-oht-01',  valveId:'valve-oht-01',  type:'OHT',  label:'OHT-01',  sub:'Kumar Swamy',  zone:'Zone-04', color:'#ef9f27' },
  { id:'oht-02',  fm:'flowmeter-oht-02',  valveId:'valve-oht-02',  type:'OHT',  label:'OHT-02',  sub:'Nearby GLSR',  zone:'Zone-07', color:'#ef9f27' },
  { id:'oht-03',  fm:'flowmeter-oht-03',  valveId:'valve-oht-03',  type:'OHT',  label:'OHT-03',  sub:'Stadium Rd',   zone:'Zone-02', color:'#ef9f27' },
  { id:'glsr-01', fm:'flowmeter-glsr-01', valveId:'valve-glsr-01', type:'GLSR', label:'GLSR-01', sub:'Gangamma',     zone:'Zone-09', color:'#378ADD' },
  { id:'glsr-02', fm:'flowmeter-glsr-02', valveId:'valve-glsr-02', type:'GLSR', label:'GLSR-02', sub:'Meher Nagara', zone:'Zone-06', color:'#378ADD' },
  { id:'glsr-03', fm:'flowmeter-glsr-03', valveId:'valve-glsr-03', type:'GLSR', label:'GLSR-03', sub:'Guttahalli',   zone:'Zone-01', color:'#378ADD' },
];

// ─── OHT SVG large ───────────────────────────────────────────────────────────
function OHTImage({ level = 50, color = '#ef9f27', size = 200 }) {
  const fillH   = Math.max(0, Math.min(1, level / 100));
  const tankH   = size * 0.44;
  const tankY   = size * 0.07;
  const fillHpx = tankH * fillH;
  const fillY   = tankY + tankH - fillHpx;
  const wc      = level < 25 ? '#e74c3c' : '#38b2f8';
  const legY    = tankY + tankH;
  const legH    = size * 0.40;
  const gap     = size * 0.21;
  const legW    = size * 0.052;
  const cx      = size / 2;
  const tw      = size * 0.56;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="coht_l"><rect x={cx-tw/2+1} y={tankY} width={tw-2} height={tankH} rx={size*0.03}/></clipPath>
        <linearGradient id="goht_l" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#1a3a5a"/>
          <stop offset="100%" stopColor="#0d2030"/>
        </linearGradient>
      </defs>
      {[-gap,0,gap].map((ox,i)=>(
        <rect key={i} x={cx+ox-legW/2} y={legY} width={legW} height={legH} rx={legW/3} fill="#3a6080" stroke="#2a4a6a" strokeWidth="0.8"/>
      ))}
      <line x1={cx-gap} y1={legY+legH*0.32} x2={cx+gap} y2={legY+legH*0.72} stroke="#2a5a7a" strokeWidth="2"/>
      <line x1={cx+gap} y1={legY+legH*0.32} x2={cx-gap} y2={legY+legH*0.72} stroke="#2a5a7a" strokeWidth="2"/>
      <ellipse cx={cx} cy={legY+legH} rx={gap+legW*1.4} ry={legW*1.1} fill="#2a5a7a"/>
      <rect x={cx-tw/2} y={tankY} width={tw} height={tankH} rx={size*0.03} fill="url(#goht_l)" stroke={color} strokeWidth="2.5"/>
      {fillHpx>0&&<rect x={cx-tw/2+1} y={fillY} width={tw-2} height={fillHpx} fill={wc} opacity="0.85" clipPath="url(#coht_l)"/>}
      {fillHpx>4&&<ellipse cx={cx} cy={fillY+2} rx={tw*0.43} ry={size*0.016} fill="white" opacity="0.25"/>}
      {[0.26,0.55,0.83].map((p,i)=>(
        <rect key={i} x={cx-tw/2} y={tankY+tankH*p-0.8} width={tw} height={1.6} fill={color} opacity="0.3" rx="1"/>
      ))}
      <ellipse cx={cx} cy={tankY} rx={tw/2} ry={size*0.058} fill="#1e4060" stroke={color} strokeWidth="2.5"/>
      <rect x={cx-size*0.028} y={tankY-size*0.085} width={size*0.056} height={size*0.09} fill="#2a5a7a" stroke={color} strokeWidth="1"/>
      <rect x={cx+tw/2-1} y={legY-size*0.04} width={size*0.11} height={size*0.032} fill="#2a5a7a" stroke={color} strokeWidth="1"/>
      <text x={cx} y={tankY+tankH*0.55+6} textAnchor="middle" fontSize={size*0.13} fontWeight="700" fill="white" opacity="0.9" fontFamily="'Courier New',monospace">
        {Math.round(level)}%
      </text>
    </svg>
  );
}

// ─── GLSR SVG large ──────────────────────────────────────────────────────────
function GLSRImage({ level = 60, color = '#378ADD', size = 200 }) {
  const fillH   = Math.max(0, Math.min(1, level / 100));
  const tw      = size * 0.78;
  const th      = size * 0.37;
  const tx      = (size - tw) / 2;
  const ty      = size * 0.30;
  const fillHpx = th * fillH;
  const fillY   = ty + th - fillHpx;
  const wc      = level < 25 ? '#e74c3c' : '#38b2f8';
  const cx      = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="cglsr_l"><rect x={tx+1} y={ty} width={tw-2} height={th}/></clipPath>
        <linearGradient id="gglsr_l" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#1a3a5a"/>
          <stop offset="100%" stopColor="#0d2030"/>
        </linearGradient>
      </defs>
      <rect x={tx-size*0.04} y={ty+th} width={tw+size*0.08} height={size*0.065} rx={size*0.012} fill="#1e3a5a"/>
      <rect x={tx-size*0.08} y={ty+th+size*0.065} width={tw+size*0.16} height={size*0.04} rx={size*0.01} fill="#162a3a" opacity="0.6"/>
      <rect x={tx} y={ty} width={tw} height={th} rx={size*0.018} fill="url(#gglsr_l)" stroke={color} strokeWidth="2.5"/>
      {fillHpx>0&&<rect x={tx+1} y={fillY} width={tw-2} height={fillHpx} fill={wc} opacity="0.85" clipPath="url(#cglsr_l)"/>}
      {fillHpx>4&&<ellipse cx={cx} cy={fillY+2} rx={tw*0.44} ry={size*0.013} fill="white" opacity="0.22"/>}
      {[0.27,0.57,0.83].map((p,i)=>(
        <rect key={i} x={tx} y={ty+th*p-0.8} width={tw} height={1.6} fill={color} opacity="0.3" rx="1"/>
      ))}
      <rect x={tx-size*0.022} y={ty-size*0.052} width={tw+size*0.044} height={size*0.06} rx={size*0.012} fill="#1e4060" stroke={color} strokeWidth="2.5"/>
      <ellipse cx={cx} cy={ty-size*0.052} rx={size*0.065} ry={size*0.025} fill="#2a5a8a" stroke={color} strokeWidth="1"/>
      <rect x={cx-size*0.02} y={ty-size*0.12} width={size*0.04} height={size*0.07} fill="#2a5a8a" stroke={color} strokeWidth="0.9"/>
      <rect x={tx+tw-size*0.07} y={ty-size*0.05} width={size*0.018} height={th+size*0.07} fill="#2a5a7a" opacity="0.6"/>
      <rect x={tx+tw-size*0.055} y={ty-size*0.05} width={size*0.018} height={th+size*0.07} fill="#2a5a7a" opacity="0.6"/>
      {[0.12,0.28,0.44,0.60,0.76].map((p,i)=>(
        <rect key={i} x={tx+tw-size*0.07} y={ty+th*p} width={size*0.055} height={1.5} fill="#2a5a7a" opacity="0.7"/>
      ))}
      <rect x={tx-size*0.12} y={ty+th*0.18} width={size*0.12} height={size*0.038} fill="#2a5a7a" stroke={color} strokeWidth="1"/>
      <rect x={tx+tw} y={ty+th*0.72} width={size*0.1} height={size*0.038} fill="#2a5a7a" stroke={color} strokeWidth="1"/>
      <text x={cx} y={ty+th*0.56+6} textAnchor="middle" fontSize={size*0.13} fontWeight="700" fill="white" opacity="0.9" fontFamily="'Courier New',monospace">
        {Math.round(level)}%
      </text>
      <line x1={tx-size*0.1} y1={ty+th+size*0.105} x2={tx+tw+size*0.1} y2={ty+th+size*0.105} stroke="#2a4a6a" strokeWidth="1.5" strokeDasharray="5,4"/>
    </svg>
  );
}

// ─── Small OHT thumbnail ─────────────────────────────────────────────────────
function OHTThumb({ level, color }) {
  const s=44, fillH=Math.max(0,Math.min(1,level/100)), tankH=s*0.44, tankY=s*0.07;
  const fillHpx=tankH*fillH, fillY=tankY+tankH-fillHpx, wc=level<25?'#e74c3c':'#38b2f8';
  const legY=tankY+tankH, legH=s*0.40, gap=s*0.21, legW=s*0.052, cx=s/2, tw=s*0.56;
  const uid = `oht_th_${color.replace('#','')}`;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <defs><clipPath id={uid}><rect x={cx-tw/2+1} y={tankY} width={tw-2} height={tankH}/></clipPath></defs>
      {[-gap,0,gap].map((ox,i)=><rect key={i} x={cx+ox-legW/2} y={legY} width={legW} height={legH} fill="#3a6080"/>)}
      <rect x={cx-tw/2} y={tankY} width={tw} height={tankH} fill="#1a3a5a" stroke={color} strokeWidth="1"/>
      {fillHpx>0&&<rect x={cx-tw/2+1} y={fillY} width={tw-2} height={fillHpx} fill={wc} opacity="0.85" clipPath={`url(#${uid})`}/>}
      <ellipse cx={cx} cy={tankY} rx={tw/2} ry={s*0.058} fill="#1e4060" stroke={color} strokeWidth="1"/>
    </svg>
  );
}

// ─── Small GLSR thumbnail ────────────────────────────────────────────────────
function GLSRThumb({ level, color }) {
  const s=44, fillH=Math.max(0,Math.min(1,level/100)), tw=s*0.78, th=s*0.37;
  const tx=(s-tw)/2, ty=s*0.30, fillHpx=th*fillH, fillY=ty+th-fillHpx, wc=level<25?'#e74c3c':'#38b2f8', cx=s/2;
  const uid = `glsr_th_${color.replace('#','')}`;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <defs><clipPath id={uid}><rect x={tx+1} y={ty} width={tw-2} height={th}/></clipPath></defs>
      <rect x={tx} y={ty} width={tw} height={th} fill="#1a3a5a" stroke={color} strokeWidth="1"/>
      {fillHpx>0&&<rect x={tx+1} y={fillY} width={tw-2} height={fillHpx} fill={wc} opacity="0.85" clipPath={`url(#${uid})`}/>}
      <rect x={tx-s*0.022} y={ty-s*0.052} width={tw+s*0.044} height={s*0.06} fill="#1e4060" stroke={color} strokeWidth="1"/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDER — FIX: dynamic linear-gradient background fills the track left of thumb
// The previous approach used background:'transparent' + a CSS variable on a ref.
// That only coloured the thumb, never the filled portion of the track.
// Now we compute pct and apply the gradient directly in the style prop, which
// works in both Chrome/WebKit and Firefox without any ref tricks.
// ─────────────────────────────────────────────────────────────────────────────
function Slider({ val, min, max, step, onChange, color }) {
  const pct = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
  const trackFill = `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, #cbd5e1 ${pct}%, #cbd5e1 100%)`;
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={val}
      onChange={e => onChange(parseFloat(e.target.value))}
      style={{
        width: '100%',
        height: 6,
        borderRadius: 3,
        outline: 'none',
        cursor: 'pointer',
        WebkitAppearance: 'none',
        appearance: 'none',
        background: trackFill,
        // Store colour for thumb pseudo-elements via CSS variable
        '--thumb-color': color,
      }}
    />
  );
}

// ─── Sensor Card ─────────────────────────────────────────────────────────────
function SensorCard({ label, value, unit, pct, col, icon }) {
  return (
    <div style={{ background:'#f8fafc', border:'1px solid #cbd5e1', borderRadius:8, padding:'11px 13px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:5 }}>
        <span style={{ fontSize:13 }}>{icon}</span>
        <span style={{ fontSize:8, color:'#64748b', textTransform:'uppercase', letterSpacing:'.07em', fontFamily:FONT }}>{label}</span>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:6 }}>
        <span style={{ fontSize:22, fontWeight:700, color:col, fontFamily:FONT }}>{value}</span>
        <span style={{ fontSize:9, color:'#3a6080', fontFamily:FONT }}>{unit}</span>
      </div>
      <div style={{ height:4, background:'#cbd5e1', borderRadius:2, overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', background:col, borderRadius:2, transition:'width 0.5s' }}/>
      </div>
    </div>
  );
}

// ─── Left Panel Tank Card (draggable) ────────────────────────────────────────
function LeftTankCard({ tank, level, isActive, onSelect }) {
  const isOHT = tank.type === 'OHT';
  const col   = level < 25 ? '#f44336' : tank.color;
  return (
    <div
      draggable
      onDragStart={e => e.dataTransfer.setData('tankId', tank.id)}
      onClick={() => onSelect(tank.id)}
      style={{
        display:'flex', alignItems:'center', gap:8,
        padding:'7px 8px', borderRadius:7, marginBottom:5,
        background: isActive ? (isOHT ? '#fffbeb' : '#eff6ff') : '#f8fafc',
        border:`1.5px solid ${isActive ? tank.color+'aa' : '#cbd5e1'}`,
        cursor:'grab', userSelect:'none', transition:'all 0.15s',
        boxShadow: isActive ? `0 0 12px ${tank.color}44` : 'none',
      }}
      onMouseEnter={e => { if (!isActive) { e.currentTarget.style.borderColor=tank.color+'55'; e.currentTarget.style.background='#e0f0ff'; } }}
      onMouseLeave={e => { if (!isActive) { e.currentTarget.style.borderColor='#cbd5e1'; e.currentTarget.style.background='#f8fafc'; } }}
    >
      <div style={{ flexShrink:0 }}>
        {isOHT ? <OHTThumb level={level} color={tank.color}/> : <GLSRThumb level={level} color={tank.color}/>}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:10, fontWeight:700, color: isActive ? tank.color : '#475569', fontFamily:FONT }}>{tank.label}</div>
        <div style={{ fontSize:7, color:'#3a6080', marginTop:1, fontFamily:FONT, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{tank.sub}</div>
        <div style={{ marginTop:4, display:'flex', alignItems:'center', gap:5 }}>
          <div style={{ flex:1, height:3, background:'#cbd5e1', borderRadius:2 }}>
            <div style={{ width:`${level}%`, height:'100%', background:col, borderRadius:2, transition:'width 0.4s' }}/>
          </div>
          <span style={{ fontSize:8, fontWeight:700, color:col, fontFamily:FONT, flexShrink:0 }}>{Math.round(level)}%</span>
        </div>
      </div>
    </div>
  );
}

// ─── Center: Single Tank Detail View ─────────────────────────────────────────
function TankDetailView({ tank, level, flow, valveOpen, effectiveFilling,
  onLevelChange, onFlowChange, onValveToggle, isDragOver, onDrop, onDragOver, onDragLeave }) {
  const isOHT = tank.type === 'OHT';
  const col   = level < 25 ? '#f44336' : tank.color;

  const seed     = tank.id.split('').reduce((a,c)=>a+c.charCodeAt(0),0);
  const chlor    = (1.1 + (seed%7)*0.12).toFixed(2);
  const ph       = (7.0 + (seed%5)*0.14).toFixed(2);
  const turb     = (0.6 + (seed%9)*0.18).toFixed(2);
  const chlorPct = Math.min(100,(parseFloat(chlor)/4)*100);
  const phPct    = Math.min(100,((parseFloat(ph)-6)/3)*100);
  const turbPct  = Math.min(100,(parseFloat(turb)/5)*100);
  const flowPct  = Math.min(100,(flow/150)*100);
  const chlorCol = parseFloat(chlor)>3?'#f44336':parseFloat(chlor)>2?'#ef9f27':'#38b2f8';
  const phCol    = parseFloat(ph)>8.5?'#f44336':parseFloat(ph)>8?'#ef9f27':'#a78bfa';
  const turbCol  = parseFloat(turb)>4?'#f44336':parseFloat(turb)>2?'#ef9f27':'#22c55e';

  return (
    <div onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
      style={{
        width:'100%', height:'100%', display:'flex', flexDirection:'column',
        background:'#f8fafc',
        border:`2px solid ${isDragOver ? '#38b2f8' : tank.color+'44'}`,
        borderRadius:12, overflow:'hidden', transition:'all 0.2s', position:'relative',
        boxShadow: isDragOver ? '0 0 20px #38b2f833' : `0 0 20px ${tank.color}11`,
      }}
    >
      {/* Header */}
      <div style={{
        padding:'13px 20px', background:'#ffffff',
        borderBottom:`1px solid ${tank.color}33`,
        display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:12, height:12, borderRadius:'50%', background:tank.color, boxShadow:`0 0 10px ${tank.color}` }}/>
          <div>
            <div style={{ fontSize:20, fontWeight:700, color:tank.color, fontFamily:FONT, letterSpacing:'.06em' }}>{tank.label}</div>
            <div style={{ fontSize:9, color:'#64748b', fontFamily:FONT, marginTop:1 }}>{tank.sub} · {tank.zone}</div>
          </div>
          <span style={{
            fontSize:8, padding:'3px 10px', borderRadius:4, fontFamily:FONT, fontWeight:700, marginLeft:4,
            background: isOHT ? '#ef9f2718' : '#378ADD18',
            color:      isOHT ? '#ef9f27'   : '#378ADD',
            border:`1px solid ${isOHT ? '#ef9f2740' : '#378ADD40'}`,
          }}>{isOHT ? 'Overhead Tank' : 'Ground Level Reservoir'}</span>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          {effectiveFilling && (
            <span style={{ fontSize:9, color:'#38b2f8', fontFamily:FONT, animation:'cpulse 1.2s ease-in-out infinite' }}>↓ FLOW ACTIVE</span>
          )}
          <span style={{ fontSize:16, fontWeight:700, color:col, background:col+'22', padding:'4px 14px', borderRadius:20, fontFamily:FONT }}>
            {Math.round(level)}%
          </span>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

        {/* Left: big tank SVG + level slider + valve */}
        <div style={{
          width:270, flexShrink:0,
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
          gap:14, padding:'20px 14px',
          background:'#f1f5f9', borderRight:'1px solid #cbd5e1',
        }}>
          {isOHT
            ? <OHTImage  level={level} color={tank.color} size={200}/>
            : <GLSRImage level={level} color={tank.color} size={200}/>
          }

          {/* Level bar + slider */}
          <div style={{ width:'100%', padding:'0 8px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
              <span style={{ fontSize:8, color:'#64748b', fontFamily:FONT, textTransform:'uppercase', letterSpacing:'.05em' }}>Water Level</span>
              <span style={{ fontSize:11, fontWeight:700, color:col, fontFamily:FONT }}>{Math.round(level)}%</span>
            </div>
            <div style={{ height:6, background:'#cbd5e1', borderRadius:3, overflow:'hidden', marginBottom:7 }}>
              <div style={{ width:`${level}%`, height:'100%', background:col, borderRadius:3, transition:'width 0.4s' }}/>
            </div>
            {/* FIX: pass tank.id so the callback fires with the right ID */}
            <Slider val={level} min={0} max={100} step={1}
              onChange={v => onLevelChange && onLevelChange(tank.id, v)}
              color={col}/>
          </div>

          {/* Valve toggle button */}
          <button onClick={()=>onValveToggle && onValveToggle(tank.valveId)} style={{
            display:'inline-flex', alignItems:'center', gap:6,
            padding:'6px 16px', borderRadius:6, cursor:'pointer', fontWeight:700,
            fontSize:10, fontFamily:FONT,
            background: valveOpen?'#f0fdf4':'#fff5f5',
            color:      valveOpen?'#4caf50':'#f44336',
            border:`1px solid ${valveOpen?'#4caf5066':'#f4433666'}`,
            transition:'all 0.18s', userSelect:'none',
          }}
          onMouseEnter={e=>e.currentTarget.style.opacity='0.75'}
          onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
            <span style={{ width:8,height:8,borderRadius:'50%',
              background:valveOpen?'#4caf50':'#f44336',
              boxShadow:valveOpen?'0 0 6px #4caf50':'0 0 6px #f44336' }}/>
            {valveOpen?'VALVE OPEN':'VALVE CLOSED'}
          </button>
          <div style={{ fontSize:9, color:valveOpen?'#4caf50':'#f44336', fontFamily:FONT, textAlign:'center' }}>
            {valveOpen?(effectiveFilling?'↓ Filling active':'○ Valve open'):'✕ Valve closed'}
          </div>
        </div>

        {/* Right: sensors + flow slider */}
        <div style={{ flex:1, padding:'18px 20px', overflowY:'auto', display:'flex', flexDirection:'column', gap:14 }}>

          {/* Flow control */}
          <div style={{ padding:'13px 15px', background:'#f8fafc', borderRadius:8, border:'1px solid #cbd5e1' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                <span style={{ fontSize:15 }}>💧</span>
                <span style={{ fontSize:9, color:'#64748b', fontFamily:FONT, textTransform:'uppercase', letterSpacing:'.06em' }}>Outlet Flow</span>
              </div>
              <span style={{ fontSize:20, fontWeight:700, color:flow>0?'#38b2f8':'#3a6080', fontFamily:FONT }}>
                {flow.toFixed(1)}<span style={{ fontSize:9, color:'#3a6080', marginLeft:4 }}>m³/h</span>
              </span>
            </div>
            <div style={{ height:5, background:'#cbd5e1', borderRadius:3, overflow:'hidden', marginBottom:8 }}>
              <div style={{ width:`${flowPct}%`, height:'100%', background:flow>0?'#38b2f8':'#3a6080', borderRadius:3, transition:'width 0.4s' }}/>
            </div>
            <Slider val={flow} min={0} max={150} step={0.5}
              onChange={v => onFlowChange && onFlowChange(tank.fm, v)}
              color={flow>0?'#38b2f8':'#3a6080'}/>
            <div style={{ marginTop:6, fontSize:7, color:'#64748b', fontFamily:FONT }}>Flowmeter: {tank.fm}</div>
          </div>

          {/* 2×2 sensor grid */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <SensorCard label="Chlorine"   value={chlor}           unit="mg/L" pct={chlorPct} col={chlorCol} icon="⚗️"/>
            <SensorCard label="pH Level"   value={ph}              unit="pH"   pct={phPct}   col={phCol}   icon="🧪"/>
            <SensorCard label="Turbidity"  value={turb}            unit="NTU"  pct={turbPct} col={turbCol} icon="🔬"/>
            <SensorCard label="Flow Meter" value={flow.toFixed(1)} unit="m³/h" pct={flowPct} col={flow>0?'#4caf50':'#3a6080'} icon="📊"/>
          </div>

          {/* Status pills */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {[
              { l:'Status', v:effectiveFilling?'FILLING':valveOpen?'STANDBY':'ISOLATED', c:effectiveFilling?'#4caf50':valveOpen?'#38b2f8':'#f44336' },
              { l:'Zone',   v:tank.zone,  c:'#64b5f6' },
              { l:'Type',   v:tank.type,  c:isOHT?'#ef9f27':'#378ADD' },
              { l:'Valve',  v:valveOpen?'OPEN':'CLOSED', c:valveOpen?'#4caf50':'#f44336' },
            ].map(s=>(
              <div key={s.l} style={{ padding:'8px 12px', borderRadius:7, background:'#f8fafc', border:'1px solid #cbd5e1' }}>
                <div style={{ fontSize:7, color:'#64748b', fontFamily:FONT, textTransform:'uppercase', letterSpacing:'.05em', marginBottom:4 }}>{s.l}</div>
                <div style={{ fontSize:11, fontWeight:700, color:s.c, fontFamily:FONT }}>{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Drag-over overlay */}
      {isDragOver && (
        <div style={{
          position:'absolute', inset:0,
          display:'flex', alignItems:'center', justifyContent:'center',
          background:'#f0f4f880', borderRadius:12, pointerEvents:'none',
        }}>
          <div style={{ fontSize:16, color:'#38b2f8', fontFamily:FONT, fontWeight:700, letterSpacing:'.1em',
            padding:'12px 24px', borderRadius:8, background:'#e8ecf1', border:'2px dashed #38b2f8' }}>
            ↓ DROP TO SWITCH TANK
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
//
// FIX: Prop destructuring was wrong — props were named e.g. `levels: externalLevels`
// which means "accept a prop called 'levels' and rename it to externalLevels".
// But Home.js passes props literally named externalLevels, externalFlows, etc.
// They never matched, so all data was undefined and fell back to hardcoded
// INITIAL_* constants. Changed to receive the props by their actual names.
// ─────────────────────────────────────────────────────────────────────────────
export default function ControlPanelPage({
  externalLevels,       // FIX: was `levels: externalLevels`
  externalFlows,        // FIX: was `flows: externalFlows`
  externalConicLevel,   // FIX: was `conicLevel: externalConicLevel`
  externalValveStates,  // FIX: was `valveStates: externalValveStates`
  onFlowChange:  externalOnFlowChange,
  onLevelChange: externalOnLevelChange,
  onReset:       externalOnReset,
  onValveToggle: externalOnValveToggle,
}) {
  const [activeTankId, setActiveTankId] = useState('oht-01');
  const [isDragOver,   setIsDragOver]   = useState(false);

  // Fallback to hardcoded defaults only when the backend hasn't responded yet
  const levels      = externalLevels      ?? INITIAL_LEVELS;
  const flows       = externalFlows       ?? INITIAL_FLOWS;
  const conicLevel  = externalConicLevel  ?? CONIC_INITIAL_LEVEL;
  const valveStates = externalValveStates ?? INITIAL_VALVE_STATES;

  const activeTank = ALL_TANKS.find(t => t.id === activeTankId) ?? ALL_TANKS[0];

  const anyFlow    = Object.values(flows).some(v => v > 0);
  const mainFlow   = flows['flowmeter-001'] ?? 0;
  const masterOpen = valveStates['valve-main-001'] ?? true;

  const handleDragOver  = useCallback(e => { e.preventDefault(); setIsDragOver(true); }, []);
  const handleDragLeave = useCallback(() => setIsDragOver(false), []);
  const handleDrop      = useCallback(e => {
    e.preventDefault(); setIsDragOver(false);
    const id = e.dataTransfer.getData('tankId');
    if (id) setActiveTankId(id);
  }, []);

  const level     = levels[activeTank.id] ?? 0;
  const flow      = flows[activeTank.fm]  ?? 0;
  const valveOpen = valveStates[activeTank.valveId] ?? true;
  const effectiveFilling = mainFlow > 0 && masterOpen && valveOpen;

  // Alert generation
  const alerts = [];
  if (conicLevel <= 0)      alerts.push({ t:'danger', m:'SUMP — empty! Flow stopped' });
  else if (conicLevel < 25) alerts.push({ t:'warn',   m:`SUMP low (${Math.round(conicLevel)}%)` });
  if (!masterOpen)          alerts.push({ t:'warn',   m:'V-MAIN closed — all flow blocked' });
  Object.entries(levels).forEach(([id, lvl]) => {
    if (lvl <= 0)      alerts.push({ t:'danger', m:`${id.toUpperCase()} empty` });
    else if (lvl < 25) alerts.push({ t:'warn',   m:`${id.toUpperCase()} critical (${Math.round(lvl)}%)` });
  });
  Object.entries(flows).forEach(([id, v]) => {
    if (v > 0) alerts.push({ t:'ok', m:`${id.replace('flowmeter-','FT ')} ${v.toFixed(1)} m³/h` });
  });
  if (!alerts.length) alerts.push({ t:'ok', m:'All systems nominal' });
  const dotC = { warn:'#ef9f27', ok:'#4caf50', danger:'#f44336' };

  return (
    <div style={{ width:'100%', height:'100vh', background:'#f0f4f8', fontFamily:FONT, color:'#1e293b', display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* ══ Top header ══ */}
      <div style={{ background:'#e8ecf1', borderBottom:'1px solid #cbd5e1', padding:'9px 18px', flexShrink:0, display:'flex', alignItems:'center', gap:12 }}>
        <div>
          <div style={{ fontSize:12, fontWeight:700, color:'#475569', letterSpacing:'.08em', textTransform:'uppercase' }}>SCADA Control Panel</div>
          <div style={{ fontSize:7, color:'#64748b', marginTop:1 }}>Click or drag a tank card from the left panel to view its details in the center</div>
        </div>
        <div style={{ marginLeft:'auto', display:'flex', gap:8, alignItems:'center' }}>

          {/* Sump indicator */}
          <div style={{ padding:'4px 10px', borderRadius:5, background:'#ffffff', border:`1px solid ${conicLevel<25?'#f4433640':'#cbd5e1'}` }}>
            <div style={{ fontSize:7, color:'#64748b' }}>SUMP</div>
            <div style={{ fontSize:11, fontWeight:700, color:conicLevel<25?'#ef9f27':'#38b2f8', fontFamily:FONT }}>{Math.round(conicLevel)}%</div>
          </div>

          {/* V-MAIN toggle */}
          <div style={{ padding:'4px 10px', borderRadius:5, display:'flex', alignItems:'center', gap:6,
            background:masterOpen?'#f0fdf4':'#fff5f5', border:`1px solid ${masterOpen?'#4caf5040':'#f4433640'}` }}>
            <div style={{ fontSize:7, color:'#64748b' }}>V-MAIN</div>
            <button onClick={()=>externalOnValveToggle && externalOnValveToggle('valve-main-001')} style={{
              display:'flex', alignItems:'center', gap:3, padding:'1px 7px', borderRadius:3,
              cursor:'pointer', fontWeight:700, fontSize:8, fontFamily:FONT,
              background:'transparent', border:'none', color:masterOpen?'#4caf50':'#f44336',
            }}>
              <span style={{ width:5,height:5,borderRadius:'50%', background:masterOpen?'#4caf50':'#f44336', boxShadow:masterOpen?'0 0 4px #4caf50':'0 0 4px #f44336' }}/>
              {masterOpen?'OPEN':'CLOSED'}
            </button>
          </div>

          {/* Main inlet flow slider */}
          <div style={{ padding:'4px 10px', borderRadius:5, background:'#ffffff', border:`1px solid ${mainFlow>0?'#38b2f840':'#cbd5e1'}`, minWidth:130 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
              <span style={{ fontSize:7, color:'#64748b' }}>MAIN INLET</span>
              <span style={{ fontSize:8, fontWeight:700, color:mainFlow>0?'#38b2f8':'#3a6080', fontFamily:FONT }}>{mainFlow.toFixed(1)} m³/h</span>
            </div>
            <Slider val={mainFlow} min={0} max={150} step={0.5}
              onChange={v=>externalOnFlowChange && externalOnFlowChange('flowmeter-001',v)}
              color="#38b2f8"/>
          </div>

          <span style={{ fontSize:8, padding:'4px 11px', borderRadius:20, fontWeight:700,
            background:anyFlow?'#f0fdf4':'#fff5f5', color:anyFlow?'#16a34a':'#dc2626',
            border:`1px solid ${anyFlow?'#86efac':'#fca5a5'}` }}>
            {anyFlow?'● FLOWING':'● IDLE'}
          </span>

          <button onClick={externalOnReset} style={{
            padding:'5px 13px', borderRadius:5, cursor:'pointer', fontSize:8, fontWeight:700,
            fontFamily:FONT, background:'#fef2f2', color:'#ef4444', border:'1px solid #fca5a5', letterSpacing:'.04em',
          }}
          onMouseEnter={e=>e.currentTarget.style.background='#fee2e2'}
          onMouseLeave={e=>e.currentTarget.style.background='#fef2f2'}>
            ↺ RESET
          </button>
        </div>
      </div>

      {/* ══ Body ══ */}
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

        {/* ── Left panel ── */}
        <div style={{ width:195, flexShrink:0, background:'#f1f5f9', borderRight:'1px solid #cbd5e1', display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ padding:'9px 11px 6px', borderBottom:'1px solid #cbd5e1', flexShrink:0 }}>
            <div style={{ fontSize:9, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'.09em' }}>Tank Panel</div>
            <div style={{ fontSize:7, color:'#94a3b8', marginTop:2 }}>Click or drag a tank to view →</div>
          </div>

          <div style={{ flex:1, overflowY:'auto', padding:'8px 10px' }}>

            {/* OHT tanks */}
            <div style={{ fontSize:7, color:'#ef9f27', textTransform:'uppercase', letterSpacing:'.09em', marginBottom:6, fontFamily:FONT, fontWeight:700, display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'#ef9f27', display:'inline-block' }}/>
              OHT — Overhead Tanks
            </div>
            {ALL_TANKS.filter(t=>t.type==='OHT').map(t=>(
              <LeftTankCard key={t.id} tank={t} level={levels[t.id]??0} isActive={activeTankId===t.id} onSelect={setActiveTankId}/>
            ))}

            <div style={{ borderTop:'1px solid #cbd5e1', margin:'10px 0 8px' }}/>

            {/* GLSR tanks */}
            <div style={{ fontSize:7, color:'#378ADD', textTransform:'uppercase', letterSpacing:'.09em', marginBottom:6, fontFamily:FONT, fontWeight:700, display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'#378ADD', display:'inline-block' }}/>
              GLSR — Ground Reservoirs
            </div>
            {ALL_TANKS.filter(t=>t.type==='GLSR').map(t=>(
              <LeftTankCard key={t.id} tank={t} level={levels[t.id]??0} isActive={activeTankId===t.id} onSelect={setActiveTankId}/>
            ))}

            <div style={{ borderTop:'1px solid #cbd5e1', margin:'10px 0 8px' }}/>

            {/* Summary stats */}
            <div style={{ fontSize:8, color:'#64748b', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:6 }}>Summary</div>
            {[
              { l:'Active Lines', v:`${Object.entries(flows).filter(([k,v])=>k!=='flowmeter-001'&&v>0).length}/${Object.keys(flows).length-1}`, c:'#4caf50' },
              { l:'Avg Level',    v:`${Math.round(Object.values(levels).reduce((a,b)=>a+b,0)/Object.keys(levels).length)}%`, c:'#38b2f8' },
              { l:'Open Valves',  v:`${Object.values(valveStates).filter(Boolean).length}/${Object.keys(valveStates).length}`, c:'#ef9f27' },
            ].map(s=>(
              <div key={s.l} style={{ display:'flex', justifyContent:'space-between', marginBottom:4, padding:'3px 6px', borderRadius:4, background:'#f4f7fb' }}>
                <span style={{ fontSize:7, color:'#64748b', fontFamily:FONT }}>{s.l}</span>
                <span style={{ fontSize:8, fontWeight:700, color:s.c, fontFamily:FONT }}>{s.v}</span>
              </div>
            ))}

            <div style={{ borderTop:'1px solid #cbd5e1', margin:'10px 0 8px' }}/>

            {/* Alerts */}
            <div style={{ fontSize:8, color:'#64748b', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:6 }}>Alerts</div>
            {alerts.slice(0,6).map((a,i)=>(
              <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:5, marginBottom:4,
                padding:'4px 6px', borderRadius:4, background:'#f4f7fb', borderLeft:`2px solid ${dotC[a.t]}` }}>
                <span style={{ width:4,height:4,borderRadius:'50%', background:dotC[a.t], marginTop:2, flexShrink:0 }}/>
                <span style={{ fontSize:7, color:'#64748b', lineHeight:1.4, fontFamily:FONT }}>{a.m}</span>
              </div>
            ))}

            <div style={{ borderTop:'1px solid #cbd5e1', margin:'10px 0 8px' }}/>

            {/* Sump / Source */}
            <div style={{ fontSize:8, color:'#64748b', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:6 }}>Sump / Source</div>
            <div style={{ padding:'7px 8px', borderRadius:7, background:'#f4f7fb', border:`1px solid ${conicLevel<25?'#f4433630':'#cbd5e1'}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontSize:7, color:'#64748b', fontFamily:FONT }}>Level</span>
                <span style={{ fontSize:10, fontWeight:700, fontFamily:FONT,
                  color:conicLevel<=0?'#f44336':conicLevel<25?'#ef9f27':'#38b2f8' }}>{Math.round(conicLevel)}%</span>
              </div>
              <div style={{ height:4, background:'#cbd5e1', borderRadius:2, overflow:'hidden', marginBottom:4 }}>
                <div style={{ width:`${Math.max(0,conicLevel)}%`, height:'100%', borderRadius:2, transition:'width 0.4s',
                  background:conicLevel<=0?'#f44336':conicLevel<25?'#ef9f27':'#38b2f8' }}/>
              </div>
              <Slider val={conicLevel} min={0} max={100} step={1}
                onChange={v=>externalOnLevelChange && externalOnLevelChange('__conic__',v)}
                color={conicLevel<25?'#f44336':'#38b2f8'}/>
            </div>
          </div>
        </div>

        {/* ── Center: single tank detail ── */}
        <div style={{ flex:1, padding:'16px 18px', overflow:'hidden', display:'flex', flexDirection:'column' }}>
          <TankDetailView
            tank={activeTank}
            level={level} flow={flow}
            valveOpen={valveOpen} effectiveFilling={effectiveFilling}
            onLevelChange={externalOnLevelChange}
            onFlowChange={externalOnFlowChange}
            onValveToggle={externalOnValveToggle}
            isDragOver={isDragOver}
            onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
          />
        </div>
      </div>

      {/* Global CSS — slider thumb + scrollbar + pulse animation */}
      <style>{`
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-track{background:#f0f4f8}
        ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:2px}
        @keyframes cpulse{0%,100%{opacity:1}50%{opacity:0.18}}

        /* Thumb styles — colour comes from --thumb-color set via style prop */
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--thumb-color, #38b2f8);
          border: 2px solid white;
          margin-top: -5px;
          cursor: pointer;
          box-shadow: 0 0 6px var(--thumb-color, #38b2f8);
        }
        input[type=range]::-webkit-slider-runnable-track {
          height: 6px;
          border-radius: 3px;
          border: none;
          /* track background is set dynamically via the element's background style */
        }
        input[type=range]:focus { outline: none; }

        input[type=range]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--thumb-color, #38b2f8);
          border: 2px solid white;
          cursor: pointer;
          box-shadow: 0 0 6px var(--thumb-color, #38b2f8);
        }
        input[type=range]::-moz-range-track {
          height: 6px;
          border-radius: 3px;
          border: none;
          background: transparent;
        }
      `}</style>
    </div>
  );
}