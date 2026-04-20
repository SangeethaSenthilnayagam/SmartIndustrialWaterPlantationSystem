import React, { useState, useEffect, useCallback } from 'react';

const FONT = "'Courier New', monospace";
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

const STYLE = `
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .maint-item { animation: slideUp 0.45s ease both; }
`;

const STATUS_COLOR = {
  pending:   '#ef9f27',
  overdue:   '#f44336',
  scheduled: '#38b2f8',
  done:      '#4caf50',
};

const TYPE_COLOR = {
  Scheduled:   '#38b2f8',
  Calibration: '#a78bfa',
  Inspection:  '#ef9f27',
  Cleaning:    '#22c55e',
  Corrective:  '#f44336',
};

async function fetchTasks() {
  const res = await fetch(`${API_BASE}/maintenance/tasks`);
  if (!res.ok) throw new Error('Failed to fetch tasks');
  return res.json();
}

async function updateTaskStatus(taskId, newStatus) {
  const res = await fetch(`${API_BASE}/maintenance/tasks/${taskId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: newStatus }),
  });
  if (!res.ok) throw new Error('Failed to update task');
  return res.json();
}

export default function MaintenancePage() {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchTasks();
      setTasks(data);
      setError(null);
    } catch (err) {
      console.error('Maintenance load error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
    const interval = setInterval(loadTasks, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [loadTasks]);

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await updateTaskStatus(taskId, newStatus);
      // Optimistic update
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, status: newStatus } : t
      ));
    } catch (err) {
      console.error('Status update failed:', err);
      loadTasks(); // revert
    }
  };

  const filteredTasks = filter === 'all'
    ? tasks
    : tasks.filter(t => t.status === filter);

  const counts = {
    overdue:   tasks.filter(t => t.status === 'overdue').length,
    pending:   tasks.filter(t => t.status === 'pending').length,
    scheduled: tasks.filter(t => t.status === 'scheduled').length,
    done:      tasks.filter(t => t.status === 'done').length,
  };

  if (loading && tasks.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: FONT }}>
        <div style={{ width: 44, height: 44, border: '4px solid #e2e8f0', borderTop: '4px solid #38b2f8', borderRadius: '50%', animation: 'spin 0.9s linear infinite', margin: '0 auto 16px' }} />
        <div style={{ fontSize: 11, color: '#64748b' }}>Loading maintenance tasks…</div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: FONT }}>
        <div style={{ color: '#f44336', marginBottom: 12 }}>⚠️ {error}</div>
        <button onClick={loadTasks} style={{ padding: '8px 16px', cursor: 'pointer' }}>Retry</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px 40px 60px', background: '#f1f5f9', fontFamily: FONT }}>
      <style>{STYLE}</style>

      {/* Header */}
      <div className="maint-item" style={{ marginBottom: 28, animationDelay: '0s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 9, color: '#64748b', letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 8 }}>
          <span style={{ width: 18, height: 1, background: '#38b2f8', display: 'inline-block' }} />
          Asset Lifecycle
        </div>
        <div style={{ fontSize: 30, fontWeight: 700, color: '#1e293b', lineHeight: 1.2 }}>Maintenance Schedule</div>
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
          Preventive & corrective maintenance tracker · {tasks.length} tasks
        </div>
      </div>

      {/* Summary cards */}
      <div className="maint-item" style={{ display: 'flex', gap: 14, marginBottom: 28, animationDelay: '0.1s', flexWrap: 'wrap' }}>
        {[
          { label: 'Overdue',   count: counts.overdue,   color: '#f44336', bg: '#fff5f5' },
          { label: 'Pending',   count: counts.pending,   color: '#ef9f27', bg: '#fffbf0' },
          { label: 'Scheduled', count: counts.scheduled, color: '#38b2f8', bg: '#eff6ff' },
          { label: 'Done',      count: counts.done,      color: '#4caf50', bg: '#f0fdf4' },
        ].map(s => (
          <div key={s.label} style={{ padding:'12px 20px', borderRadius:10, background:s.bg, border:`1px solid ${s.color}44`, display:'flex', alignItems:'center', gap:10, transition:'transform 0.2s', cursor:'default' }}
            onMouseEnter={e=>e.currentTarget.style.transform='translateY(-2px)'}
            onMouseLeave={e=>e.currentTarget.style.transform='none'}>
            <span style={{ fontSize:26, fontWeight:700, color:s.color }}>{s.count}</span>
            <span style={{ fontSize:10, color:'#475569', textTransform:'uppercase', letterSpacing:'.07em' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="maint-item" style={{ display: 'flex', gap: 8, marginBottom: 22, animationDelay: '0.15s', flexWrap: 'wrap', alignItems: 'center' }}>
        {['all','overdue','pending','scheduled','done'].map(f => {
          const col = f==='overdue'?'#f44336': f==='pending'?'#ef9f27': f==='scheduled'?'#38b2f8': f==='done'?'#4caf50':'#64b5f6';
          const active = filter === f;
          return (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding:'6px 18px', borderRadius:20, cursor:'pointer',
              fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', fontFamily:FONT,
              background: active ? col : '#ffffff', color: active ? '#fff' : '#64748b',
              border: `1px solid ${active ? col : '#cbd5e1'}`, transition:'all 0.2s',
            }}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          );
        })}
        <span style={{ marginLeft:'auto', fontSize:10, color:'#64748b' }}>{filteredTasks.length} task{filteredTasks.length!==1?'s':''}</span>
      </div>

      {/* Task list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredTasks.map((t, i) => (
          <div key={t.id} className="maint-item" style={{ animationDelay: `${0.2 + i * 0.04}s` }}>
            <div style={{
              background:'#ffffff', borderRadius:10, padding:'14px 18px',
              border:`1px solid ${t.status==='overdue'?'#f4433655':'#cbd5e1'}`,
              display:'flex', alignItems:'center', gap:16,
              transition:'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={e=>{ e.currentTarget.style.transform='translateX(3px)'; e.currentTarget.style.boxShadow=`0 4px 18px ${STATUS_COLOR[t.status]}18`; }}
            onMouseLeave={e=>{ e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='none'; }}>
              <div style={{ width:4, height:46, borderRadius:4, flexShrink:0, background:STATUS_COLOR[t.status] }}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4, flexWrap:'wrap', gap:6 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'#1e293b' }}>{t.asset}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                    <span style={{ fontSize:8, padding:'2px 8px', borderRadius:12, background:TYPE_COLOR[t.type]+'22', color:TYPE_COLOR[t.type], border:`1px solid ${TYPE_COLOR[t.type]}44`, fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em' }}>{t.type}</span>
                    <span style={{ fontSize:10, fontWeight:700, color:STATUS_COLOR[t.status] }}>{t.status==='overdue'?'⚠ ':''}{t.due}</span>
                  </div>
                </div>
                <div style={{ fontSize:11, color:'#475569', lineHeight:1.5 }}>{t.desc}</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ fontSize:8, color:'#64748b', padding:'3px 8px', background:'#f8fafc', borderRadius:5, flexShrink:0, border:'1px solid #cbd5e1' }}>#{t.id}</div>
                {t.status !== 'done' && (
                  <button onClick={() => handleStatusChange(t.id, 'done')} style={{
                    fontSize:8, padding:'4px 10px', borderRadius:6, cursor:'pointer',
                    background:'#4caf50', color:'white', border:'none', fontFamily:FONT,
                  }}>Mark Done</button>
                )}
              </div>
            </div>
          </div>
        ))}
        {filteredTasks.length === 0 && (
          <div style={{ textAlign:'center', padding:'48px', color:'#64748b', fontSize:11 }}>
            No maintenance tasks match the current filter.
          </div>
        )}
      </div>
    </div>
  );
}