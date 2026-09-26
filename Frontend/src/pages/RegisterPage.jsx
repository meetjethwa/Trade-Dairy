import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../services/authService';
import useAuthStore from '../store/authStore';

export default function RegisterPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [form, setForm]   = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState('');

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Passwords do not match');
    setLoading(true);
    try {
      const { data } = await registerUser({ name: form.name, email: form.email, password: form.password });
      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600&family=Outfit:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg:      #080d1a;
          --bg2:     #0c1424;
          --bg3:     #0f1d35;
          --panel:   #0a1628;
          --acc:     #00d4aa;
          --acc2:    #00b894;
          --acc-dim: rgba(0,212,170,0.12);
          --txt:     #e2eff8;
          --txt2:    #7a9ab8;
          --txt3:    #3d5a78;
          --border:  rgba(0,212,170,0.12);
          --border2: rgba(0,212,170,0.25);
          --red:     #ff6b6b;
          --glow:    0 0 40px rgba(0,212,170,0.08);
        }

        .rp-root {
          min-height: 100vh;
          background: var(--bg);
          font-family: 'Outfit', sans-serif;
          color: var(--txt);
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }

        .rp-root::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(rgba(0,212,170,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,212,170,0.03) 1px, transparent 1px);
          background-size: 60px 60px;
          pointer-events: none;
          z-index: 0;
        }

        .rp-orb1 {
          position: fixed;
          width: 500px; height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(0,212,170,0.06) 0%, transparent 70%);
          top: -150px; left: -100px;
          pointer-events: none;
          z-index: 0;
        }
        .rp-orb2 {
          position: fixed;
          width: 400px; height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(0,180,255,0.04) 0%, transparent 70%);
          bottom: -100px; right: 200px;
          pointer-events: none;
          z-index: 0;
        }

        /* ── NAV: slim, 3-col, brand centred ── */
        .rp-nav {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          padding: 0.65rem 5%;
          border-bottom: 1px solid var(--border);
          background: rgba(8,13,26,0.85);
          backdrop-filter: blur(12px);
          position: relative;
          z-index: 10;
        }
        .rp-brand {
          font-family: 'Cormorant Garamond', serif;
          font-size: 18px;
          color: var(--acc);
          letter-spacing: 0.5px;
          text-decoration: none;
          grid-column: 2;
        }
        .rp-nav-hint {
          font-size: 12px;
          color: var(--txt2);
          text-align: right;
          grid-column: 3;
        }
        .rp-nav-hint a {
          color: var(--acc);
          text-decoration: none;
          font-weight: 500;
        }

        /* MAIN WRAP */
        .rp-wrap {
          flex: 1;
          display: grid;
          grid-template-columns: 1fr 1fr;
          position: relative;
          z-index: 1;
        }

        /* LEFT PANEL — centred */
        .rp-left {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          padding: 5rem 6% 5rem 8%;
          position: relative;
        }
        .rp-left::after {
          content: '';
          position: absolute;
          right: 0; top: 10%; bottom: 10%;
          width: 1px;
          background: linear-gradient(to bottom, transparent, var(--border2), transparent);
        }

        .rp-tag {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: var(--acc-dim);
          border: 1px solid var(--border2);
          color: var(--acc);
          font-size: 11px;
          letter-spacing: 2.5px;
          text-transform: uppercase;
          padding: 6px 14px;
          border-radius: 4px;
          margin-bottom: 2rem;
          width: fit-content;
          font-family: 'JetBrains Mono', monospace;
        }
        .rp-tag::before {
          content: '';
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--acc);
          animation: rp-pulse 2s infinite;
        }
        @keyframes rp-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }

        .rp-left h1 {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(32px, 4vw, 52px);
          line-height: 1.1;
          color: var(--txt);
          margin-bottom: 1.25rem;
          font-weight: 700;
        }
        .rp-left h1 em {
          font-style: italic;
          color: var(--acc);
        }
        .rp-left > p {
          font-size: 15px;
          color: var(--txt2);
          line-height: 1.7;
          max-width: 380px;
          margin-bottom: 3rem;
          font-weight: 300;
        }

        /* Feature items */
        .rp-features {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          width: 100%;
          max-width: 420px;
        }
        .rp-feat {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1rem 1.25rem;
          background: rgba(0,212,170,0.04);
          border: 1px solid var(--border);
          border-radius: 10px;
          text-align: left;
          transition: border-color 0.3s, background 0.3s;
        }
        .rp-feat:hover {
          border-color: var(--border2);
          background: rgba(0,212,170,0.07);
        }
        .rp-feat-icon {
          width: 36px; height: 36px; min-width: 36px;
          background: var(--acc-dim);
          border: 1px solid var(--border2);
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-size: 16px;
        }
        .rp-feat h4 {
          font-size: 13px;
          font-weight: 500;
          color: var(--txt);
          margin-bottom: 2px;
        }
        .rp-feat p {
          font-size: 12px;
          color: var(--txt3);
          line-height: 1.4;
        }

        /* Stat row */
        .rp-stats {
          display: flex;
          gap: 2rem;
          margin-top: 2.5rem;
          padding-top: 2rem;
          border-top: 1px solid var(--border);
          width: 100%;
          max-width: 420px;
          justify-content: center;
        }
        .rp-stat .n {
          font-family: 'JetBrains Mono', monospace;
          font-size: 22px;
          color: var(--acc);
          font-weight: 500;
        }
        .rp-stat .l {
          font-size: 11px;
          color: var(--txt3);
          letter-spacing: 0.5px;
          margin-top: 2px;
        }

        /* RIGHT PANEL */
        .rp-right {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4rem 8% 4rem 6%;
        }

        .rp-box {
          width: 100%;
          max-width: 440px;
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 2.5rem;
          box-shadow: var(--glow), 0 0 0 1px rgba(255,255,255,0.02);
          position: relative;
          overflow: hidden;
        }
        .rp-box::before {
          content: '';
          position: absolute;
          top: 0; left: 20%; right: 20%;
          height: 1px;
          background: linear-gradient(to right, transparent, var(--acc), transparent);
        }

        .rp-box-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 28px;
          color: var(--txt);
          margin-bottom: 4px;
          font-weight: 600;
        }
        .rp-box-sub {
          font-size: 13px;
          color: var(--txt2);
          margin-bottom: 1.75rem;
          font-weight: 300;
        }

        /* Error */
        .rp-error {
          background: rgba(255,107,107,0.08);
          border: 1px solid rgba(255,107,107,0.25);
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 13px;
          color: var(--red);
          margin-bottom: 1.25rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .rp-error::before { content: '⚠'; font-size: 14px; }

        /* Form */
        .rp-form { display: flex; flex-direction: column; gap: 1rem; }

        .rp-group { display: flex; flex-direction: column; gap: 6px; }
        .rp-label {
          font-size: 11px;
          font-weight: 500;
          color: var(--txt3);
          letter-spacing: 1.5px;
          text-transform: uppercase;
          font-family: 'JetBrains Mono', monospace;
          transition: color 0.2s;
        }
        .rp-group.focused .rp-label { color: var(--acc); }

        .rp-input {
          width: 100%;
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 12px 16px;
          font-size: 14px;
          color: var(--txt);
          font-family: 'Outfit', sans-serif;
          outline: none;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
        }
        .rp-input::placeholder { color: var(--txt3); }
        .rp-input:focus {
          border-color: var(--acc);
          background: rgba(0,212,170,0.04);
          box-shadow: 0 0 0 3px rgba(0,212,170,0.08);
        }

        /* Submit button */
        .rp-submit {
          width: 100%;
          background: var(--acc);
          color: #050d18;
          border: none;
          border-radius: 10px;
          padding: 14px;
          font-size: 15px;
          font-weight: 600;
          font-family: 'Outfit', sans-serif;
          cursor: pointer;
          margin-top: 0.5rem;
          transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
          position: relative;
          overflow: hidden;
          letter-spacing: 0.3px;
        }
        .rp-submit:hover:not(:disabled) {
          background: var(--acc2);
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(0,212,170,0.25);
        }
        .rp-submit:active:not(:disabled) { transform: translateY(0); }
        .rp-submit:disabled { opacity: 0.6; cursor: not-allowed; }

        .rp-submit::after {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
          transition: left 0.5s;
        }
        .rp-submit:hover::after { left: 100%; }

        .rp-footer {
          text-align: center;
          margin-top: 1.25rem;
          font-size: 13px;
          color: var(--txt2);
        }
        .rp-footer a { color: var(--acc); text-decoration: none; font-weight: 500; }

        @media (max-width: 768px) {
          .rp-wrap { grid-template-columns: 1fr; }
          .rp-left { display: none; }
          .rp-right { padding: 2rem 5%; }
        }
      `}</style>

      <div className="rp-root">
        <div className="rp-orb1" />
        <div className="rp-orb2" />

        {/* NAV — 3 columns, brand centred */}
        <nav className="rp-nav">
          <div />
          <Link to="/" className="rp-brand">TradeDiary</Link>
          <span className="rp-nav-hint">Have an account? <Link to="/login">Sign in</Link></span>
        </nav>

        <div className="rp-wrap">
          {/* LEFT — centred */}
          <div className="rp-left">
            <div className="rp-tag">Get started free</div>
            <h1>Create your<br /><em>Trading Account</em></h1>
            <p>Join thousands of traders who use TradeDiary to stay accountable and improve their edge.</p>

            <div className="rp-features">
              {[
                { icon: '🚀', title: 'Free to Start',    desc: 'No credit card required to sign up.' },
                { icon: '🔐', title: 'Secure & Private', desc: 'Your trades are encrypted and private.' },
                { icon: '📤', title: 'Export Anytime',   desc: 'Download your trade data as CSV.' },
              ].map((f) => (
                <div className="rp-feat" key={f.title}>
                  <div className="rp-feat-icon">{f.icon}</div>
                  <div><h4>{f.title}</h4><p>{f.desc}</p></div>
                </div>
              ))}
            </div>

            <div className="rp-stats">
              <div className="rp-stat"><div className="n">12,400+</div><div className="l">Trades Logged</div></div>
              <div className="rp-stat"><div className="n">3,200+</div><div className="l">Active Traders</div></div>
              <div className="rp-stat"><div className="n">98%</div><div className="l">Uptime</div></div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="rp-right">
            <div className="rp-box">
              <h2 className="rp-box-title">Create Account</h2>
              <p className="rp-box-sub">Fill in your details to get started</p>

              {error && <div className="rp-error">{error}</div>}

              <form className="rp-form" onSubmit={handleSubmit}>
                {[
                  { label: 'Full Name',        name: 'name',     type: 'text',     placeholder: 'Your full name' },
                  { label: 'Email',            name: 'email',    type: 'email',    placeholder: 'you@example.com' },
                  { label: 'Password',         name: 'password', type: 'password', placeholder: 'Min 6 characters' },
                  { label: 'Confirm Password', name: 'confirm',  type: 'password', placeholder: 'Repeat your password' },
                ].map((field) => (
                  <div className={`rp-group${focused === field.name ? ' focused' : ''}`} key={field.name}>
                    <label className="rp-label">{field.label}</label>
                    <input
                      className="rp-input"
                      type={field.type}
                      name={field.name}
                      placeholder={field.placeholder}
                      value={form[field.name]}
                      onChange={handleChange}
                      onFocus={() => setFocused(field.name)}
                      onBlur={() => setFocused('')}
                      required
                    />
                  </div>
                ))}

                <button className="rp-submit" type="submit" disabled={loading}>
                  {loading ? 'Creating account...' : 'Create Account →'}
                </button>
              </form>

              <p className="rp-footer">
                Already have an account? <Link to="/login">Sign in</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}