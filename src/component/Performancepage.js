
import React from 'react';

const FONT = "'Courier New', monospace";

const STYLE = `
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(28px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .perf-item { animation: slideUp 0.5s ease both; }
`;

export default function PerformancePage() {
  const kpis = [
    { label: 'System Efficiency', value: 87,   unit: '%',     color: '#22c55e', trend: '+2.3%', up: true  },
    { label: 'Water Distributed', value: 1240, unit: 'kL',   color: '#38b2f8', trend: '+5.1%', up: true  },
    { label: 'Energy Consumed',   value: 432,  unit: 'kWh',  color: '#f59e0b', trend: '-1.8%', up: false },
    { label: 'Pump Uptime',       value: 99.1, unit: '%',    color: '#a78bfa', trend: '0.0%',  up: null  },
    { label: 'Avg Tank Level',    value: 55,   unit: '%',    color: '#38b2f8', trend: '+3.2%', up: true  },
    { label: 'Flow Rate Avg',     value: 78,   unit: 'm³/h', color: '#22c55e', trend: '+0.6%', up: true  },
  ];
  const chart = [42, 38, 35, 55, 88, 95, 110, 105, 98, 85, 72, 58];
  const hours = ['00','02','04','06','08','10','12','14','16','18','20','22'];
  const maxV  = Math.max(...chart);
  const trendColor = (up) => up === true ? '#22c55e' : up === false ? '#f44336' : '#4a7a9b';

  return (
    <div style={{ padding: '40px 40px 60px', background: '#0d1b2e', fontFamily: FONT }}>
      <style>{STYLE}</style>

      {/* Header */}
      <div className="perf-item" style={{ marginBottom: 36, animationDelay: '0s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 9, color: '#4a7a9b', letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 8 }}>
          <span style={{ width: 18, height: 1, background: '#38b2f8', display: 'inline-block' }} />
          Performance Dashboard
        </div>
        <div style={{ fontSize: 30, fontWeight: 700, color: '#e8f4ff', lineHeight: 1.2 }}>System Metrics Overview</div>
        <div style={{ fontSize: 11, color: '#4a7a9b', marginTop: 6 }}>Real-time KPIs · Updated every 30 seconds</div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 32 }}>
        {kpis.map((k, i) => (
          <div key={k.label} className="perf-item" style={{ animationDelay: `${0.1 + i * 0.07}s` }}>
            <div style={{
              background: '#0a1628', borderRadius: 12, padding: '22px',
              border: '1px solid #1e3a5c', position: 'relative', overflow: 'hidden',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = k.color + '55'; e.currentTarget.style.boxShadow = `0 6px 24px ${k.color}18`; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e3a5c'; e.currentTarget.style.boxShadow = 'none'; }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: `linear-gradient(to bottom,${k.color},${k.color}44)`, borderRadius: '12px 0 0 12px' }} />
              <div style={{ paddingLeft: 8 }}>
                <div style={{ fontSize: 9, color: '#4a7a9b', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>{k.label}</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: k.color, lineHeight: 1 }}>
                  {k.value}<span style={{ fontSize: 13, color: '#7eabcb', marginLeft: 4 }}>{k.unit}</span>
                </div>
                <div style={{ marginTop: 12, fontSize: 10, fontWeight: 700, color: trendColor(k.up) }}>
                  {k.up === true ? '↑' : k.up === false ? '↓' : '→'} {k.trend} vs yesterday
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="perf-item" style={{ animationDelay: '0.5s', background: '#0a1628', borderRadius: 12, padding: '24px', border: '1px solid #1e3a5c' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: '#7eabcb', textTransform: 'uppercase', letterSpacing: '.08em' }}>24-Hour Flow Rate (m³/h)</div>
          <div style={{ fontSize: 9, padding: '3px 10px', borderRadius: 20, background: '#132236', color: '#38b2f8', border: '1px solid #1e3a5c' }}>
            Today · {new Date().toLocaleDateString('en-GB')}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 150, paddingBottom: 30, position: 'relative' }}>
          {chart.map((v, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
              <div title={`${hours[i]}:00 — ${v} m³/h`}
                style={{ width: '100%', borderRadius: '4px 4px 0 0', height: `${(v/maxV)*115}px`, background: 'linear-gradient(to top,#0369a1,#38b2f8)', minHeight: 3, transition: 'opacity 0.2s', cursor:'pointer' }}
                onMouseEnter={e=>e.currentTarget.style.opacity='0.7'}
                onMouseLeave={e=>e.currentTarget.style.opacity='1'} />
              <div style={{ fontSize: 8, color: '#4a7a9b', position: 'absolute', bottom: 0 }}>{hours[i]}h</div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="perf-item" style={{ animationDelay: '0.6s', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginTop: 20 }}>
        {[
          { label: 'Peak Hour', value: '12:00', sub: '110 m³/h recorded', color: '#38b2f8' },
          { label: 'Low Hour',  value: '04:00', sub: '35 m³/h recorded',  color: '#a78bfa' },
          { label: 'Avg/Hour', value: '74',    sub: 'm³/h average',       color: '#22c55e' },
        ].map(s => (
          <div key={s.label} style={{ background: '#0a1628', borderRadius: 10, padding: '14px 16px', border: '1px solid #1e3a5c', textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: '#4a7a9b', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 9, color: '#4a7a9b', marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
