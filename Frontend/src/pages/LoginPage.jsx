import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser } from '../services/authService';
import useAuthStore from '../store/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [form, setForm]   = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState('');

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await loginUser(form);
      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
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

        .lp-root {
          min-height: 100vh;
          background: var(--bg);
          font-family: 'Outfit', sans-serif;
          color: var(--txt);
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }

        /* Grid background */
        .lp-root::before {
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

        /* Orbs */
        .lp-orb1 {
          position: fixed;
          width: 500px; height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(0,212,170,0.06) 0%, transparent 70%);
          top: -150px; left: -100px;
          pointer-events: none;
          z-index: 0;
        }
        .lp-orb2 {
          position: fixed;
          width: 400px; height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(0,180,255,0.04) 0%, transparent 70%);
          bottom: -100px; right: 200px;
          pointer-events: none;
          z-index: 0;
        }

        /* NAV — slim, 3-col, brand centred */
        .lp-nav {
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
        .lp-brand {
          font-family: 'Cormorant Garamond', serif;
          font-size: 18px;
          color: var(--acc);
          letter-spacing: 0.5px;
          text-decoration: none;
          grid-column: 2;
        }
        .lp-nav-hint {
          font-size: 12px;
          color: var(--txt2);
          text-align: right;
          grid-column: 3;
        }
        .lp-nav-hint a {
          color: var(--acc);
          text-decoration: none;
          font-weight: 500;
        }

        /* MAIN WRAP */
        .lp-wrap {
          flex: 1;
          display: grid;
          grid-template-columns: 1fr 1fr;
          position: relative;
          z-index: 1;
        }

        /* LEFT — centred */
        .lp-left {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          padding: 5rem 6% 5rem 8%;
          position: relative;
        }
        .lp-left::after {
          content: '';
          position: absolute;
          right: 0; top: 10%; bottom: 10%;
          width: 1px;
          background: linear-gradient(to bottom, transparent, var(--border2), transparent);
        }

        .lp-tag {
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
        .lp-tag::before {
          content: '';
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--acc);
          animation: lp-pulse 2s infinite;
        }
        @keyframes lp-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.8); }
        }

        .lp-left h1 {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(32px, 4vw, 52px);
          line-height: 1.1;
          color: var(--txt);
          margin-bottom: 1.25rem;
          font-weight: 700;
        }
        .lp-left h1 em {
          font-style: italic;
          color: var(--acc);
          display: block;
        }
        .lp-left > p {
          font-size: 15px;
          color: var(--txt2);
          line-height: 1.7;
          max-width: 360px;
          margin-bottom: 3rem;
          font-weight: 300;
        }

        /* Features */
        .lp-features {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          width: 100%;
          max-width: 420px;
        }
        .lp-feat {
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
        .lp-feat:hover {
          border-color: var(--border2);
          background: rgba(0,212,170,0.07);
        }
        .lp-feat-icon {
          width: 36px; height: 36px; min-width: 36px;
          background: var(--acc-dim);
          border: 1px solid var(--border2);
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-size: 16px;
        }
        .lp-feat h4 {
          font-size: 13px;
          font-weight: 500;
          color: var(--txt);
          margin-bottom: 2px;
        }
        .lp-feat p {
          font-size: 12px;
          color: var(--txt3);
          line-height: 1.4;
        }

        /* RIGHT */
        .lp-right {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4rem 8% 4rem 6%;
        }

        .lp-box {
          width: 100%;
          max-width: 420px;
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 2.5rem;
          box-shadow: var(--glow), 0 0 0 1px rgba(255,255,255,0.02);
          position: relative;
          overflow: hidden;
        }
        .lp-box::before {
          content: '';
          position: absolute;
          top: 0; left: 20%; right: 20%;
          height: 1px;
          background: linear-gradient(to right, transparent, var(--acc), transparent);
        }

        .lp-box-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 28px;
          color: var(--txt);
          margin-bottom: 4px;
          font-weight: 600;
        }
        .lp-box-sub {
          font-size: 13px;
          color: var(--txt2);
          margin-bottom: 1.75rem;
          font-weight: 300;
        }

        /* Error */
        .lp-error {
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
        .lp-error::before { content: '⚠'; font-size: 14px; }

        /* Form */
        .lp-form { display: flex; flex-direction: column; gap: 1rem; }

        .lp-group { display: flex; flex-direction: column; gap: 6px; }
        .lp-label {
          font-size: 11px;
          font-weight: 500;
          color: var(--txt3);
          letter-spacing: 1.5px;
          text-transform: uppercase;
          font-family: 'JetBrains Mono', monospace;
          transition: color 0.2s;
        }
        .lp-group.focused .lp-label { color: var(--acc); }

        .lp-input {
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
        .lp-input::placeholder { color: var(--txt3); }
        .lp-input:focus {
          border-color: var(--acc);
          background: rgba(0,212,170,0.04);
          box-shadow: 0 0 0 3px rgba(0,212,170,0.08);
        }

        /* Submit */
        .lp-submit {
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
        .lp-submit:hover:not(:disabled) {
          background: var(--acc2);
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(0,212,170,0.25);
        }
        .lp-submit:active:not(:disabled) { transform: translateY(0); }
        .lp-submit:disabled { opacity: 0.6; cursor: not-allowed; }
        .lp-submit::after {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
          transition: left 0.5s;
        }
        .lp-submit:hover::after { left: 100%; }

        .lp-footer {
          text-align: center;
          margin-top: 1.25rem;
          font-size: 13px;
          color: var(--txt2);
        }
        .lp-footer a { color: var(--acc); text-decoration: none; font-weight: 500; }

        @media (max-width: 768px) {
          .lp-wrap { grid-template-columns: 1fr; }
          .lp-left { display: none; }
          .lp-right { padding: 2rem 5%; }
        }
      `}</style>

      <div className="lp-root">
        <div className="lp-orb1" />
        <div className="lp-orb2" />

        {/* NAV */}
        <nav className="lp-nav">
          <div />
          <Link to="/" className="lp-brand">TradeDiary</Link>
          <span className="lp-nav-hint">No account? <Link to="/register">Register</Link></span>
        </nav>

        <div className="lp-wrap">
          {/* LEFT */}
          <div className="lp-left">
            <div className="lp-tag">Welcome back</div>
            <h1>Log in to your<br /><em>Trading Journal</em></h1>
            <p>Track your trades, analyse performance, and grow as a trader — all in one place.</p>

            <div className="lp-features">
              {[
                { icon: '📊', title: 'Live P&L Dashboard', desc: 'See your stats update in real time.' },
                { icon: '📒', title: 'Full Trade History',  desc: 'Every trade logged and searchable.' },
                { icon: '📈', title: 'Equity Curve',        desc: 'Visualise your growth over time.' },
              ].map((f) => (
                <div className="lp-feat" key={f.title}>
                  <div className="lp-feat-icon">{f.icon}</div>
                  <div><h4>{f.title}</h4><p>{f.desc}</p></div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT */}
          <div className="lp-right">
            <div className="lp-box">
              <h2 className="lp-box-title">Sign In</h2>
              <p className="lp-box-sub">Enter your credentials to continue</p>

              {error && <div className="lp-error">{error}</div>}

              <form className="lp-form" onSubmit={handleSubmit}>
                {[
                  { label: 'Email',    name: 'email',    type: 'email',    placeholder: 'you@example.com' },
                  { label: 'Password', name: 'password', type: 'password', placeholder: 'Enter your password' },
                ].map((field) => (
                  <div className={`lp-group${focused === field.name ? ' focused' : ''}`} key={field.name}>
                    <label className="lp-label">{field.label}</label>
                    <input
                      className="lp-input"
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

                <button className="lp-submit" type="submit" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In →'}
                </button>
              </form>

              <p className="lp-footer">
                Don't have an account? <Link to="/register">Register here</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}