
import React, { useState } from 'react';

const FONT = "'Courier New', monospace";

const STYLE = `
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .maint-item { animation: slideUp 0.45s ease both; }
`;

const TASKS = [
  { id:'M001', asset:'Pump P1 (OHT-01)',       type:'Scheduled',   due:'18 Mar 2026', status:'pending',   desc:'Bearing lubrication & impeller inspection' },
  { id:'M002', asset:'Flowmeter FT-GLSR-01',   type:'Calibration', due:'20 Mar 2026', status:'pending',   desc:'Annual flow calibration against master meter' },
  { id:'M003', asset:'Valve V-MAIN',            type:'Inspection',  due:'16 Mar 2026', status:'overdue',   desc:'Actuator stroke test & seal inspection — OVERDUE' },
  { id:'M004', asset:'GLSR-01 Tank',            type:'Cleaning',    due:'25 Mar 2026', status:'pending',   desc:'Interior cleaning & structural inspection' },
  { id:'M005', asset:'Pump P4 (OHT-02)',        type:'Corrective',  due:'16 Mar 2026', status:'overdue',   desc:'High temperature fault — motor winding check' },
  { id:'M006', asset:'WQS Sensor (wqs-001)',    type:'Calibration', due:'22 Mar 2026', status:'scheduled', desc:'pH & turbidity sensor recalibration' },
  { id:'M007', asset:'Header Pipe Main',        type:'Inspection',  due:'30 Mar 2026', status:'scheduled', desc:'Visual inspection & pressure test at 1.5× operating pressure' },
  { id:'M008', asset:'Pump P2 (GLSR-02)',       type:'Scheduled',   due:'28 Mar 2026', status:'scheduled', desc:'Full overhaul — seals, bearings, impeller' },
  { id:'M009', asset:'Valve valve-oht-01',      type:'Inspection',  due:'19 Mar 2026', status:'pending',   desc:'Manual override test & leak check at valve body' },
  { id:'M010', asset:'GLSR-02 Tank',            type:'Cleaning',    due:'05 Apr 2026', status:'scheduled', desc:'Scheduled bi-annual interior tank cleaning' },
];

const SC = { pending:'#ef9f27', overdue:'#f44336', scheduled:'#38b2f8', done:'#4caf50' };
const TC = { Scheduled:'#38b2f8', Calibration:'#a78bfa', Inspection:'#ef9f27', Cleaning:'#22c55e', Corrective:'#f44336' };

export default function MaintenancePage() {
  const [filter, setFilter] = useState('all');
  const list = filter === 'all' ? TASKS : TASKS.filter(t => t.status === filter);
  const cnt  = s => TASKS.filter(t => t.status === s).length;

  return (
    <div style={{ padding: '40px 40px 60px', background: '#0d1b2e', fontFamily: FONT }}>
      <style>{STYLE}</style>

      {/* Header */}
      <div className="maint-item" style={{ marginBottom: 28, animationDelay: '0s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 9, color: '#4a7a9b', letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 8 }}>
          <span style={{ width: 18, height: 1, background: '#38b2f8', display: 'inline-block' }} />
          Asset Lifecycle
        </div>
        <div style={{ fontSize: 30, fontWeight: 700, color: '#e8f4ff', lineHeight: 1.2 }}>Maintenance Schedule</div>
        <div style={{ fontSize: 11, color: '#4a7a9b', marginTop: 6 }}>Preventive & corrective maintenance tracker · {TASKS.length} tasks</div>
      </div>

      {/* Summary cards */}
      <div className="maint-item" style={{ display: 'flex', gap: 14, marginBottom: 28, animationDelay: '0.1s', flexWrap: 'wrap' }}>
        {[
          { label:'Overdue',   count:cnt('overdue'),   color:'#f44336', bg:'#1f0a0a' },
          { label:'Pending',   count:cnt('pending'),   color:'#ef9f27', bg:'#2a1800' },
          { label:'Scheduled', count:cnt('scheduled'), color:'#38b2f8', bg:'#081828' },
          { label:'Done',      count:cnt('done'),      color:'#4caf50', bg:'#0a1f0a' },
        ].map(s => (
          <div key={s.label} style={{ padding:'12px 20px', borderRadius:10, background:s.bg, border:`1px solid ${s.color}44`, display:'flex', alignItems:'center', gap:10, transition:'transform 0.2s', cursor:'default' }}
            onMouseEnter={e=>e.currentTarget.style.transform='translateY(-2px)'}
            onMouseLeave={e=>e.currentTarget.style.transform='none'}>
            <span style={{ fontSize:26, fontWeight:700, color:s.color }}>{s.count}</span>
            <span style={{ fontSize:10, color:'#7eabcb', textTransform:'uppercase', letterSpacing:'.07em' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="maint-item" style={{ display: 'flex', gap: 8, marginBottom: 22, animationDelay: '0.15s', flexWrap: 'wrap', alignItems: 'center' }}>
        {['all','overdue','pending','scheduled'].map(f => {
          const col = f==='overdue'?'#f44336': f==='pending'?'#ef9f27': f==='scheduled'?'#38b2f8':'#64b5f6';
          const active = filter === f;
          return (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding:'6px 18px', borderRadius:20, cursor:'pointer',
              fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', fontFamily:FONT,
              background: active ? col : '#0a1628', color: active ? '#fff' : '#4a7a9b',
              border: `1px solid ${active ? col : '#1e3a5c'}`, transition:'all 0.2s',
            }}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          );
        })}
        <span style={{ marginLeft:'auto', fontSize:10, color:'#4a7a9b' }}>{list.length} task{list.length!==1?'s':''}</span>
      </div>

      {/* Task list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {list.map((t, i) => (
          <div key={t.id} className="maint-item" style={{ animationDelay: `${0.2 + i * 0.04}s` }}>
            <div style={{
              background:'#0a1628', borderRadius:10, padding:'14px 18px',
              border:`1px solid ${t.status==='overdue'?'#f4433655':'#1e3a5c'}`,
              display:'flex', alignItems:'center', gap:16,
              transition:'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={e=>{ e.currentTarget.style.transform='translateX(3px)'; e.currentTarget.style.boxShadow=`0 4px 18px ${SC[t.status]}18`; }}
            onMouseLeave={e=>{ e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='none'; }}>
              <div style={{ width:4, height:46, borderRadius:4, flexShrink:0, background:SC[t.status] }}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4, flexWrap:'wrap', gap:6 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'#e8f4ff' }}>{t.asset}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                    <span style={{ fontSize:8, padding:'2px 8px', borderRadius:12, background:TC[t.type]+'22', color:TC[t.type], border:`1px solid ${TC[t.type]}44`, fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em' }}>{t.type}</span>
                    <span style={{ fontSize:10, fontWeight:700, color:SC[t.status] }}>{t.status==='overdue'?'⚠ ':''}{t.due}</span>
                  </div>
                </div>
                <div style={{ fontSize:11, color:'#7eabcb', lineHeight:1.5 }}>{t.desc}</div>
              </div>
              <div style={{ fontSize:8, color:'#4a7a9b', padding:'3px 8px', background:'#060f1a', borderRadius:5, flexShrink:0, border:'1px solid #1e3a5c' }}>#{t.id}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
