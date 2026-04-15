import React, { useState } from 'react';

const FONT = "'Courier New', monospace";

const STYLE = `
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .alert-item { animation: slideUp 0.45s ease both; }
`;

const ALERTS_DATA = [
  { id:1,  type:'danger', title:'OHT-02 Level Critical',           msg:'Tank level dropped below 10%. Immediate attention required.',                   time:'03:15 PM', ack:false },
  { id:2,  type:'warn',   title:'GLSR-01 Flow Rate Low',           msg:'Flow rate below 20 m³/h threshold for the past 15 minutes.',                   time:'02:58 PM', ack:false },
  { id:3,  type:'warn',   title:'Sump / Source Below 25%',         msg:'Conic source tank at 22%. Schedule refill to avoid supply interruption.',       time:'02:30 PM', ack:false },
  { id:4,  type:'ok',     title:'V-MAIN Opened Successfully',      msg:'Master valve restored. Downstream flow resumed across all branches.',           time:'01:45 PM', ack:true  },
  { id:5,  type:'ok',     title:'All Tanks Filled to 100%',        msg:'Main inlet flow auto-stopped. All 6 tanks at full capacity.',                  time:'12:10 PM', ack:true  },
  { id:6,  type:'danger', title:'valve-oht-03 Closed During Flow', msg:'OHT-03 valve closed while main flow was active. Tank not receiving water.',    time:'11:52 AM', ack:false },
  { id:7,  type:'warn',   title:'Pump P3 High Temperature',        msg:'Pump 3 operating temperature exceeded 75°C. Check cooling system.',            time:'10:20 AM', ack:false },
  { id:8,  type:'ok',     title:'System Startup Complete',         msg:'All 7 flowmeters online and responsive. SCADA network ready.',                 time:'09:00 AM', ack:true  },
  { id:9,  type:'warn',   title:'GLSR-03 Valve Partially Open',    msg:'valve-glsr-03 detected at 60% open. Full opening recommended.',                time:'08:44 AM', ack:false },
  { id:10, type:'danger', title:'GLSR-02 Empty',                   msg:'GLSR-02 tank reached 0%. Outlet flow auto-stopped by system.',                 time:'07:30 AM', ack:true  },
];

const DOT  = { warn:'#ef9f27', ok:'#4caf50', danger:'#f44336' };
const BBKG = { warn:'#2a1800', ok:'#0a1f0a', danger:'#1f0a0a' };
const LBL  = { warn:'WARNING', ok:'OK', danger:'CRITICAL' };
const FTRS = [
  { k:'all',    label:'All',      col:'#38b2f8' },
  { k:'danger', label:'Critical', col:'#f44336' },
  { k:'warn',   label:'Warning',  col:'#ef9f27' },
  { k:'ok',     label:'OK',       col:'#4caf50' },
];

export default function AlertsPage() {
  const [filter, setFilter] = useState('all');
  const list = filter === 'all' ? ALERTS_DATA : ALERTS_DATA.filter(a => a.type === filter);

  return (
    <div style={{ padding: '40px 40px 60px', background: '#0d1b2e', fontFamily: FONT }}>
      <style>{STYLE}</style>

      {/* Header */}
      <div className="alert-item" style={{ marginBottom: 28, animationDelay: '0s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 9, color: '#4a7a9b', letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 8 }}>
          <span style={{ width: 18, height: 1, background: '#38b2f8', display: 'inline-block' }} />
          Notification Center
        </div>
        <div style={{ fontSize: 30, fontWeight: 700, color: '#e8f4ff', lineHeight: 1.2 }}>Alert / Notification</div>
        <div style={{ fontSize: 11, color: '#4a7a9b', marginTop: 6 }}>
          {ALERTS_DATA.filter(a => !a.ack).length} unacknowledged · {ALERTS_DATA.length} total events
        </div>
      </div>

      {/* Summary pills */}
      <div className="alert-item" style={{ display: 'flex', gap: 12, marginBottom: 24, animationDelay: '0.1s', flexWrap: 'wrap' }}>
        {[
          { label:'Critical', count: ALERTS_DATA.filter(a=>a.type==='danger').length, color:'#f44336', bg:'#1f0a0a' },
          { label:'Warnings', count: ALERTS_DATA.filter(a=>a.type==='warn').length,   color:'#ef9f27', bg:'#2a1800' },
          { label:'Unacked',  count: ALERTS_DATA.filter(a=>!a.ack).length,            color:'#38b2f8', bg:'#081828' },
        ].map(s => (
          <div key={s.label} style={{ padding: '10px 18px', borderRadius: 9, background: s.bg, border: `1px solid ${s.color}44`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.count}</span>
            <span style={{ fontSize: 10, color: '#7eabcb', textTransform: 'uppercase', letterSpacing: '.07em' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="alert-item" style={{ display: 'flex', gap: 8, marginBottom: 22, animationDelay: '0.15s', flexWrap: 'wrap', alignItems: 'center' }}>
        {FTRS.map(b => (
          <button key={b.k} onClick={() => setFilter(b.k)} style={{
            padding: '6px 18px', borderRadius: 20, cursor: 'pointer',
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', fontFamily: FONT,
            background: filter === b.k ? b.col : '#0a1628',
            color:      filter === b.k ? '#fff' : '#4a7a9b',
            border:     `1px solid ${filter === b.k ? b.col : '#1e3a5c'}`,
            transition: 'all 0.2s',
          }}>{b.label}</button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 10, color: '#4a7a9b' }}>Showing {list.length} events</span>
      </div>

      {/* Alert list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {list.map((a, i) => (
          <div key={a.id} className="alert-item" style={{ animationDelay: `${0.2 + i * 0.04}s` }}>
            <div style={{
              background: a.ack ? '#080f1a' : '#0a1628',
              borderRadius: 10, padding: '16px 20px',
              border: `1px solid ${a.ack ? '#0d1e30' : DOT[a.type]+'33'}`,
              display: 'flex', alignItems: 'flex-start', gap: 16,
              opacity: a.ack ? 0.65 : 1,
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={e => { if(!a.ack){ e.currentTarget.style.transform='translateX(3px)'; e.currentTarget.style.boxShadow=`0 4px 18px ${DOT[a.type]}18`; }}}
            onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='none'; }}>
              <div style={{ width:10, height:10, borderRadius:'50%', flexShrink:0, marginTop:5, background:DOT[a.type], boxShadow: a.ack?'none':`0 0 8px ${DOT[a.type]}88` }}/>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6, flexWrap:'wrap', gap:6 }}>
                  <div style={{ fontSize:13, fontWeight:700, color: a.ack?'#4a7a9b':'#e8f4ff' }}>{a.title}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                    <span style={{ fontSize:8, padding:'2px 8px', borderRadius:12, fontWeight:700, background:BBKG[a.type], color:DOT[a.type], border:`1px solid ${DOT[a.type]}44`, textTransform:'uppercase', letterSpacing:'.06em' }}>{LBL[a.type]}</span>
                    <span style={{ fontSize:9, color:'#4a7a9b' }}>{a.time}</span>
                    {a.ack && <span style={{ fontSize:8, color:'#4caf50', fontWeight:700 }}>✓ ACK</span>}
                  </div>
                </div>
                <div style={{ fontSize:11, color:'#7eabcb', lineHeight:1.6 }}>{a.msg}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
