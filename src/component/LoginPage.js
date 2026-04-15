
import React, { useState } from 'react';

const FONT = "'Courier New', monospace";

// Reusable input field
function Field({ label, type = 'text', value, onChange, placeholder, autoComplete }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{
        display: 'block', fontSize: 9, fontWeight: 700,
        color: '#4a7a9b', textTransform: 'uppercase', letterSpacing: '.09em', marginBottom: 7,
        fontFamily: FONT,
      }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '11px 14px', borderRadius: 7,
          background: focused ? '#0a1628' : '#060f1a',
          border: `1px solid ${focused ? '#38b2f8' : '#1e3a5c'}`,
          color: '#e8f4ff', fontSize: 12, fontFamily: FONT,
          outline: 'none', transition: 'all 0.2s',
          boxShadow: focused ? '0 0 0 3px rgba(56,178,248,0.12)' : 'none',
        }}
      />
    </div>
  );
}

export default function LoginPage({ onBack }) {
  const [mode,     setMode]     = useState('login');   // 'login' | 'register'
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [name,     setName]     = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [status,   setStatus]   = useState(null);      // null | 'success' | 'error'
  const [msg,      setMsg]      = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) {
      setStatus('error'); setMsg('Email and password are required.'); return;
    }
    if (mode === 'register' && password !== confirm) {
      setStatus('error'); setMsg('Passwords do not match.'); return;
    }
    // Simulate success
    setStatus('success');
    setMsg(mode === 'login'
      ? `Welcome back! Redirecting to dashboard…`
      : `Account created! Check your email to verify.`);
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#060f1a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: FONT, padding: '40px 20px', boxSizing: 'border-box',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background orbs */}
      <div style={{
        position: 'absolute', top: '-10%', right: '-5%',
        width: 460, height: 460, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(56,178,248,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }}/>
      <div style={{
        position: 'absolute', bottom: '-15%', left: '5%',
        width: 380, height: 380, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(14,165,233,0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
      }}/>
      {/* Dot grid */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.05,
        backgroundImage: 'radial-gradient(#38b2f8 1px, transparent 1px)',
        backgroundSize: '28px 28px', pointerEvents: 'none',
      }}/>

      <div style={{
        position: 'relative', zIndex: 2,
        width: '100%', maxWidth: 440,
        animation: 'loginFadeIn 0.55s ease both',
      }}>
        <style>{`
          @keyframes loginFadeIn {
            from { opacity: 0; transform: translateY(24px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        {/* Card */}
        <div style={{
          background: '#08121e', borderRadius: 16, overflow: 'hidden',
          border: '1px solid #1e3a5c',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5), 0 0 40px rgba(56,178,248,0.06)',
        }}>
          {/* Card header */}
          <div style={{
            background: 'linear-gradient(135deg, #041428, #061c3a)',
            padding: '28px 32px 24px', borderBottom: '1px solid #1e3a5c',
          }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 9,
                background: 'linear-gradient(135deg, #0ea5e9, #0369a1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 18px #0ea5e933', flexShrink: 0,
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#38b2f8', letterSpacing: '.08em', lineHeight: 1 }}>
                  AQUA TWIN
                </div>
                <div style={{ fontSize: 8, color: '#4a7a9b', letterSpacing: '.12em', marginTop: 2 }}>
                  WATER MANAGEMENT SYSTEM
                </div>
              </div>
            </div>

            {/* Mode tabs */}
            <div style={{
              display: 'flex', background: '#060f1a', borderRadius: 8,
              padding: 4, gap: 4,
            }}>
              {['login', 'register'].map(m => (
                <button key={m} onClick={() => { setMode(m); setStatus(null); }}
                  style={{
                    flex: 1, padding: '8px', borderRadius: 6, cursor: 'pointer',
                    fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase',
                    fontFamily: FONT, border: 'none', transition: 'all 0.2s',
                    background: mode === m ? 'linear-gradient(135deg, #0ea5e9, #0369a1)' : 'transparent',
                    color:      mode === m ? '#fff' : '#4a7a9b',
                    boxShadow:  mode === m ? '0 2px 10px #0ea5e933' : 'none',
                  }}>
                  {m === 'login' ? 'Sign In' : 'Register'}
                </button>
              ))}
            </div>
          </div>

          {/* Form body */}
          <form onSubmit={handleSubmit} style={{ padding: '28px 32px' }}>
            {mode === 'register' && (
              <Field
                label="Full Name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="John Operator"
                autoComplete="name"
              />
            )}
            <Field
              label="Email Address"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="operator@aquatwin.local"
              autoComplete="email"
            />
            <Field
              label="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
            {mode === 'register' && (
              <Field
                label="Confirm Password"
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            )}

            {/* Status message */}
            {status && (
              <div style={{
                padding: '10px 14px', borderRadius: 7, marginBottom: 16,
                background: status === 'success' ? '#0a1f0a' : '#1f0a0a',
                border:     `1px solid ${status === 'success' ? '#4caf5044' : '#f4433644'}`,
                color:      status === 'success' ? '#4caf50' : '#f44336',
                fontSize: 11, lineHeight: 1.5,
              }}>
                {status === 'success' ? '✓ ' : '✕ '}{msg}
              </div>
            )}

            {/* Submit */}
            <button type="submit" style={{
              width: '100%', padding: '12px', borderRadius: 7, cursor: 'pointer',
              fontSize: 12, fontWeight: 700, letterSpacing: '.07em',
              background: 'linear-gradient(135deg, #0ea5e9, #0369a1)',
              color: '#fff', border: 'none', fontFamily: FONT,
              boxShadow: '0 0 20px #0ea5e933', transition: 'all 0.2s',
              marginBottom: 14,
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 24px #0ea5e955'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 0 20px #0ea5e933'; }}>
              {mode === 'login' ? 'Sign In →' : 'Create Account →'}
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1, height: 1, background: '#1e3a5c' }}/>
              <span style={{ fontSize: 9, color: '#4a7a9b', textTransform: 'uppercase', letterSpacing: '.07em' }}>or</span>
              <div style={{ flex: 1, height: 1, background: '#1e3a5c' }}/>
            </div>

            {/* Back to home */}
            {onBack && (
              <button type="button" onClick={onBack} style={{
                width: '100%', padding: '11px', borderRadius: 7, cursor: 'pointer',
                fontSize: 11, fontWeight: 700, letterSpacing: '.05em',
                background: 'transparent', color: '#7eabcb',
                border: '1px solid #1e3a5c', fontFamily: FONT, transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#38b2f8'; e.currentTarget.style.color = '#38b2f8'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e3a5c'; e.currentTarget.style.color = '#7eabcb'; }}>
                ← Back to Home
              </button>
            )}
          </form>

          {/* Footer note */}
          <div style={{
            padding: '12px 32px 16px', borderTop: '1px solid #1e3a5c',
            fontSize: 9, color: '#4a7a9b', textAlign: 'center', lineHeight: 1.6,
          }}>
            By signing in you agree to our Terms of Service and Privacy Policy.
            <br />Secure access · AquaTwin SCADA Platform
          </div>
        </div>
      </div>
    </div>
  );
}
