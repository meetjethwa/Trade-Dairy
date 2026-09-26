import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@400;500&family=DM+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg:     #0a0f1e;
          --bg2:    #0d1b2a;
          --bg3:    #112240;
          --acc:    #00d4aa;
          --acc2:   #00b894;
          --txt:    #e8f4f8;
          --txt2:   #8ba7be;
          --txt3:   #4a6fa5;
          --border: rgba(0,212,170,0.15);
        }

        body {
          font-family: 'DM Sans', sans-serif;
          background: var(--bg);
          color: var(--txt);
          overflow-x: hidden;
        }

        .td-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 6%;
          border-bottom: 1px solid var(--border);
          position: sticky;
          top: 0;
          background: rgba(10,15,30,0.92);
          backdrop-filter: blur(10px);
          z-index: 100;
        }
        .td-nav-brand { font-family: 'Playfair Display', serif; font-size: 22px; color: var(--acc); letter-spacing: -0.5px; }
        .td-nav-links { display: flex; gap: 2rem; align-items: center; }
        .td-nav-links a { color: var(--txt2); text-decoration: none; font-size: 14px; transition: color 0.2s; }
        .td-nav-links a:hover { color: var(--acc); }
        .td-btn-nav {
          background: var(--acc); color: var(--bg); border: none; border-radius: 8px;
          padding: 9px 20px; font-size: 14px; font-weight: 500; font-family: 'DM Sans', sans-serif;
          cursor: pointer; width: fit-content; transition: background 0.2s;
        }
        .td-btn-nav:hover { background: var(--acc2); }

        .td-hero { text-align: center; padding: 6rem 6% 5rem; position: relative; }
        .td-hero::before {
          content: ''; position: absolute; top: 0; left: 50%; transform: translateX(-50%);
          width: 600px; height: 400px;
          background: radial-gradient(ellipse, rgba(0,212,170,0.07) 0%, transparent 70%);
          pointer-events: none;
        }
        .td-hero-tag {
          display: inline-block; background: rgba(0,212,170,0.1); border: 1px solid var(--border);
          color: var(--acc); font-size: 12px; letter-spacing: 2px; text-transform: uppercase;
          padding: 5px 16px; border-radius: 20px; margin-bottom: 1.5rem;
        }
        .td-hero h1 { font-family: 'Playfair Display', serif; font-size: clamp(36px, 6vw, 64px); line-height: 1.15; color: var(--txt); margin-bottom: 1.25rem; }
        .td-hero h1 span { color: var(--acc); }
        .td-hero p { font-size: 17px; color: var(--txt2); max-width: 520px; margin: 0 auto 2.5rem; line-height: 1.7; }
        .td-hero-btns { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; align-items: center; }

        .td-btn-primary {
          background: var(--acc); color: var(--bg); border: none; border-radius: 10px;
          padding: 14px 32px; font-size: 15px; font-weight: 500; font-family: 'DM Sans', sans-serif;
          cursor: pointer; width: fit-content; display: inline-block;
          transition: background 0.2s, transform 0.15s;
        }
        .td-btn-primary:hover { background: var(--acc2); transform: translateY(-1px); }
        .td-btn-outline {
          background: transparent; color: var(--txt); border: 1px solid var(--border); border-radius: 10px;
          padding: 14px 32px; font-size: 15px; font-family: 'DM Sans', sans-serif;
          cursor: pointer; width: fit-content; display: inline-block;
          transition: border-color 0.2s, color 0.2s;
        }
        .td-btn-outline:hover { border-color: var(--acc); color: var(--acc); }

        .td-stats-strip {
          display: flex; justify-content: center; gap: 3rem;
          padding: 2.5rem 6%; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); flex-wrap: wrap;
        }
        .td-stat-item { text-align: center; }
        .td-stat-item .num { font-family: 'DM Mono', monospace; font-size: 28px; color: var(--acc); font-weight: 500; }
        .td-stat-item .lbl { font-size: 13px; color: var(--txt3); margin-top: 4px; letter-spacing: 0.5px; }

        .td-features { padding: 5rem 6%; max-width: 1100px; margin: 0 auto; }
        .td-section-label { text-align: center; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: var(--txt3); margin-bottom: 0.75rem; }
        .td-section-title { text-align: center; font-family: 'Playfair Display', serif; font-size: clamp(26px, 4vw, 38px); color: var(--txt); margin-bottom: 3rem; }
        .td-features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem; }
        .td-feature-card { background: var(--bg3); border: 1px solid var(--border); border-radius: 14px; padding: 1.75rem; transition: border-color 0.2s, transform 0.2s; }
        .td-feature-card:hover { border-color: rgba(0,212,170,0.35); transform: translateY(-3px); }
        .td-feature-icon { width: 44px; height: 44px; background: rgba(0,212,170,0.1); border: 1px solid var(--border); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; margin-bottom: 1rem; }
        .td-feature-card h3 { font-size: 16px; font-weight: 500; color: var(--txt); margin-bottom: 0.5rem; }
        .td-feature-card p  { font-size: 14px; color: var(--txt2); line-height: 1.6; }

        .td-how { padding: 5rem 6%; background: var(--bg2); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
        .td-steps { display: flex; justify-content: center; max-width: 900px; margin: 0 auto; flex-wrap: wrap; }
        .td-step { flex: 1; min-width: 200px; text-align: center; padding: 1.5rem 1.25rem; position: relative; }
        .td-step:not(:last-child)::after { content: '→'; position: absolute; right: -10px; top: 2rem; color: var(--txt3); font-size: 18px; }
        .td-step-num { width: 40px; height: 40px; background: rgba(0,212,170,0.1); border: 1px solid var(--border); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'DM Mono', monospace; font-size: 14px; color: var(--acc); margin: 0 auto 1rem; }
        .td-step h4 { font-size: 15px; font-weight: 500; color: var(--txt); margin-bottom: 0.4rem; }
        .td-step p  { font-size: 13px; color: var(--txt2); line-height: 1.5; }

        .td-pricing { padding: 5rem 6%; max-width: 900px; margin: 0 auto; }
        .td-pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.25rem; margin-top: 3rem; }
        .td-pricing-card { background: var(--bg3); border: 1px solid var(--border); border-radius: 14px; padding: 2rem 1.75rem; }
        .td-pricing-card.featured { border-color: var(--acc); position: relative; }
        .td-featured-badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: var(--acc); color: var(--bg); font-size: 11px; font-weight: 500; padding: 3px 14px; border-radius: 20px; white-space: nowrap; }
        .td-pricing-card h3 { font-size: 14px; color: var(--txt3); letter-spacing: 1px; text-transform: uppercase; margin-bottom: 0.75rem; }
        .td-price { font-family: 'DM Mono', monospace; font-size: 36px; color: var(--txt); font-weight: 500; margin-bottom: 0.25rem; }
        .td-price span { font-size: 16px; color: var(--txt3); }
        .td-pricing-card ul { list-style: none; margin: 1.5rem 0; display: flex; flex-direction: column; gap: 0.6rem; }
        .td-pricing-card ul li { font-size: 13px; color: var(--txt2); display: flex; align-items: center; gap: 8px; }
        .td-pricing-card ul li::before { content: '✓'; color: var(--acc); font-size: 12px; font-weight: 600; }
        .td-btn-plan { width: 100%; padding: 11px; border-radius: 8px; font-size: 14px; font-family: 'DM Sans', sans-serif; font-weight: 500; cursor: pointer; transition: all 0.2s; }
        .td-btn-plan.outline { background: transparent; color: var(--txt); border: 1px solid var(--border); }
        .td-btn-plan.outline:hover { border-color: var(--acc); color: var(--acc); }
        .td-btn-plan.solid { background: var(--acc); color: var(--bg); border: none; }
        .td-btn-plan.solid:hover { background: var(--acc2); }

        .td-cta { text-align: center; padding: 5rem 6%; background: var(--bg2); border-top: 1px solid var(--border); }
        .td-cta h2 { font-family: 'Playfair Display', serif; font-size: clamp(28px, 4vw, 42px); color: var(--txt); margin-bottom: 1rem; }
        .td-cta h2 span { color: var(--acc); }
        .td-cta p { font-size: 16px; color: var(--txt2); margin-bottom: 2rem; }

        .td-footer { padding: 2rem 6%; border-top: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; }
        .td-footer-brand { font-family: 'Playfair Display', serif; font-size: 18px; color: var(--acc); }
        .td-footer p { font-size: 13px; color: var(--txt3); }
        .td-footer-links { display: flex; gap: 1.5rem; }
        .td-footer-links a { font-size: 13px; color: var(--txt3); text-decoration: none; transition: color 0.2s; }
        .td-footer-links a:hover { color: var(--acc); }
      `}</style>

      <nav className="td-nav">
        <div className="td-nav-brand">TradeDiary</div>
        <div className="td-nav-links">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#pricing">Pricing</a>
          <button className="td-btn-nav" onClick={() => navigate('/login')}>Get Started</button>
        </div>
      </nav>

      <section className="td-hero">
        <div className="td-hero-tag">Trading Journal + Analytics</div>
        <h1>Track Every Trade.<br /><span>Grow Every Day.</span></h1>
        <p>TradeDiary helps you log trades, analyse your performance, and build better habits — all in one clean dashboard.</p>
        <div className="td-hero-btns">
          <button className="td-btn-primary" onClick={() => navigate('/register')}>Start for Free</button>
          <button className="td-btn-outline" onClick={() => navigate('/login')}>View Demo</button>
        </div>
      </section>

      <div className="td-stats-strip">
        <div className="td-stat-item"><div className="num">12,400+</div><div className="lbl">Trades Logged</div></div>
        <div className="td-stat-item"><div className="num">3,200+</div><div className="lbl">Active Traders</div></div>
        <div className="td-stat-item"><div className="num">98%</div><div className="lbl">Uptime</div></div>
        <div className="td-stat-item"><div className="num">5 min</div><div className="lbl">Setup Time</div></div>
      </div>

      <section className="td-features" id="features">
        <div className="td-section-label">What you get</div>
        <div className="td-section-title">Everything a serious trader needs</div>
        <div className="td-features-grid">
          <div className="td-feature-card"><div className="td-feature-icon">📒</div><h3>Trade Journal</h3><p>Log every trade with entry, exit, quantity, strategy, and notes. Never forget why you took a trade again.</p></div>
          <div className="td-feature-card"><div className="td-feature-icon">📊</div><h3>P&L Dashboard</h3><p>See your total P&L, win rate, and average trade performance at a glance with live calculated stats.</p></div>
          <div className="td-feature-card"><div className="td-feature-icon">🔐</div><h3>Secure Login</h3><p>Your data is private. JWT-based authentication ensures only you can access your trading history.</p></div>
          <div className="td-feature-card"><div className="td-feature-icon">📈</div><h3>Equity Curve</h3><p>Visualise your P&L over time and spot patterns in your trading behaviour with a clear equity chart.</p></div>
          <div className="td-feature-card"><div className="td-feature-icon">🌐</div><h3>Multi-Market</h3><p>Supports Stocks, Crypto, Forex, Futures, and Options — all in one unified journal.</p></div>
          <div className="td-feature-card"><div className="td-feature-icon">📤</div><h3>CSV Export</h3><p>Export all your trades to CSV for tax reporting, further analysis, or sharing with your broker.</p></div>
        </div>
      </section>

      <section className="td-how" id="how">
        <div className="td-section-label">Simple process</div>
        <div className="td-section-title">Up and running in minutes</div>
        <div className="td-steps">
          <div className="td-step"><div className="td-step-num">01</div><h4>Create Account</h4><p>Sign up for free in under 30 seconds. No credit card needed.</p></div>
          <div className="td-step"><div className="td-step-num">02</div><h4>Log Your Trades</h4><p>Enter symbol, entry, exit, quantity and strategy for each trade.</p></div>
          <div className="td-step"><div className="td-step-num">03</div><h4>View Analytics</h4><p>Your P&L, win rate, and equity curve update automatically.</p></div>
          <div className="td-step"><div className="td-step-num">04</div><h4>Improve</h4><p>Review your journal, spot mistakes, and refine your strategy.</p></div>
        </div>
      </section>

      <section className="td-pricing" id="pricing">
        <div className="td-section-label">Pricing</div>
        <div className="td-section-title">Simple, honest pricing</div>
        <div className="td-pricing-grid">
          <div className="td-pricing-card">
            <h3>Free</h3>
            <div className="td-price">$0 <span>/ mo</span></div>
            <ul><li>Up to 50 trades</li><li>P&L Dashboard</li><li>Basic journal</li><li>1 market type</li></ul>
            <button className="td-btn-plan outline" onClick={() => navigate('/register')}>Get Started</button>
          </div>
          <div className="td-pricing-card featured">
            <div className="td-featured-badge">Most Popular</div>
            <h3>Pro</h3>
            <div className="td-price">$9 <span>/ mo</span></div>
            <ul><li>Unlimited trades</li><li>Full analytics + equity curve</li><li>All market types</li><li>CSV export</li><li>Priority support</li></ul>
            <button className="td-btn-plan solid" onClick={() => navigate('/register')}>Start Pro</button>
          </div>
          <div className="td-pricing-card">
            <h3>Team</h3>
            <div className="td-price">$29 <span>/ mo</span></div>
            <ul><li>Everything in Pro</li><li>Up to 5 members</li><li>Shared trade feed</li><li>Admin dashboard</li></ul>
            <button className="td-btn-plan outline" onClick={() => navigate('/register')}>Contact Us</button>
          </div>
        </div>
      </section>

      <section className="td-cta">
        <h2>Ready to trade <span>smarter?</span></h2>
        <p>Join thousands of traders who use TradeDiary to stay accountable and grow.</p>
        <button className="td-btn-primary" onClick={() => navigate('/register')}>Create Free Account</button>
      </section>

      <footer className="td-footer">
        <div className="td-footer-brand">TradeDiary</div>
        <p>© 2026 TradeDiary. All rights reserved.</p>
        <div className="td-footer-links">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Contact</a>
        </div>
      </footer>
    </>
  );
}