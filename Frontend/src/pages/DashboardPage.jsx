import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import axios from 'axios';
import { updateProfile as saveProfile } from '../services/authService';

const API = '/api/trades';

const getCurrency = (market) => ['Stocks', 'Options', 'Futures', 'Commodities'].includes(market)
  ? { symbol: '₹', locale: 'en-IN' }
  : { symbol: '$', locale: 'en-US' };

const formatAmount = (value, market) => {
  const currency = getCurrency(market);
  return `${currency.symbol}${Math.abs(parseFloat(value) || 0).toLocaleString(currency.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

function OptPayoffChart({ opt, optResult }) {
  const chartRef = useRef(null);
  const instanceRef = useRef(null);

  useEffect(() => {
    const { spotPrice, strikePrice, premium, lots, lotSize, type, action, targetPrice } = opt;
    if (!premium || !lots || !lotSize || !strikePrice) return;

    const totalUnits = parseFloat(lots) * parseFloat(lotSize);
    const strike = parseFloat(strikePrice);
    const prem = parseFloat(premium);
    const spot = parseFloat(spotPrice);
    const range = strike * 0.06;
    const low = Math.floor(Math.min(strike - range, Number.isFinite(spot) ? spot - range * 0.25 : Infinity));
    const high = Math.ceil(Math.max(strike + range * 1.6, Number.isFinite(spot) ? spot + range * 0.25 : -Infinity));
    const step = Math.max(1, Math.round((high - low) / 100));

    const prices = [];
    for (let p = low; p <= high; p += step) prices.push(p);

    const expiryPnl = prices.map(p => {
      const intrinsic = type === 'Call' ? Math.max(0, p - strike) : Math.max(0, strike - p);
      const perUnit = action === 'Buy' ? intrinsic - prem : prem - intrinsic;
      return parseFloat((perUnit * totalUnits).toFixed(2));
    });

    const todayPnl = prices.map(p => {
      const timeVal = prem * 0.28;
      const dist = Math.abs(p - strike);
      const intrinsic = type === 'Call' ? Math.max(0, p - strike) : Math.max(0, strike - p);
      const approxNow = intrinsic + timeVal * Math.max(0, 1 - dist / range);
      const perUnit = action === 'Buy' ? approxNow - prem : prem - approxNow;
      return parseFloat((perUnit * totalUnits).toFixed(2));
    });

    const loadScript = (src, id) => new Promise(resolve => {
      if (document.getElementById(id)) { resolve(); return; }
      const s = document.createElement('script');
      s.src = src; s.id = id; s.onload = resolve;
      document.head.appendChild(s);
    });

    Promise.all([
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js', 'chartjs-cdn'),
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/chartjs-plugin-annotation/3.0.1/chartjs-plugin-annotation.min.js', 'chartjs-annotation-cdn'),
    ]).then(() => {
      if (instanceRef.current) instanceRef.current.destroy();
      const canvas = chartRef.current;
      if (!canvas) return;

      const segmentColorPlugin = {
        id: 'segmentColor',
        beforeDatasetDraw(chart, args) {
          if (args.index !== 0) return;
          const { ctx: c, chartArea, scales } = chart;
          const meta = chart.getDatasetMeta(0);
          if (!meta.data.length) return;
          c.save();
          c.beginPath();
          c.rect(chartArea.left, chartArea.top, chartArea.width, chartArea.height);
          c.clip();
          const zeroY = scales.y.getPixelForValue(0);
          c.beginPath();
          c.moveTo(meta.data[0].x, Math.min(meta.data[0].y, zeroY));
          meta.data.forEach((pt, i) => { if (i > 0) c.lineTo(pt.x, Math.min(pt.y, zeroY)); });
          c.lineTo(meta.data[meta.data.length - 1].x, zeroY);
          c.lineTo(meta.data[0].x, zeroY);
          c.closePath();
          c.fillStyle = 'rgba(0,212,170,0.13)';
          c.fill();
          c.beginPath();
          c.moveTo(meta.data[0].x, Math.max(meta.data[0].y, zeroY));
          meta.data.forEach((pt, i) => { if (i > 0) c.lineTo(pt.x, Math.max(pt.y, zeroY)); });
          c.lineTo(meta.data[meta.data.length - 1].x, zeroY);
          c.lineTo(meta.data[0].x, zeroY);
          c.closePath();
          c.fillStyle = 'rgba(255,107,107,0.13)';
          c.fill();
          c.restore();
        },
        afterDatasetsDraw(chart) {
          const { ctx: c, chartArea, scales } = chart;
          const meta = chart.getDatasetMeta(0);
          if (!meta.data.length) return;
          const zeroY = scales.y.getPixelForValue(0);
          c.save();
          c.beginPath();
          c.rect(chartArea.left, chartArea.top, chartArea.width, chartArea.height);
          c.clip();
          c.lineWidth = 2.5;
          c.lineJoin = 'round';
          for (let i = 1; i < meta.data.length; i++) {
            const prev = meta.data[i - 1];
            const curr = meta.data[i];
            const avgY = (prev.y + curr.y) / 2;
            c.beginPath();
            c.moveTo(prev.x, prev.y);
            c.lineTo(curr.x, curr.y);
            c.strokeStyle = avgY < zeroY ? '#00d4aa' : '#ff6b6b';
            c.stroke();
          }
          c.restore();
        },
      };

      const annotations = {};
      const breakeven = parseFloat(optResult.breakeven);
      if (!isNaN(breakeven) && breakeven >= low && breakeven <= high) {
        annotations.be = {
          type: 'line', xMin: breakeven, xMax: breakeven,
          borderColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderDash: [4, 4],
          label: {
            content: 'BE ₹' + Math.round(breakeven).toLocaleString('en-IN'),
            display: true, position: 'end',
            backgroundColor: 'rgba(10,22,40,0.85)', color: '#7a9ab8', font: { size: 10 },
            padding: { x: 6, y: 3 }, borderRadius: 4,
          }
        };
      }
      const tgt = parseFloat(targetPrice);
      if (targetPrice && !isNaN(tgt) && tgt >= low && tgt <= high) {
        annotations.target = {
          type: 'line', xMin: tgt, xMax: tgt,
          borderColor: '#ff6b6b', borderWidth: 1.5, borderDash: [5, 3],
          label: {
            content: 'Target ₹' + Math.round(tgt).toLocaleString('en-IN'),
            display: true, position: 'start',
            backgroundColor: 'rgba(255,107,107,0.9)', color: '#fff', font: { size: 10 },
            padding: { x: 6, y: 3 }, borderRadius: 4,
          }
        };
      }
      annotations.zero = {
        type: 'line', yMin: 0, yMax: 0,
        borderColor: 'rgba(255,255,255,0.12)', borderWidth: 1,
      };
      if (Number.isFinite(spot) && spot >= low && spot <= high) {
        annotations.spot = {
          type: 'line', xMin: spot, xMax: spot,
          borderColor: '#00d4aa', borderWidth: 1.5, borderDash: [3, 3],
          label: { content: 'Spot ₹' + Math.round(spot).toLocaleString('en-IN'), display: true, position: 'start', backgroundColor: 'rgba(0,212,170,.88)', color: '#06131e', font: { size: 10, weight: '600' }, padding: { x: 6, y: 3 }, borderRadius: 4 },
        };
      }

      instanceRef.current = new window.Chart(canvas, {
        type: 'line',
        plugins: [segmentColorPlugin],
        data: {
          datasets: [
            {
              label: 'At expiry', data: prices.map((price, index) => ({ x: price, y: expiryPnl[index] })),
              borderColor: 'transparent', backgroundColor: 'transparent',
              borderWidth: 0, pointRadius: 0, fill: false, tension: 0,
            },
            {
              label: 'Today', data: prices.map((price, index) => ({ x: price, y: todayPnl[index] })),
              borderColor: '#4a9eff', backgroundColor: 'transparent',
              borderWidth: 1.5, pointRadius: 0, borderDash: [5, 3], fill: false, tension: 0.3,
            },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false, normalized: true,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: false },
            annotation: { annotations },
            tooltip: {
              backgroundColor: 'rgba(10,22,40,0.95)', borderColor: 'rgba(0,212,170,0.2)',
              borderWidth: 1, titleColor: '#7a9ab8', bodyColor: '#e2eff8', padding: 10,
              cornerRadius: 8,
              callbacks: {
                title: ctx => { const num = ctx[0]?.parsed?.x; return Number.isFinite(num) ? '₹' + Math.round(num).toLocaleString('en-IN') : ''; },
                label: ctx => { const v = ctx.parsed.y; const sign = v >= 0 ? '+' : ''; const abs = Math.abs(v); const fmt = abs >= 1000 ? (abs / 1000).toFixed(1) + 'K' : abs.toFixed(0); return ' ' + ctx.dataset.label + ':  ' + sign + '₹' + fmt; },
                labelColor: ctx => ({ borderColor: 'transparent', backgroundColor: ctx.datasetIndex === 0 ? (ctx.parsed.y >= 0 ? '#00d4aa' : '#ff6b6b') : '#4a9eff', borderRadius: 3 }),
              },
            },
          },
          scales: {
            x: { type: 'linear', title: { display: true, text: 'Underlying price (₹)', color: '#7a9ab8', font: { size: 12, weight: '500' } }, ticks: { color: '#7a9ab8', font: { size: 11 }, callback: v => '₹' + Number(v).toLocaleString('en-IN'), maxTicksLimit: 8 }, grid: { color: 'rgba(122,154,184,0.08)' }, border: { color: 'rgba(255,255,255,0.10)' } },
            y: { title: { display: true, text: 'P&L (₹)', color: '#7a9ab8', font: { size: 12, weight: '500' } }, ticks: { color: '#7a9ab8', font: { size: 11 }, callback: v => { const a = Math.abs(v); const s = v < 0 ? '-' : '+'; return s + '₹' + (a >= 1000 ? (a / 1000).toFixed(1) + 'K' : a); }, maxTicksLimit: 7 }, grid: { color: 'rgba(122,154,184,0.08)' }, border: { color: 'rgba(255,255,255,0.10)' } },
          },
        },
      });
    });

    return () => { if (instanceRef.current) { instanceRef.current.destroy(); instanceRef.current = null; } };
  }, [opt, optResult]);

  return (
    <div className="payoff-chart">
      <div className="payoff-chart-legend">
        <span style={{ fontSize: 10, color: 'var(--txt3)', fontFamily: 'JetBrains Mono', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Payoff Graph</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--txt3)' }}>
          <span style={{ width: 18, height: 2.5, background: 'linear-gradient(to right,#ff6b6b,#00d4aa)', display: 'inline-block', borderRadius: 2 }}></span>At expiry
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--txt3)' }}>
          <span style={{ width: 18, height: 0, borderTop: '2px dashed #4a9eff', display: 'inline-block' }}></span>Today
        </span>
        {opt.targetPrice && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--txt3)' }}>
            <span style={{ width: 2, height: 14, background: '#ff6b6b', display: 'inline-block', borderRadius: 2 }}></span>Target
          </span>
        )}
      </div>
      <div className="payoff-chart-canvas">
        <canvas ref={chartRef} role="img" aria-label="Options payoff graph"></canvas>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, token, logout, updateUser } = useAuthStore();
  const [trades, setTrades]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [editTrade, setEditTrade] = useState(null);
  const [activePage, setActivePage] = useState('journal');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [profileForm, setProfileForm] = useState(() => ({ name: user?.name || '', email: user?.email || '', username: user?.username || '', phone: user?.phone || '', dateOfBirth: user?.dateOfBirth || '', avatar: user?.avatar || '' }));
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');

  const emptyForm = {
    symbol: '', market: 'Stocks', direction: 'Long',
    entryPrice: '', exitPrice: '', quantity: '', leverage: 1,
    date: new Date().toISOString().split('T')[0], exitDate: new Date().toISOString().split('T')[0],
    strategy: '', brokerage: '', notes: '',
  };

  const [form, setForm] = useState(emptyForm);

  const [opt, setOpt] = useState({
    spotPrice: '', strikePrice: '', premium: '', lots: '', lotSize: '',
    type: 'Call', action: 'Buy', targetPrice: ''
  });
  const [share, setShare] = useState({ buyPrice: '', quantity: '', sellPrice: '', brokerage: '20' });
  const [notes, setNotes] = useState(() => {
    try { return JSON.parse(localStorage.getItem('trading_notes') || '[]'); } catch { return []; }
  });
  const [noteForm, setNoteForm] = useState({ title: '', body: '', tag: 'General' });
  const [showNoteForm, setShowNoteForm] = useState(false);

  // ── LEDGER STATE ──
  const [ledger, setLedger] = useState(() => {
    try { return JSON.parse(localStorage.getItem('trading_ledger') || '[]'); } catch { return []; }
  });
  const [ledgerForm, setLedgerForm] = useState({
    type: 'Deposit', amount: '', note: '', date: new Date().toISOString().split('T')[0]
  });
  const [ledgerFormOpen, setLedgerFormOpen] = useState(false);
  const investedAmount = ledger.filter(entry => entry.type === 'Deposit').reduce((sum, entry) => sum + entry.amount, 0);

  const canvasRef = useRef(null);
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => { fetchTrades(); }, []);
  useEffect(() => { if (trades.length && activePage === 'journal') setTimeout(drawChart, 100); }, [trades, activePage]);

  const fetchTrades = async () => {
    try {
      const { data } = await axios.get(API, { headers });
      setTrades(data);
    } catch { } finally { setLoading(false); }
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const closeModal = () => { setShowForm(false); setEditTrade(null); setForm(emptyForm); };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try { await axios.post(API, form, { headers }); closeModal(); fetchTrades(); } catch { } finally { setSubmitting(false); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try { await axios.put(`${API}/${editTrade._id}`, form, { headers }); closeModal(); fetchTrades(); } catch { } finally { setSubmitting(false); }
  };

  const openEdit = (t) => {
    setEditTrade(t);
    setForm({
      symbol: t.symbol, market: t.market, direction: t.direction,
      entryPrice: t.entryPrice, exitPrice: t.exitPrice, quantity: t.quantity,
      leverage: t.leverage ?? 1,
      date: t.date?.split('T')[0] ?? t.date,
      exitDate: t.exitDate?.split('T')[0] ?? t.exitDate ?? t.date?.split('T')[0] ?? t.date,
      strategy: t.strategy || '', brokerage: t.brokerage ?? '', notes: t.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    try { await axios.delete(`${API}/${id}`, { headers }); fetchTrades(); } catch { } finally { setDeleteId(null); }
  };

  const calcPnL = (t) => {
    const diff = t.direction === 'Short'
      ? (parseFloat(t.entryPrice) - parseFloat(t.exitPrice))
      : (parseFloat(t.exitPrice) - parseFloat(t.entryPrice));
    const leverage = ['Forex', 'Crypto'].includes(t.market) ? parseFloat(t.leverage || 1) : 1;
    return diff * parseFloat(t.quantity) * leverage - parseFloat(t.brokerage || 0);
  };

  // ── CHANGE 4: modal live P&L preview helper ──
  const rupeeTradePnL = trades.filter(trade => !['Crypto', 'Forex'].includes(trade.market)).reduce((sum, trade) => sum + calcPnL(trade), 0);
  const currentAmount = investedAmount + rupeeTradePnL;

  const modalPnL = (() => {
    const entry = parseFloat(form.entryPrice);
    const exit  = parseFloat(form.exitPrice);
    const qty   = parseFloat(form.quantity);
    if (!form.entryPrice || !form.exitPrice || !form.quantity) return null;
    const diff  = form.direction === 'Short' ? entry - exit : exit - entry;
    const leverage = ['Forex', 'Crypto'].includes(form.market) ? parseFloat(form.leverage || 1) : 1;
    const gross = diff * qty * leverage;
    const net = gross - parseFloat(form.brokerage || 0);
    return { net: net.toFixed(2) };
  })();

  const stats = (() => {
    if (!trades.length) return { total: 0, wins: 0, losses: 0, winRate: 0, totalPnL: 0, bestTrade: 0, worstTrade: 0, avgPnL: 0 };
    const pnls = trades.map(calcPnL);
    const totalPnL = pnls.reduce((a, b) => a + b, 0);
    const wins = pnls.filter(p => p > 0).length;
    const losses = pnls.filter(p => p < 0).length;
    const bestTrade = Math.max(...pnls);
    const worstTrade = Math.min(...pnls);
    return { total: trades.length, wins, losses, winRate: ((wins / trades.length) * 100).toFixed(1), totalPnL: totalPnL.toFixed(2), bestTrade: bestTrade.toFixed(2), worstTrade: worstTrade.toFixed(2), avgPnL: (totalPnL / trades.length).toFixed(2) };
  })();

  const dateKey = (date) => {
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date)) return date.slice(0, 10);
    const value = new Date(date);
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  };

  const formatCalendarPnL = (value) => `${value >= 0 ? '+' : '−'}${Math.abs(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const dailyTradeSummary = trades.reduce((summary, trade) => {
    const key = dateKey(trade.exitDate || trade.date);
    const existing = summary[key] || { count: 0, pnl: 0, markets: new Set() };
    existing.count += 1;
    existing.pnl += calcPnL(trade);
    existing.markets.add(trade.market);
    summary[key] = existing;
    return summary;
  }, {});

  const drawChart = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width = canvas.offsetWidth;
    const H = canvas.height = 160;
    ctx.clearRect(0, 0, W, H);
    const sorted = [...trades].sort((a, b) => new Date(a.exitDate || a.date) - new Date(b.exitDate || b.date));
    let running = 0;
    const points = [0, ...sorted.map(t => { running += calcPnL(t); return running; })];
    const min = Math.min(...points); const max = Math.max(...points);
    const range = max - min || 1;
    const pad = 20;
    const xs = points.map((_, i) => pad + (i / (points.length - 1)) * (W - pad * 2));
    const ys = points.map(v => H - pad - ((v - min) / range) * (H - pad * 2));
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, 'rgba(0,212,170,0.18)');
    grad.addColorStop(1, 'rgba(0,212,170,0)');
    ctx.beginPath(); ctx.moveTo(xs[0], ys[0]);
    xs.forEach((x, i) => { if (i > 0) ctx.lineTo(x, ys[i]); });
    ctx.lineTo(xs[xs.length - 1], H); ctx.lineTo(xs[0], H);
    ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
    ctx.beginPath(); ctx.moveTo(xs[0], ys[0]);
    xs.forEach((x, i) => { if (i > 0) ctx.lineTo(x, ys[i]); });
    ctx.strokeStyle = '#00d4aa'; ctx.lineWidth = 2; ctx.stroke();
    xs.forEach((x, i) => { ctx.beginPath(); ctx.arc(x, ys[i], 3, 0, Math.PI * 2); ctx.fillStyle = '#00d4aa'; ctx.fill(); });
  };

  const handleLogout = () => { logout(); navigate('/'); };

  const handleAvatarUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 1000000) { setProfileMessage('Choose an image smaller than 1 MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => setProfileForm(current => ({ ...current, avatar: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleProfileSave = async (event) => {
    event.preventDefault(); setProfileSaving(true); setProfileMessage('');
    try { const { data } = await saveProfile(profileForm); updateUser(data); setProfileForm(data); setProfileMessage('Profile saved.'); }
    catch (error) { setProfileMessage(error.response?.data?.message || 'Unable to save profile.'); }
    finally { setProfileSaving(false); }
  };

  const fmt = (n) => { const v = parseFloat(n); return (v >= 0 ? '+' : '') + v.toFixed(2); };

  const downloadPnlStatement = () => {
    const esc = (value) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
    const running = { INR: 0, USD: 0 };
    const rows = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date)).map((t, index) => {
      const diff  = t.direction === 'Short' ? (parseFloat(t.entryPrice) - parseFloat(t.exitPrice)) : (parseFloat(t.exitPrice) - parseFloat(t.entryPrice));
      const leverage = ['Forex', 'Crypto'].includes(t.market) ? parseFloat(t.leverage || 1) : 1;
      const gross = diff * parseFloat(t.quantity) * leverage;
      const currency = ['Forex', 'Crypto'].includes(t.market) ? 'USD' : 'INR'; const symbol = currency === 'USD' ? '$' : '₹'; const investment = parseFloat(t.entryPrice) * parseFloat(t.quantity) * leverage; const pnl = gross - parseFloat(t.brokerage || 0); running[currency] += pnl;
      return [index + 1, new Date(t.date).toLocaleDateString('en-GB'), t.symbol, `${symbol}${Number(t.entryPrice).toFixed(2)}`, `${symbol}${Number(t.exitPrice).toFixed(2)}`, t.quantity, `${symbol}${investment.toFixed(2)}`, `${pnl >= 0 ? '+' : '−'}${symbol}${Math.abs(pnl).toFixed(2)}`, `${investment ? ((pnl / investment) * 100).toFixed(1) : '0.0'}%`, `${symbol}${running[currency].toFixed(2)}`, pnl >= 0 ? 'profit' : 'loss'];
    });
    const headers = ['Sr no.', 'Date', 'Trade', 'Buy Price', 'Sell Price', 'Qty', 'Investment', 'Profit/Loss', 'P/L%', 'Cumulative'];
    const tableRows = rows.map(row => `<tr class="${row[10]}">${row.slice(0, 10).map(value => `<td>${esc(value)}</td>`).join('')}</tr>`).join('');
    const sheet = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Calibri,Arial;color:#111}h1{font-size:18px}table{border-collapse:collapse}th{font-weight:bold}th,td{border:1px solid #cfcfcf;padding:5px 12px;text-align:center}.profit td:nth-child(9),.profit td:nth-child(10),.profit td:nth-child(11){background:#c6efce;color:#006100}.loss td:nth-child(9),.loss td:nth-child(10),.loss td:nth-child(11){background:#ffc7ce;color:#9c0006}</style></head><body><h1>TradeDiary P&L Statement</h1><table><thead><tr>${headers.map(header => `<th>${header}</th>`).join('')}</tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
    const blob = new Blob([sheet], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a');
    link.href = url; link.download = `TradeDiary-PnL-Statement-${new Date().toISOString().slice(0, 10)}.xls`; link.click(); URL.revokeObjectURL(url);
  };

  const optResult = (() => {
    const { spotPrice, strikePrice, premium, lots, lotSize, type, action, targetPrice } = opt;
    if (!premium || !lots || !lotSize) return null;
    const totalUnits = parseFloat(lots) * parseFloat(lotSize);
    const totalPremium = parseFloat(premium) * totalUnits;
    const calcIntrinsic = (price) => type === 'Call' ? Math.max(0, parseFloat(price || 0) - parseFloat(strikePrice || 0)) : Math.max(0, parseFloat(strikePrice || 0) - parseFloat(price || 0));
    const calcPnlFull = (price) => { const intrinsic = calcIntrinsic(price); const perUnit = action === 'Buy' ? intrinsic - parseFloat(premium) : parseFloat(premium) - intrinsic; return perUnit * totalUnits; };
    const intrinsic = calcIntrinsic(spotPrice || strikePrice);
    const pnl = calcPnlFull(spotPrice || strikePrice);
    const breakeven = type === 'Call' ? (action === 'Buy' ? parseFloat(strikePrice || 0) + parseFloat(premium) : parseFloat(strikePrice || 0) - parseFloat(premium)) : (action === 'Buy' ? parseFloat(strikePrice || 0) - parseFloat(premium) : parseFloat(strikePrice || 0) + parseFloat(premium));
    const isBuyUnlimited = (type === 'Call' && action === 'Buy') || (type === 'Put' && action === 'Sell');
    const maxLoss = (parseFloat(premium) * totalUnits).toFixed(2);
    const maxProfit = isBuyUnlimited ? 'Unlimited' : (parseFloat(premium) * totalUnits).toFixed(2);
    const targetPnl = targetPrice ? calcPnlFull(targetPrice).toFixed(2) : null;
    return { totalPremium: totalPremium.toFixed(2), intrinsic: intrinsic.toFixed(2), pnl: pnl.toFixed(2), breakeven: breakeven.toFixed(2), maxLoss, maxProfit, targetPnl };
  })();

  const shareResult = (() => {
    const { buyPrice, quantity, sellPrice, brokerage } = share;
    if (!buyPrice || !quantity || !sellPrice) return null;
    const invested = parseFloat(buyPrice) * parseFloat(quantity);
    const returns = parseFloat(sellPrice) * parseFloat(quantity);
    const brokerageFee = parseFloat(brokerage || 0) * 2;
    const pnl = returns - invested - brokerageFee;
    const pct = ((pnl / invested) * 100).toFixed(2);
    return { invested: invested.toFixed(2), returns: returns.toFixed(2), brokerageFee: brokerageFee.toFixed(2), pnl: pnl.toFixed(2), pct };
  })();

  const saveNote = () => {
    if (!noteForm.title || !noteForm.body) return;
    const updated = [{ id: Date.now(), ...noteForm, date: new Date().toLocaleDateString() }, ...notes];
    setNotes(updated);
    localStorage.setItem('trading_notes', JSON.stringify(updated));
    setNoteForm({ title: '', body: '', tag: 'General' });
    setShowNoteForm(false);
  };
  const deleteNote = (id) => {
    const updated = notes.filter(n => n.id !== id);
    setNotes(updated);
    localStorage.setItem('trading_notes', JSON.stringify(updated));
  };

  // ── LEDGER HELPERS ──
  const saveLedgerEntry = () => {
    if (!ledgerForm.amount || parseFloat(ledgerForm.amount) <= 0) return;
    const entry = {
      id: Date.now(),
      type: ledgerForm.type,
      amount: parseFloat(ledgerForm.amount),
      note: ledgerForm.note,
      date: ledgerForm.date,
      currency: 'INR',
      source: 'manual',
    };
    const updated = [entry, ...ledger];
    setLedger(updated);
    localStorage.setItem('trading_ledger', JSON.stringify(updated));
    setLedgerForm({ type: ledgerForm.type, amount: '', note: '', date: new Date().toISOString().split('T')[0] });
    setLedgerFormOpen(false);
  };

  const deleteLedgerEntry = (id) => {
    const updated = ledger.filter(e => e.id !== id);
    setLedger(updated);
    localStorage.setItem('trading_ledger', JSON.stringify(updated));
  };

  const navItems = [
    { id: 'journal', icon: '📒', label: 'Trading Journal' },
    { id: 'calendar', icon: '🗓️', label: 'Trade Calendar' },
    { id: 'options', icon: '⚙️',  label: 'Option Calculator' },
    { id: 'shares',  icon: '🧮', label: 'Share Calculator' },
    { id: 'notes',   icon: '📝', label: 'Trading Notes' },
    { id: 'ledger',  icon: '📔', label: 'Ledger' },
    { id: 'history', icon: '📜', label: 'Trade History' },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600&family=Outfit:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        :root{
          --bg:#080d1a;--bg2:#0c1424;--panel:#0a1628;
          --acc:#00d4aa;--acc2:#00b894;--acc-dim:rgba(0,212,170,0.10);
          --txt:#e2eff8;--txt2:#7a9ab8;--txt3:#3d5a78;
          --border:rgba(0,212,170,0.12);--border2:rgba(0,212,170,0.25);
          --red:#ff6b6b;--green:#00d4aa;--red-dim:rgba(255,107,107,0.1);
          --glow:0 0 40px rgba(0,212,170,0.06);
          --gold:#f0b429;--gold-dim:rgba(240,180,41,0.10);
        }
        .db-root{min-height:100vh;background:var(--bg);font-family:'Outfit',sans-serif;color:var(--txt);display:flex;flex-direction:column;}
        .db-root::before{content:'';position:fixed;inset:0;background-image:linear-gradient(rgba(0,212,170,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,170,0.025) 1px,transparent 1px);background-size:60px 60px;pointer-events:none;z-index:0;}
        .db-nav{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:0.65rem 1.5rem;background:rgba(8,13,26,0.92);border-bottom:1px solid var(--border);position:sticky;top:0;z-index:100;backdrop-filter:blur(12px);}
        .db-brand{font-family:'Cormorant Garamond',serif;font-size:20px;color:var(--acc);letter-spacing:0.5px;grid-column:2;text-align:center;}
        .db-nav-right{display:flex;align-items:center;gap:0.75rem;justify-content:flex-end;grid-column:3;}
        .db-nav-left{grid-column:1;display:flex;align-items:center;gap:10px;}
        .db-user{display:flex;align-items:center;gap:8px;}
        .db-avatar{width:30px;height:30px;border-radius:50%;background:var(--acc-dim);border:1px solid var(--border2);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:var(--acc);font-family:'JetBrains Mono',monospace;}
        .db-username{font-size:12px;color:var(--txt2);font-family:'Outfit',sans-serif;}
        .db-btn-sm{background:transparent;border:1px solid var(--border);border-radius:7px;padding:6px 12px;font-size:12px;color:var(--txt2);cursor:pointer;font-family:'Outfit',sans-serif;transition:all 0.2s;white-space:nowrap;}
        .db-btn-sm:hover{border-color:var(--border2);color:var(--txt);}
        .db-body{display:flex;flex:1;position:relative;z-index:1;}
        .db-sidebar{width:220px;min-width:220px;background:rgba(10,22,40,0.95);border-right:1px solid var(--border);display:flex;flex-direction:column;padding:1.5rem 0;position:sticky;top:57px;height:calc(100vh - 57px);overflow-y:auto;}
        .db-sidebar-label{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--txt3);font-family:'JetBrains Mono',monospace;padding:0 1.25rem;margin-bottom:0.5rem;margin-top:1rem;}
        .db-sidebar-label:first-child{margin-top:0;}
        .db-nav-item{display:flex;align-items:center;gap:10px;padding:0.65rem 1.25rem;cursor:pointer;transition:all 0.2s;border-left:2px solid transparent;margin:1px 0;font-size:13px;color:var(--txt2);font-family:'Outfit',sans-serif;}
        .db-nav-item:hover{background:var(--acc-dim);color:var(--txt);border-left-color:var(--border2);}
        .db-nav-item.active{background:var(--acc-dim);color:var(--acc);border-left-color:var(--acc);font-weight:500;}
        .db-nav-item .ni{font-size:15px;width:20px;text-align:center;}
        .db-sidebar-bottom{margin-top:auto;padding:1rem 1.25rem;border-top:1px solid var(--border);}
        .db-profile-btn{width:100%;background:transparent;border:1px solid var(--border);border-radius:8px;padding:8px;font-size:12px;color:var(--txt2);cursor:pointer;font-family:'Outfit',sans-serif;transition:all 0.2s;margin-bottom:0.5rem;text-align:left;}
        .db-profile-btn:hover,.db-profile-btn.active{border-color:var(--border2);color:var(--acc);background:var(--acc-dim);}
        .db-logout-btn{width:100%;background:transparent;border:1px solid var(--border);border-radius:8px;padding:8px;font-size:12px;color:var(--txt3);cursor:pointer;font-family:'Outfit',sans-serif;transition:all 0.2s;}
        .db-logout-btn:hover{border-color:rgba(255,107,107,0.3);color:var(--red);}
        .db-main{flex:1;padding:2rem;overflow-y:auto;min-width:0;}
        .db-page-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:2rem;flex-wrap:wrap;gap:1rem;}
        .db-page-header h1{font-family:'Cormorant Garamond',serif;font-size:28px;color:var(--txt);font-weight:600;}
        .db-page-header p{font-size:13px;color:var(--txt2);margin-top:2px;font-weight:300;}
        .db-btn-acc{background:var(--acc);border:none;border-radius:8px;padding:9px 18px;font-size:13px;font-weight:500;color:#050d18;cursor:pointer;font-family:'Outfit',sans-serif;transition:all 0.2s;white-space:nowrap;position:relative;overflow:hidden;}
        .db-btn-acc:hover{background:var(--acc2);transform:translateY(-1px);box-shadow:0 6px 20px rgba(0,212,170,0.25);}
        .db-btn-acc::after{content:'';position:absolute;top:0;left:-100%;width:100%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent);transition:left 0.4s;}
        .db-btn-acc:hover::after{left:100%;}
        .db-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:1rem;margin-bottom:2rem;}
        .db-stat{background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:1.25rem 1.5rem;position:relative;overflow:hidden;transition:border-color 0.2s,transform 0.2s;box-shadow:var(--glow);}
        .db-stat:hover{border-color:var(--border2);transform:translateY(-2px);}
        .db-stat::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;}
        .db-stat.green::before{background:linear-gradient(to right,transparent,var(--acc),transparent);}
        .db-stat.red::before{background:linear-gradient(to right,transparent,var(--red),transparent);}
        .db-stat.blue::before{background:linear-gradient(to right,transparent,#4a9eff,transparent);}
        .db-stat.yellow::before{background:linear-gradient(to right,transparent,#ffd93d,transparent);}
        .db-stat-label{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--txt3);font-family:'JetBrains Mono',monospace;margin-bottom:0.6rem;}
        .db-stat-value{font-family:'JetBrains Mono',monospace;font-size:24px;font-weight:500;line-height:1;}
        .db-stat-value.pos{color:var(--acc);}
        .db-stat-value.neg{color:var(--red);}
        .db-stat-value.neu{color:var(--txt);}
        .db-stat-sub{font-size:11px;color:var(--txt3);margin-top:6px;}
        .db-grid{display:grid;grid-template-columns:1fr 320px;gap:1.5rem;margin-bottom:1.5rem;}
        @media(max-width:1024px){.db-grid{grid-template-columns:1fr;}}
        .db-card{background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:1.5rem;box-shadow:var(--glow);position:relative;overflow:hidden;}
        .db-card::before{content:'';position:absolute;top:0;left:20%;right:20%;height:1px;background:linear-gradient(to right,transparent,var(--border2),transparent);}
        .db-card-title{font-size:14px;font-weight:500;color:var(--txt);margin-bottom:1rem;display:flex;align-items:center;justify-content:space-between;font-family:'Outfit',sans-serif;}
        .db-card-title span{font-size:11px;color:var(--txt3);font-family:'JetBrains Mono',monospace;}
        .db-canvas-wrap{position:relative;height:160px;}
        .db-canvas-wrap canvas{width:100%;height:160px;display:block;}
        .db-wl{display:flex;align-items:center;gap:1.5rem;margin-top:0.5rem;}
        .db-donut{position:relative;width:100px;height:100px;}
        .db-donut svg{transform:rotate(-90deg);}
        .db-donut-label{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;}
        .db-donut-label .big{font-family:'JetBrains Mono',monospace;font-size:18px;color:var(--acc);font-weight:500;}
        .db-donut-label .sm{font-size:10px;color:var(--txt3);}
        .db-wl-legend{display:flex;flex-direction:column;gap:0.6rem;}
        .db-wl-row{display:flex;align-items:center;gap:8px;font-size:13px;}
        .db-wl-dot{width:7px;height:7px;border-radius:50%;}
        .db-breakdown{display:flex;flex-direction:column;gap:0.75rem;margin-top:0.5rem;}
        .db-bk-item{display:flex;align-items:center;gap:10px;}
        .db-bk-label{font-size:12px;color:var(--txt2);width:70px;}
        .db-bk-bar-wrap{flex:1;height:5px;background:rgba(255,255,255,0.04);border-radius:3px;overflow:hidden;}
        .db-bk-bar{height:100%;border-radius:3px;background:var(--acc);transition:width 0.6s;}
        .db-bk-val{font-size:11px;font-family:'JetBrains Mono',monospace;color:var(--txt3);width:30px;text-align:right;}
        .db-table-wrap{overflow-x:auto;margin-top:0.5rem;}
        table{width:100%;border-collapse:collapse;font-size:13px;}
        thead tr{border-bottom:1px solid var(--border);}
        th{text-align:left;padding:8px 12px;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--txt3);font-family:'JetBrains Mono',monospace;font-weight:400;}
        tbody tr{border-bottom:1px solid rgba(255,255,255,0.03);transition:background 0.15s;}
        tbody tr:hover{background:rgba(255,255,255,0.02);}
        td{padding:10px 12px;color:var(--txt2);font-size:13px;}
        td.sym{color:var(--txt);font-weight:500;font-family:'JetBrains Mono',monospace;}
        td.pos{color:var(--green);}
        td.neg{color:var(--red);}
        .db-badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-family:'JetBrains Mono',monospace;}
        .db-badge.long{background:rgba(0,212,170,0.1);color:var(--acc);border:1px solid var(--border2);}
        .db-badge.short{background:rgba(255,107,107,0.1);color:var(--red);border:1px solid rgba(255,107,107,0.2);}
        .db-action-btns{display:flex;align-items:center;gap:4px;}
        .db-edit-btn{background:transparent;border:none;cursor:pointer;color:var(--txt3);font-size:14px;padding:2px 6px;border-radius:4px;transition:color 0.2s,background 0.2s;}
        .db-edit-btn:hover{color:var(--acc);background:var(--acc-dim);}
        .db-del-btn{background:transparent;border:none;cursor:pointer;color:var(--txt3);font-size:14px;padding:2px 6px;border-radius:4px;transition:color 0.2s;}
        .db-del-btn:hover{color:var(--red);}
        .db-empty{text-align:center;padding:3rem;color:var(--txt3);}
        .db-empty .icon{font-size:36px;margin-bottom:0.75rem;display:block;}
        .db-empty p{font-size:13px;}
        .calc-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem;}
        .options-layout{max-width:1240px;display:grid;grid-template-columns:minmax(390px,.9fr) minmax(460px,1.1fr);gap:1.25rem;align-items:start;}.options-layout .db-card{margin:0;padding:1.15rem;}.options-layout .calc-grid{gap:.75rem;}.options-layout .calc-result{padding:1rem;margin-top:1rem;}.options-layout .calc-result-grid{gap:.75rem;}.options-chart-card{display:flex;flex-direction:column;min-height:0;}.payoff-chart{display:flex;flex-direction:column;}.payoff-chart-legend{display:flex;align-items:center;gap:16px;margin-bottom:10px;flex-wrap:wrap;}.payoff-chart-canvas{position:relative;height:330px;background:linear-gradient(180deg,rgba(12,27,46,.72),rgba(8,16,30,.48));border-radius:10px;padding:12px 8px 8px;border:1px solid rgba(122,154,184,.16);box-shadow:inset 0 1px 0 rgba(255,255,255,.025);}.payoff-chart-canvas canvas{width:100% !important;height:100% !important;}@media(max-width:1100px){.options-layout{grid-template-columns:1fr;max-width:780px;}.payoff-chart-canvas{height:360px;}}@media(max-width:560px){.calc-grid{grid-template-columns:1fr;}.payoff-chart-canvas{height:280px;}.payoff-chart-legend{gap:10px;}}
        .calc-full{grid-column:1/-1;}
        .calc-fg{display:flex;flex-direction:column;gap:5px;}
        .calc-lbl{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--txt3);font-family:'JetBrains Mono',monospace;}
        .calc-inp,.calc-sel{background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;padding:10px 12px;font-size:13px;color:var(--txt);font-family:'Outfit',sans-serif;outline:none;transition:border-color 0.2s,box-shadow 0.2s;width:100%;}
        .calc-inp:focus,.calc-sel:focus{border-color:var(--acc);box-shadow:0 0 0 3px rgba(0,212,170,0.08);}
        .calc-inp::placeholder{color:var(--txt3);}
        .calc-sel option{background:#0a1628;}
        .calc-result{background:rgba(0,212,170,0.05);border:1px solid var(--border2);border-radius:12px;padding:1.5rem;margin-top:1.5rem;}
        .calc-result-title{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--txt3);font-family:'JetBrains Mono',monospace;margin-bottom:1rem;}
        .calc-result-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:1rem;}
        .calc-res-item{display:flex;flex-direction:column;gap:3px;}
        .calc-res-label{font-size:11px;color:var(--txt3);}
        .calc-res-value{font-family:'JetBrains Mono',monospace;font-size:20px;font-weight:500;}
        .calc-res-value.pos{color:var(--acc);}
        .calc-res-value.neg{color:var(--red);}
        .calc-res-value.neu{color:var(--txt);}
        .notes-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem;margin-top:1rem;}
        .note-card{background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:1.25rem;transition:border-color 0.2s,transform 0.2s;position:relative;}
        .note-card:hover{border-color:var(--border2);transform:translateY(-2px);}
        .note-card-top{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:0.5rem;}
        .note-title{font-size:14px;font-weight:500;color:var(--txt);}
        .note-tag{font-size:10px;font-family:'JetBrains Mono',monospace;color:var(--acc);background:var(--acc-dim);border:1px solid var(--border2);padding:2px 8px;border-radius:4px;letter-spacing:1px;text-transform:uppercase;}
        .note-body{font-size:13px;color:var(--txt2);line-height:1.6;margin-bottom:0.75rem;font-weight:300;}
        .note-date{font-size:11px;color:var(--txt3);font-family:'JetBrains Mono',monospace;}
        .note-del{position:absolute;top:0.75rem;right:0.75rem;background:transparent;border:none;cursor:pointer;color:var(--txt3);font-size:14px;transition:color 0.2s;}
        .note-del:hover{color:var(--red);}
        .note-form-card{background:var(--panel);border:1px solid var(--border2);border-radius:14px;padding:1.5rem;margin-bottom:1.5rem;position:relative;}
        .note-form-card::before{content:'';position:absolute;top:0;left:20%;right:20%;height:1px;background:linear-gradient(to right,transparent,var(--acc),transparent);}
        .note-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;}
        .note-ta{background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;padding:10px 12px;font-size:13px;color:var(--txt);font-family:'Outfit',sans-serif;outline:none;transition:border-color 0.2s;width:100%;resize:vertical;min-height:80px;}
        .note-ta:focus{border-color:var(--acc);box-shadow:0 0 0 3px rgba(0,212,170,0.08);}
        .note-ta::placeholder{color:var(--txt3);}
        .note-form-btns{display:flex;gap:0.75rem;margin-top:1rem;}
        .note-btn-save{background:var(--acc);border:none;border-radius:8px;padding:9px 20px;font-size:13px;font-weight:500;color:#050d18;cursor:pointer;font-family:'Outfit',sans-serif;transition:all 0.2s;}
        .note-btn-save:hover{background:var(--acc2);}
        .note-btn-cancel{background:transparent;border:1px solid var(--border);border-radius:8px;padding:9px 16px;font-size:13px;color:var(--txt2);cursor:pointer;font-family:'Outfit',sans-serif;transition:all 0.2s;}
        .note-btn-cancel:hover{border-color:var(--border2);color:var(--txt);}
        .db-modal-bg{position:fixed;inset:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(4px);z-index:200;display:flex;align-items:center;justify-content:center;padding:1rem;}
        .db-modal{background:var(--panel);border:1px solid var(--border);border-radius:18px;width:100%;max-width:560px;max-height:90vh;overflow-y:auto;position:relative;}
        .db-modal-top{position:sticky;top:0;background:var(--panel);border-bottom:1px solid var(--border);padding:1.25rem 1.5rem;display:flex;align-items:center;justify-content:space-between;z-index:1;}
        .db-modal-top::before{content:'';position:absolute;top:0;left:15%;right:15%;height:1px;background:linear-gradient(to right,transparent,var(--acc),transparent);}
        .db-modal-title{font-family:'Cormorant Garamond',serif;font-size:22px;color:var(--txt);}
        .db-modal-badge{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;font-family:'JetBrains Mono',monospace;padding:3px 10px;border-radius:20px;margin-left:10px;vertical-align:middle;}
        .db-modal-badge.edit{background:rgba(74,158,255,0.12);color:#4a9eff;border:1px solid rgba(74,158,255,0.25);}
        .db-modal-badge.new{background:var(--acc-dim);color:var(--acc);border:1px solid var(--border2);}
        .db-close{background:transparent;border:none;color:var(--txt3);font-size:20px;cursor:pointer;padding:2px 8px;border-radius:6px;transition:color 0.2s;}
        .db-close:hover{color:var(--txt);}
        .db-modal-body{padding:1.5rem;}
        .db-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem;}
        .db-form-full{grid-column:1/-1;}
        .db-fg{display:flex;flex-direction:column;gap:5px;}
        .db-lbl{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--txt3);font-family:'JetBrains Mono',monospace;}
        .db-inp,.db-sel,.db-ta{background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;padding:10px 12px;font-size:13px;color:var(--txt);font-family:'Outfit',sans-serif;outline:none;transition:border-color 0.2s,box-shadow 0.2s;width:100%;}
        .db-inp:focus,.db-sel:focus,.db-ta:focus{border-color:var(--acc);box-shadow:0 0 0 3px rgba(0,212,170,0.08);}
        .db-inp::placeholder,.db-ta::placeholder{color:var(--txt3);}
        .db-sel option{background:#0a1628;}
        .db-ta{resize:vertical;min-height:70px;}

        /* ── CHANGE 7: modal P&L summary panel ── */
        .modal-pnl-panel{background:rgba(0,0,0,0.25);border:1px solid rgba(0,212,170,0.15);border-radius:10px;padding:12px 14px;margin-top:4px;}
        .modal-pnl-row{display:flex;justify-content:space-between;align-items:center;font-size:12px;padding:3px 0;}
        .modal-pnl-label{color:var(--txt3);font-family:'JetBrains Mono',monospace;}
        .modal-pnl-value{font-family:'JetBrains Mono',monospace;font-weight:500;}
        .modal-pnl-divider{border:none;border-top:1px solid var(--border);margin:6px 0;}
        .modal-pnl-net-label{color:var(--txt2);font-size:13px;font-weight:500;}
        .modal-pnl-net-value{font-size:16px;font-weight:600;}

        .db-modal-footer{padding:0 1.5rem 1.5rem;display:flex;gap:0.75rem;}
        .db-btn-cancel{flex:1;background:transparent;border:1px solid var(--border);border-radius:8px;padding:11px;font-size:14px;color:var(--txt2);cursor:pointer;font-family:'Outfit',sans-serif;transition:all 0.2s;}
        .db-btn-cancel:hover{border-color:var(--border2);color:var(--txt);}
        .db-btn-save{flex:2;background:var(--acc);border:none;border-radius:8px;padding:11px;font-size:14px;font-weight:500;color:#050d18;cursor:pointer;font-family:'Outfit',sans-serif;transition:all 0.2s;}
        .db-btn-save.edit-mode{background:#4a9eff;}
        .db-btn-save.edit-mode:hover:not(:disabled){background:#3a8eef;}
        .db-btn-save:hover:not(:disabled){background:var(--acc2);}
        .db-btn-save:disabled{opacity:0.6;cursor:not-allowed;}
        .pnl-big-chart{height:300px;position:relative;}
        .pnl-big-chart canvas{width:100%;height:300px;display:block;}
        .profile-page{max-width:1080px;display:grid;grid-template-columns:280px minmax(0,1fr);gap:2rem;align-items:start;}.profile-top{min-height:360px;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:.75rem;padding:2rem;border:1px solid var(--border);border-radius:18px;background:linear-gradient(155deg,rgba(0,212,170,.12),rgba(10,22,40,.88) 55%);position:relative;overflow:hidden;margin-top:4.05rem;}.profile-top:after{content:'';position:absolute;width:200px;height:200px;right:-90px;top:-90px;border:1px solid rgba(0,212,170,.2);border-radius:50%;}.profile-avatar{width:92px;height:92px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#082b32;border:1px solid rgba(0,212,170,.55);box-shadow:0 0 0 8px rgba(0,212,170,.06);color:var(--acc);font-family:'Cormorant Garamond',serif;font-size:38px;font-weight:600;overflow:hidden;position:relative;z-index:1;}.profile-name{font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:600;color:var(--txt);line-height:1.1;position:relative;z-index:1;}.profile-email{font-size:13px;color:var(--txt2);margin-top:0;position:relative;z-index:1;}.profile-info{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem;}.profile-info-item{padding:1rem 1.1rem;border:1px solid rgba(255,255,255,.07);border-radius:11px;background:rgba(13,27,42,.65);transition:border-color .2s,transform .2s;}.profile-info-item:focus-within,.profile-info-item:hover{border-color:rgba(0,212,170,.3);transform:translateY(-1px);}.profile-info-label{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--txt3);margin-bottom:.55rem;display:block;}.profile-info-value{font-size:16px;font-family:'JetBrains Mono',monospace;color:var(--txt);word-break:break-word;}.profile-details{border-top:1px solid var(--border);padding-top:1.25rem;}.profile-section-title{font-size:12px;letter-spacing:1.6px;text-transform:uppercase;color:var(--txt2);font-family:'JetBrains Mono',monospace;margin-bottom:1rem;}.profile-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem;margin-top:1.25rem;}.profile-stats .profile-info-item{background:linear-gradient(135deg,rgba(0,212,170,.1),rgba(13,27,42,.7));}.profile-save{margin-top:1.5rem;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.75rem;text-align:center;}@media(max-width:800px){.profile-page{grid-template-columns:1fr;}.profile-top{min-height:auto;flex-direction:row;align-items:center;margin-top:0;}.profile-stats{grid-template-columns:1fr 1fr;}}@media(max-width:500px){.profile-info,.profile-stats{grid-template-columns:1fr;}.profile-top{flex-direction:column;align-items:flex-start;}}
        .calendar-toolbar{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:1.25rem;padding-bottom:1rem;border-bottom:1px solid var(--border);}
        .calendar-month{font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:600;color:var(--txt);line-height:1;}
        .calendar-nav{display:flex;gap:0.5rem;}
        .calendar-nav button{width:34px;height:32px;border:1px solid var(--border);border-radius:7px;background:transparent;color:var(--txt2);font-size:18px;cursor:pointer;line-height:1;}
        .calendar-nav button:hover{border-color:var(--acc);color:var(--acc);}
        .calendar-weekdays,.calendar-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:0.55rem;}
        .calendar-weekdays{margin-bottom:0.55rem;}
        .calendar-weekday{text-align:center;color:var(--txt3);font-size:10px;letter-spacing:1px;font-family:'JetBrains Mono',monospace;text-transform:uppercase;padding:0.25rem 0;}
        .calendar-day{min-height:104px;border:1px solid rgba(255,255,255,0.06);border-radius:10px;background:rgba(255,255,255,0.015);padding:0.6rem;display:flex;flex-direction:column;gap:0.35rem;transition:transform .16s,border-color .16s,background .16s;}
        .calendar-day:not(.empty):hover{transform:translateY(-2px);border-color:rgba(74,158,255,.55);}
        .calendar-day.empty{background:transparent;border-color:transparent;}
        .calendar-day.trade-positive{background:rgba(0,212,170,0.08);border-color:rgba(0,212,170,0.28);}
        .calendar-day.trade-negative{background:rgba(255,107,107,0.08);border-color:rgba(255,107,107,0.28);}
        .calendar-day.today{box-shadow:inset 0 0 0 1px #4a9eff;}
        .calendar-date{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--txt3);font-weight:500;}
        .calendar-day.today .calendar-date{color:#4a9eff;}
        .calendar-count{font-size:10px;letter-spacing:.04em;text-transform:uppercase;color:var(--txt2);margin-top:auto;}
        .calendar-pnl{font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:500;white-space:nowrap;letter-spacing:-.03em;}
        .calendar-pnl.pos{color:var(--acc);}.calendar-pnl.neg{color:var(--red);}
        .calendar-legend{display:flex;flex-wrap:wrap;gap:1rem;margin-top:1.25rem;font-size:12px;color:var(--txt2);}
        .calendar-legend span{display:flex;align-items:center;gap:6px;}.calendar-legend i{width:9px;height:9px;border-radius:3px;display:inline-block;}
        @media(max-width:700px){.calendar-weekdays,.calendar-grid{gap:0.25rem;}.calendar-day{min-height:78px;padding:0.4rem;gap:0.2rem;}.calendar-pnl{font-size:10px;}.calendar-count{font-size:10px;}.calendar-weekday{font-size:8px;}.calendar-toolbar{margin-bottom:.75rem;padding-bottom:.75rem;}.calendar-month{font-size:21px;}}

        /* ── LEDGER STYLES ── */
        .ledger-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem;margin-bottom:2rem;}
        .ledger-form-card{background:var(--panel);border:1px solid var(--border2);border-radius:14px;padding:1.5rem;margin-bottom:1.5rem;position:relative;}
        .ledger-form-card::before{content:'';position:absolute;top:0;left:20%;right:20%;height:1px;background:linear-gradient(to right,transparent,var(--acc),transparent);}
        .ledger-form-grid{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:1rem;align-items:flex-end;}
        @media(max-width:900px){.ledger-form-grid{grid-template-columns:1fr 1fr;}}
        .ledger-type-tabs{display:flex;gap:0.5rem;margin-bottom:1.5rem;}
        .ledger-tab{flex:1;padding:10px;border-radius:8px;border:1px solid var(--border);background:transparent;font-size:13px;font-family:'Outfit',sans-serif;color:var(--txt2);cursor:pointer;transition:all 0.2s;font-weight:500;}
        .ledger-tab.deposit.active{background:rgba(0,212,170,0.12);border-color:var(--acc);color:var(--acc);}
        .ledger-tab.withdrawal.active{background:rgba(255,107,107,0.12);border-color:var(--red);color:var(--red);}
        .ledger-tab:hover{border-color:var(--border2);color:var(--txt);}
        .ledger-table-wrap{overflow-x:auto;}
        .ledger-amount.pos{color:var(--acc);font-family:'JetBrains Mono',monospace;}
        .ledger-amount.neg{color:var(--red);font-family:'JetBrains Mono',monospace;}
        .ledger-amount.trade-pos{color:#4a9eff;font-family:'JetBrains Mono',monospace;}
        .ledger-amount.trade-neg{color:#ff9966;font-family:'JetBrains Mono',monospace;}
        .ledger-balance{font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--txt2);}
        .ledger-badge{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;font-size:11px;font-family:'JetBrains Mono',monospace;font-weight:500;letter-spacing:0.5px;}
        .ledger-badge.deposit{background:rgba(0,212,170,0.1);border:1px solid rgba(0,212,170,0.25);color:var(--acc);}
        .ledger-badge.withdrawal{background:rgba(255,107,107,0.1);border:1px solid rgba(255,107,107,0.25);color:var(--red);}
        .ledger-badge.trade{background:rgba(74,158,255,0.1);border:1px solid rgba(74,158,255,0.25);color:#4a9eff;}
        .ledger-del-btn{background:transparent;border:none;cursor:pointer;color:var(--txt3);font-size:14px;padding:2px 6px;border-radius:4px;transition:color 0.2s;}
        .ledger-del-btn:hover{color:var(--red);}
        .ledger-empty{text-align:center;padding:3rem;color:var(--txt3);}
        .ledger-empty .icon{font-size:36px;margin-bottom:0.75rem;display:block;}
      `}</style>

      <div className="db-root">
        <nav className="db-nav">
          <div className="db-nav-left">
            <div className="db-user">
              <div className="db-avatar">{user?.name?.[0]?.toUpperCase() || 'T'}</div>
              <span className="db-username">{user?.name || 'Trader'}</span>
            </div>
          </div>
          <div className="db-brand">TradeDiary</div>
          <div className="db-nav-right">
            <button className="db-btn-sm" onClick={downloadPnlStatement}>↓ Download P&amp;L Statement</button>
            <button className="db-btn-sm" onClick={handleLogout}>Sign out</button>
          </div>
        </nav>

        <div className="db-body">
          <aside className="db-sidebar">
            <div className="db-sidebar-label">Navigation</div>
            {navItems.map(item => (
              <div key={item.id} className={`db-nav-item ${activePage === item.id ? 'active' : ''}`} onClick={() => setActivePage(item.id)}>
                <span className="ni">{item.icon}</span>
                {item.label}
              </div>
            ))}
            <div className="db-sidebar-bottom">
              <button className={`db-profile-btn ${activePage === 'profile' ? 'active' : ''}`} onClick={() => setActivePage('profile')}>◉ Profile</button>
              <button className="db-logout-btn" onClick={handleLogout}>← Sign Out</button>
            </div>
          </aside>

          <main className="db-main">

            {/* ── TRADING JOURNAL ── */}
            {activePage === 'journal' && (
              <>
                <div className="db-page-header">
                  <div><h1>Trading Journal</h1><p>Track, analyse, and improve your trades</p></div>
                  <button className="db-btn-acc" onClick={() => { setEditTrade(null); setForm(emptyForm); setShowForm(true); }}>+ Log Trade</button>
                </div>
                <div className="db-stats">
                  <div className="db-stat green"><div className="db-stat-label">Total P&L</div><div className={`db-stat-value ${parseFloat(stats.totalPnL) >= 0 ? 'pos' : 'neg'}`}>{stats.total ? fmt(stats.totalPnL) : '—'}</div><div className="db-stat-sub">All logged trades</div></div>
                  <div className="db-stat blue"><div className="db-stat-label">Win Rate</div><div className="db-stat-value neu">{stats.total ? stats.winRate + '%' : '—'}</div><div className="db-stat-sub">{stats.wins}W / {stats.losses}L</div></div>
                  <div className="db-stat yellow"><div className="db-stat-label">Total Trades</div><div className="db-stat-value neu">{stats.total}</div><div className="db-stat-sub">Logged</div></div>
                  <div className="db-stat green"><div className="db-stat-label">Best Trade</div><div className={`db-stat-value ${parseFloat(stats.bestTrade) >= 0 ? 'pos' : 'neg'}`}>{stats.total ? fmt(stats.bestTrade) : '—'}</div><div className="db-stat-sub">Single trade</div></div>
                  <div className="db-stat red"><div className="db-stat-label">Worst Trade</div><div className={`db-stat-value ${parseFloat(stats.worstTrade) >= 0 ? 'pos' : 'neg'}`}>{stats.total ? fmt(stats.worstTrade) : '—'}</div><div className="db-stat-sub">Single trade</div></div>
                  <div className="db-stat blue"><div className="db-stat-label">Avg P&L</div><div className={`db-stat-value ${parseFloat(stats.avgPnL) >= 0 ? 'pos' : 'neg'}`}>{stats.total ? fmt(stats.avgPnL) : '—'}</div><div className="db-stat-sub">Per trade</div></div>
                </div>
                <div className="db-grid">
                  <div className="db-card">
                    <div className="db-card-title">Equity Curve <span>{trades.length} trades</span></div>
                    <div className="db-canvas-wrap">
                      {trades.length > 0 ? <canvas ref={canvasRef} /> : <div className="db-empty" style={{padding:'2rem'}}><span className="icon">📈</span><p>Log trades to see your equity curve</p></div>}
                    </div>
                  </div>
                  <div className="db-card">
                    <div className="db-card-title">Win / Loss</div>
                    {trades.length > 0 ? (() => {
                      const winPct = stats.total ? (stats.wins / stats.total) * 100 : 0;
                      const r = 40; const circ = 2 * Math.PI * r;
                      return (
                        <div className="db-wl">
                          <div className="db-donut">
                            <svg width="100" height="100" viewBox="0 0 100 100">
                              <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,107,107,0.2)" strokeWidth="12" />
                              <circle cx="50" cy="50" r={r} fill="none" stroke="#00d4aa" strokeWidth="12" strokeDasharray={`${(winPct/100)*circ} ${circ}`} strokeLinecap="round" />
                            </svg>
                            <div className="db-donut-label"><span className="big">{stats.winRate}%</span><span className="sm">win rate</span></div>
                          </div>
                          <div className="db-wl-legend">
                            <div className="db-wl-row"><div className="db-wl-dot" style={{background:'#00d4aa'}}></div><span style={{color:'var(--txt2)',fontSize:13}}>{stats.wins} Wins</span></div>
                            <div className="db-wl-row"><div className="db-wl-dot" style={{background:'#ff6b6b'}}></div><span style={{color:'var(--txt2)',fontSize:13}}>{stats.losses} Losses</span></div>
                            <div className="db-wl-row"><div className="db-wl-dot" style={{background:'var(--txt3)'}}></div><span style={{color:'var(--txt2)',fontSize:13}}>{stats.total - stats.wins - stats.losses} Break even</span></div>
                          </div>
                        </div>
                      );
                    })() : <div className="db-empty" style={{padding:'1.5rem'}}><span className="icon" style={{fontSize:28}}>🎯</span><p>No data yet</p></div>}
                    {trades.length > 0 && (() => {
                      const markets = {};
                      trades.forEach(t => { markets[t.market] = (markets[t.market] || 0) + 1; });
                      const max = Math.max(...Object.values(markets));
                      return (
                        <div style={{marginTop:'1.5rem'}}>
                          <div className="db-card-title" style={{marginBottom:'0.75rem'}}>By Market</div>
                          <div className="db-breakdown">
                            {Object.entries(markets).map(([k, v]) => (
                              <div className="db-bk-item" key={k}>
                                <span className="db-bk-label">{k}</span>
                                <div className="db-bk-bar-wrap"><div className="db-bk-bar" style={{width:`${(v/max)*100}%`}} /></div>
                                <span className="db-bk-val">{v}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </>
            )}

            {/* ── TRADE CALENDAR ── */}
            {activePage === 'calendar' && (() => {
              const year = calendarMonth.getFullYear();
              const month = calendarMonth.getMonth();
              const firstDay = new Date(year, month, 1).getDay();
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const todayKey = dateKey(new Date());
              const calendarDays = [
                ...Array.from({ length: firstDay }, () => null),
                ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
              ];
              while (calendarDays.length % 7) calendarDays.push(null);
              const monthEntries = Object.entries(dailyTradeSummary).filter(([key]) => key.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`));
              const monthPnl = monthEntries.reduce((total, [, entry]) => total + entry.pnl, 0);
              const monthTradeCount = monthEntries.reduce((total, [, entry]) => total + entry.count, 0);
              return (
                <>
                  <div className="db-page-header"><div><h1>Trade Calendar</h1><p>Daily trade count and P&amp;L</p></div></div>
                  <div className="db-stats" style={{ marginBottom: '1.5rem' }}>
                    <div className="db-stat blue"><div className="db-stat-label">Trading Days</div><div className="db-stat-value neu">{monthEntries.length}</div><div className="db-stat-sub">This month</div></div>
                    <div className="db-stat yellow"><div className="db-stat-label">Trades</div><div className="db-stat-value neu">{monthTradeCount}</div><div className="db-stat-sub">This month</div></div>
                    <div className="db-stat green"><div className="db-stat-label">Month P&amp;L</div><div className={`db-stat-value ${monthPnl >= 0 ? 'pos' : 'neg'}`}>{monthEntries.length ? formatCalendarPnL(monthPnl) : '—'}</div><div className="db-stat-sub">This month</div></div>
                  </div>
                  <div className="db-card">
                    <div className="calendar-toolbar">
                      <div className="calendar-month">{calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
                      <div className="calendar-nav">
                        <button aria-label="Previous month" onClick={() => setCalendarMonth(new Date(year, month - 1, 1))}>‹</button>
                        <button aria-label="Current month" title="Current month" onClick={() => setCalendarMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>•</button>
                        <button aria-label="Next month" onClick={() => setCalendarMonth(new Date(year, month + 1, 1))}>›</button>
                      </div>
                    </div>
                    <div className="calendar-weekdays">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div className="calendar-weekday" key={day}>{day}</div>)}</div>
                    <div className="calendar-grid">
                      {calendarDays.map((day, index) => {
                        if (!day) return <div className="calendar-day empty" key={`empty-${index}`} aria-hidden="true" />;
                        const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const entry = dailyTradeSummary[key];
                        const pnlClass = entry ? (entry.pnl >= 0 ? 'trade-positive' : 'trade-negative') : '';
                        return <div key={key} className={`calendar-day ${pnlClass} ${key === todayKey ? 'today' : ''}`} title={entry ? `${entry.count} trade${entry.count === 1 ? '' : 's'} · ${entry.markets.size} market${entry.markets.size === 1 ? '' : 's'}` : undefined}>
                          <span className="calendar-date">{day}</span>
                          {entry && <><span className="calendar-count">{entry.count} trade{entry.count === 1 ? '' : 's'}</span><span className={`calendar-pnl ${entry.pnl >= 0 ? 'pos' : 'neg'}`}>{formatCalendarPnL(entry.pnl)}</span></>}
                        </div>;
                      })}
                    </div>
                    <div className="calendar-legend"><span><i style={{ background: 'var(--acc)' }} />Profit day</span><span><i style={{ background: 'var(--red)' }} />Loss day</span><span><i style={{ background: '#4a9eff' }} />Today</span></div>
                  </div>
                </>
              );
            })()}

            {/* ── OPTION CALCULATOR ── */}
            {activePage === 'options' && (
              <>
                <div className="db-page-header"><div><h1>Option Calculator</h1><p>Calculate your options P&L, target P&L and payoff graph</p></div></div>
                <div className="options-layout">
                  <div className="db-card">
                    <div className="db-card-title">Options P&amp;L Calculator</div>
                    <div className="calc-grid">
                    <div className="calc-fg"><label className="calc-lbl">Option Type</label><select className="calc-sel" value={opt.type} onChange={e => setOpt({...opt, type: e.target.value})}><option>Call</option><option>Put</option></select></div>
                    <div className="calc-fg"><label className="calc-lbl">Action</label><select className="calc-sel" value={opt.action} onChange={e => setOpt({...opt, action: e.target.value})}><option>Buy</option><option>Sell</option></select></div>
                    <div className="calc-fg"><label className="calc-lbl">Spot Price (₹)</label><input className="calc-inp" type="number" placeholder="e.g. 24113" value={opt.spotPrice} onChange={e => setOpt({...opt, spotPrice: e.target.value})} /></div>
                    <div className="calc-fg"><label className="calc-lbl">Strike Price (₹)</label><input className="calc-inp" type="number" placeholder="e.g. 24150" value={opt.strikePrice} onChange={e => setOpt({...opt, strikePrice: e.target.value})} /></div>
                    <div className="calc-fg"><label className="calc-lbl">Premium per unit (₹)</label><input className="calc-inp" type="number" placeholder="e.g. 40.85" value={opt.premium} onChange={e => setOpt({...opt, premium: e.target.value})} /></div>
                    <div className="calc-fg"><label className="calc-lbl">Lot Size</label><input className="calc-inp" type="number" placeholder="e.g. 75" value={opt.lotSize} onChange={e => setOpt({...opt, lotSize: e.target.value})} /></div>
                    <div className="calc-fg"><label className="calc-lbl">Number of Lots</label><input className="calc-inp" type="number" placeholder="e.g. 1" value={opt.lots} onChange={e => setOpt({...opt, lots: e.target.value})} /></div>
                    <div className="calc-fg"><label className="calc-lbl">Target Price (₹)</label><input className="calc-inp" type="number" placeholder="e.g. 24400" value={opt.targetPrice} onChange={e => setOpt({...opt, targetPrice: e.target.value})} /></div>
                    </div>
                    {optResult && (
                      <div className="calc-result">
                        <div className="calc-result-title">Result</div>
                        <div className="calc-result-grid">
                          <div className="calc-res-item"><span className="calc-res-label">Total Premium Paid</span><span className="calc-res-value neu">₹{optResult.totalPremium}</span></div>
                          <div className="calc-res-item"><span className="calc-res-label">Intrinsic Value</span><span className="calc-res-value neu">₹{optResult.intrinsic}</span></div>
                          <div className="calc-res-item"><span className="calc-res-label">Current P&L</span><span className={`calc-res-value ${parseFloat(optResult.pnl) >= 0 ? 'pos' : 'neg'}`}>{parseFloat(optResult.pnl) >= 0 ? '+' : ''}₹{optResult.pnl}</span></div>
                          {optResult.targetPnl !== null && <div className="calc-res-item"><span className="calc-res-label">P&L at Target</span><span className={`calc-res-value ${parseFloat(optResult.targetPnl) >= 0 ? 'pos' : 'neg'}`}>{parseFloat(optResult.targetPnl) >= 0 ? '+' : ''}₹{optResult.targetPnl}</span></div>}
                          <div className="calc-res-item"><span className="calc-res-label">Breakeven</span><span className="calc-res-value neu">₹{optResult.breakeven}</span></div>
                          <div className="calc-res-item"><span className="calc-res-label">Max Loss</span><span className="calc-res-value neg">−₹{optResult.maxLoss}</span></div>
                          <div className="calc-res-item"><span className="calc-res-label">Max Profit</span><span className="calc-res-value pos">{optResult.maxProfit === 'Unlimited' ? 'Unlimited' : '₹' + optResult.maxProfit}</span></div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="db-card options-chart-card">
                    <div className="db-card-title">Options Payoff Graph</div>
                    {optResult ? <OptPayoffChart opt={opt} optResult={optResult} /> : (
                      <div className="db-empty" style={{margin:'auto'}}><span className="icon">📈</span><p>Enter your option details to view the payoff graph.</p></div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* ── SHARE CALCULATOR ── */}
            {activePage === 'shares' && (
              <>
                <div className="db-page-header"><div><h1>Share Calculator</h1><p>Calculate your share trade P&L instantly</p></div></div>
                <div className="db-card" style={{maxWidth:580}}>
                  <div className="db-card-title">Share P&L Calculator</div>
                  <div className="calc-grid">
                    <div className="calc-fg"><label className="calc-lbl">Buy Price (₹)</label><input className="calc-inp" type="number" placeholder="e.g. 500" value={share.buyPrice} onChange={e => setShare({...share, buyPrice: e.target.value})} /></div>
                    <div className="calc-fg"><label className="calc-lbl">Quantity (shares)</label><input className="calc-inp" type="number" placeholder="e.g. 100" value={share.quantity} onChange={e => setShare({...share, quantity: e.target.value})} /></div>
                    <div className="calc-fg"><label className="calc-lbl">Sell Price (₹)</label><input className="calc-inp" type="number" placeholder="e.g. 550" value={share.sellPrice} onChange={e => setShare({...share, sellPrice: e.target.value})} /></div>
                    <div className="calc-fg"><label className="calc-lbl">Brokerage per side (₹)</label><input className="calc-inp" type="number" placeholder="e.g. 20" value={share.brokerage} onChange={e => setShare({...share, brokerage: e.target.value})} /></div>
                  </div>
                  {shareResult && (
                    <div className="calc-result">
                      <div className="calc-result-title">Result</div>
                      <div className="calc-result-grid">
                        <div className="calc-res-item"><span className="calc-res-label">Amount Invested</span><span className="calc-res-value neu">₹{shareResult.invested}</span></div>
                        <div className="calc-res-item"><span className="calc-res-label">Sale Value</span><span className="calc-res-value neu">₹{shareResult.returns}</span></div>
                        <div className="calc-res-item"><span className="calc-res-label">Brokerage Fees</span><span className="calc-res-value neg">−₹{shareResult.brokerageFee}</span></div>
                        <div className="calc-res-item"><span className="calc-res-label">Net P&L</span><span className={`calc-res-value ${parseFloat(shareResult.pnl) >= 0 ? 'pos' : 'neg'}`}>{parseFloat(shareResult.pnl) >= 0 ? '+' : ''}₹{shareResult.pnl} ({shareResult.pct}%)</span></div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── PROFILE ── */}
            {activePage === 'profile' && (
              <>
                <div className="db-page-header"><div><h1>Profile</h1><p>Your trading identity and account snapshot</p></div></div>
                <form className="profile-page" onSubmit={handleProfileSave}>
                  <div className="profile-top">
                    <div className="profile-avatar">{profileForm.avatar ? <img src={profileForm.avatar} alt="Profile" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}} /> : (profileForm.name?.[0]?.toUpperCase() || 'T')}</div>
                    <div><div className="profile-name">{profileForm.name || 'Trader'}</div><div className="profile-email">@{profileForm.username || 'username'}</div><label className="db-btn-sm" style={{display:'inline-block',marginTop:10,cursor:'pointer'}}>Upload photo<input type="file" accept="image/*" onChange={handleAvatarUpload} style={{display:'none'}} /></label></div>
                  </div>
                  <div className="profile-details">
                  <div className="profile-section-title">Personal information</div>
                  <div className="profile-info">
                    {[['Full name','name','Your full name','text'],['Email address','email','you@example.com','email'],['Phone number','phone','e.g. +91 98765 43210','tel'],['Username','username','short_username','text'],['Date of birth','dateOfBirth','','date']].map(([label, name, placeholder, type]) => <div className="profile-info-item" key={name}><label className="profile-info-label">{label}</label><input className="db-inp" type={type} value={profileForm[name]} placeholder={placeholder} onChange={e => setProfileForm({...profileForm,[name]:e.target.value})} required={name !== 'phone' && name !== 'dateOfBirth'} /></div>)}
                  </div>
                  <div className="profile-stats">
                    <div className="profile-info-item"><span className="profile-info-label">Member since</span><div className="profile-info-value">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : 'Available after next sign-in'}</div></div>
                    <div className="profile-info-item"><span className="profile-info-label">Amount invested</span><div className="profile-info-value" style={{color:'var(--acc)'}}>₹{investedAmount.toLocaleString('en-IN', {minimumFractionDigits:2,maximumFractionDigits:2})}</div></div>
                    <div className="profile-info-item"><span className="profile-info-label">Current amount</span><div className="profile-info-value" style={{color:currentAmount >= 0 ? 'var(--acc)' : 'var(--red)'}}>₹{currentAmount.toLocaleString('en-IN', {minimumFractionDigits:2,maximumFractionDigits:2})}</div></div>
                  </div>
                  {profileMessage && <p style={{marginTop:'1rem',fontSize:13,color:profileMessage === 'Profile saved.' ? 'var(--acc)' : 'var(--red)'}}>{profileMessage}</p>}
                  <div className="profile-save"><span style={{fontSize:12,color:'var(--txt3)'}}>Your profile is private to your account.</span><button className="db-btn-acc" type="submit" disabled={profileSaving}>{profileSaving ? 'Saving...' : 'Save Profile'}</button></div>
                  </div>
                </form>
              </>
            )}

            {/* ── TRADING NOTES ── */}
            {activePage === 'notes' && (
              <>
                <div className="db-page-header">
                  <div><h1>Trading Notes</h1><p>Capture insights, strategies and lessons</p></div>
                  <button className="db-btn-acc" onClick={() => setShowNoteForm(!showNoteForm)}>+ Add Note</button>
                </div>
                {showNoteForm && (
                  <div className="note-form-card">
                    <div className="note-form-grid">
                      <div className="calc-fg"><label className="calc-lbl">Title</label><input className="calc-inp" placeholder="Note title..." value={noteForm.title} onChange={e => setNoteForm({...noteForm, title: e.target.value})} /></div>
                      <div className="calc-fg"><label className="calc-lbl">Tag</label><select className="calc-sel" value={noteForm.tag} onChange={e => setNoteForm({...noteForm, tag: e.target.value})}>{['General','Strategy','Lesson','Setup','Psychology','Risk'].map(t => <option key={t}>{t}</option>)}</select></div>
                    </div>
                    <div className="calc-fg"><label className="calc-lbl">Note</label><textarea className="note-ta" placeholder="Write your trading note, strategy or lesson..." value={noteForm.body} onChange={e => setNoteForm({...noteForm, body: e.target.value})} /></div>
                    <div className="note-form-btns">
                      <button className="note-btn-cancel" onClick={() => setShowNoteForm(false)}>Cancel</button>
                      <button className="note-btn-save" onClick={saveNote}>Save Note</button>
                    </div>
                  </div>
                )}
                {notes.length === 0 ? (
                  <div className="db-empty" style={{marginTop:'3rem'}}><span className="icon">📝</span><p>No notes yet. Click <strong style={{color:'var(--acc)'}}>+ Add Note</strong> to capture your first insight.</p></div>
                ) : (
                  <div className="notes-grid">
                    {notes.map(n => (
                      <div className="note-card" key={n.id}>
                        <div className="note-card-top"><span className="note-title">{n.title}</span><span className="note-tag">{n.tag}</span></div>
                        <p className="note-body">{n.body}</p>
                        <span className="note-date">{n.date}</span>
                        <button className="note-del" onClick={() => deleteNote(n.id)}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── LEDGER ── */}
            {activePage === 'ledger' && (() => {
              const totalDeposited = ledger.filter(e => e.type === 'Deposit' && (e.currency || 'INR') === 'INR').reduce((s, e) => s + e.amount, 0);
              const totalWithdrawn = ledger.filter(e => e.type === 'Withdrawal' && (e.currency || 'INR') === 'INR').reduce((s, e) => s + e.amount, 0);
              const inrTradePnL = trades.filter(t => !['Crypto', 'Forex'].includes(t.market)).reduce((sum, t) => sum + calcPnL(t), 0);
              const usdTradePnL = trades.filter(t => ['Crypto', 'Forex'].includes(t.market)).reduce((sum, t) => sum + calcPnL(t), 0);
              const currentBalance = totalDeposited - totalWithdrawn + inrTradePnL;
              const netReturn = totalDeposited > 0 ? ((currentBalance - totalDeposited) / totalDeposited * 100).toFixed(2) : '0.00';

              const formatLedgerAmount = (n, currency = 'INR') => `${currency === 'USD' ? '$' : '₹'}${Math.abs(n).toLocaleString(currency === 'USD' ? 'en-US' : 'en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

              return (
                <>
                  <div className="db-page-header">
                    <div><h1>Ledger</h1><p>Track capital deposits, withdrawals and trade P&L in one place</p></div>
                    <button className="db-btn-acc" onClick={() => setLedgerFormOpen(!ledgerFormOpen)}>+ Add Entry</button>
                  </div>

                  <div className="ledger-summary">
                    <div className="db-stat green">
                      <div className="db-stat-label">Current Balance</div>
                      <div className={`db-stat-value ${currentBalance >= 0 ? 'pos' : 'neg'}`}>{currentBalance >= 0 ? '+' : '−'}{formatLedgerAmount(currentBalance)}</div>
                      <div className="db-stat-sub">₹ capital + Indian trade P&L</div>
                    </div>
                    <div className="db-stat blue">
                      <div className="db-stat-label">Total Deposited</div>
                      <div className="db-stat-value pos">+{formatLedgerAmount(totalDeposited)}</div>
                      <div className="db-stat-sub">All ₹ deposits</div>
                    </div>
                    <div className="db-stat red">
                      <div className="db-stat-label">Total Withdrawn</div>
                      <div className="db-stat-value neg">−{formatLedgerAmount(totalWithdrawn)}</div>
                      <div className="db-stat-sub">All ₹ withdrawals</div>
                    </div>
                    <div className="db-stat yellow">
                      <div className="db-stat-label">Indian Trade P&L</div>
                      <div className={`db-stat-value ${inrTradePnL >= 0 ? 'pos' : 'neg'}`}>{inrTradePnL >= 0 ? '+' : '−'}{formatLedgerAmount(inrTradePnL)}</div>
                      <div className="db-stat-sub">Stocks, Futures &amp; Options</div>
                    </div>
                    <div className="db-stat green">
                      <div className="db-stat-label">Crypto &amp; Forex P&L</div>
                      <div className={`db-stat-value ${usdTradePnL >= 0 ? 'pos' : 'neg'}`}>{usdTradePnL >= 0 ? '+' : '−'}{formatLedgerAmount(usdTradePnL, 'USD')}</div>
                      <div className="db-stat-sub">Dollar-denominated trades</div>
                    </div>
                    <div className="db-stat yellow">
                      <div className="db-stat-label">Net Return</div>
                      <div className={`db-stat-value ${parseFloat(netReturn) >= 0 ? 'pos' : 'neg'}`}>{parseFloat(netReturn) >= 0 ? '+' : ''}{netReturn}%</div>
                      <div className="db-stat-sub">On ₹ deposited capital</div>
                    </div>
                  </div>

                  {ledgerFormOpen && (
                    <div className="ledger-form-card">
                      <div className="ledger-type-tabs">
                        <button className={`ledger-tab deposit ${ledgerForm.type === 'Deposit' ? 'active' : ''}`} onClick={() => setLedgerForm({ ...ledgerForm, type: 'Deposit' })}>↓ Deposit</button>
                        <button className={`ledger-tab withdrawal ${ledgerForm.type === 'Withdrawal' ? 'active' : ''}`} onClick={() => setLedgerForm({ ...ledgerForm, type: 'Withdrawal' })}>↑ Withdrawal</button>
                      </div>
                      <div className="ledger-form-grid">
                        <div className="calc-fg">
                          <label className="calc-lbl">Amount (₹)</label>
                          <input className="calc-inp" type="number" placeholder="e.g. 50000" value={ledgerForm.amount} onChange={e => setLedgerForm({ ...ledgerForm, amount: e.target.value })} />
                        </div>
                        <div className="calc-fg">
                          <label className="calc-lbl">Date</label>
                          <input className="calc-inp" type="date" value={ledgerForm.date} onChange={e => setLedgerForm({ ...ledgerForm, date: e.target.value })} />
                        </div>
                        <div className="calc-fg">
                          <label className="calc-lbl">Note (optional)</label>
                          <input className="calc-inp" type="text" placeholder="e.g. Monthly top-up" value={ledgerForm.note} onChange={e => setLedgerForm({ ...ledgerForm, note: e.target.value })} />
                        </div>
                        <div className="calc-fg">
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="db-btn-acc" style={{ flex: 2, borderRadius: 8 }} onClick={saveLedgerEntry}>Save</button>
                            <button onClick={() => setLedgerFormOpen(false)} style={{ flex: 1, background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: 'var(--txt2)', cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}>Cancel</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                </>
              );
            })()}

            {/* ── TRADE HISTORY ── */}
            {activePage === 'history' && (
              <>
                <div className="db-page-header">
                  <div><h1>Trade History</h1><p>Review, edit, and manage every logged trade</p></div>
                  <button className="db-btn-acc" onClick={() => { setEditTrade(null); setForm(emptyForm); setShowForm(true); }}>+ Log Trade</button>
                </div>
                <div className="db-card">
                  <div className="db-card-title">Trade Log <span>{trades.length} entries</span></div>
                  {loading ? <div className="db-empty"><p>Loading trades...</p></div> : trades.length === 0 ? (
                    <div className="db-empty"><span className="icon">📒</span><p>No trades yet. Click <strong style={{color:'var(--acc)'}}>+ Log Trade</strong> to add your first one.</p></div>
                  ) : (
                    <div className="db-table-wrap">
                      <table>
                        <thead><tr><th>Entry Date</th><th>Exit Date</th><th>Symbol</th><th>Market</th><th>Direction</th><th>Entry</th><th>Exit</th><th>Qty</th><th>Net P&amp;L</th><th>Strategy</th><th></th></tr></thead>
                        <tbody>
                          {[...trades].sort((a,b) => new Date(b.date)-new Date(a.date)).map(t => {
                            const pnl = calcPnL(t);
                            return (
                              <tr key={t._id}>
                                <td>{new Date(t.date).toLocaleDateString()}</td>
                                <td>{new Date(t.exitDate || t.date).toLocaleDateString()}</td>
                                <td className="sym">{t.symbol}</td>
                                <td>{t.market}</td>
                                <td><span className={`db-badge ${t.direction === 'Long' ? 'long' : 'short'}`}>{t.direction}</span></td>
                                <td>{parseFloat(t.entryPrice).toFixed(2)}</td>
                                <td>{parseFloat(t.exitPrice).toFixed(2)}</td>
                                <td>{t.quantity}</td>
                                <td className={pnl >= 0 ? 'pos' : 'neg'}>{pnl >= 0 ? '+' : '−'}{formatAmount(pnl, t.market)}</td>
                                <td style={{color:'var(--txt3)',fontSize:12}}>{t.strategy || '—'}</td>
                                <td>
                                  {deleteId === t._id
                                    ? <span style={{fontSize:12,display:'flex',gap:6,alignItems:'center'}}>
                                        <span style={{fontSize:11,color:'var(--txt3)',marginRight:2}}>Delete?</span>
                                        <button onClick={() => handleDelete(t._id)} style={{background:'var(--red)',border:'none',color:'#fff',borderRadius:4,padding:'2px 8px',cursor:'pointer',fontSize:11}}>Yes</button>
                                        <button onClick={() => setDeleteId(null)} style={{background:'transparent',border:'1px solid var(--border)',color:'var(--txt2)',borderRadius:4,padding:'2px 8px',cursor:'pointer',fontSize:11}}>No</button>
                                      </span>
                                    : <span className="db-action-btns">
                                        <button className="db-edit-btn" title="Edit trade" onClick={() => openEdit(t)}>✎</button>
                                        <button className="db-del-btn" title="Delete trade" onClick={() => setDeleteId(t._id)}>✕</button>
                                      </span>
                                  }
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}

          </main>
        </div>

        {/* ── ADD / EDIT TRADE MODAL ── */}
        {showForm && (
          <div className="db-modal-bg" onClick={(e) => e.target === e.currentTarget && closeModal()}>
            <div className="db-modal">
              <div className="db-modal-top">
                <span className="db-modal-title">
                  {editTrade ? 'Edit Trade' : 'Log a Trade'}
                  <span className={`db-modal-badge ${editTrade ? 'edit' : 'new'}`}>{editTrade ? 'Editing' : 'New'}</span>
                </span>
                <button className="db-close" onClick={closeModal}>×</button>
              </div>
              <form onSubmit={editTrade ? handleUpdate : handleSubmit}>
                <div className="db-modal-body">
                  <div className="db-form-grid">
                    <div className="db-fg"><label className="db-lbl">Symbol</label><input className="db-inp" name="symbol" placeholder="e.g. RELIANCE" value={form.symbol} onChange={handleChange} required /></div>
                    <div className="db-fg"><label className="db-lbl">Entry Date</label><input className="db-inp" type="date" name="date" value={form.date} onChange={handleChange} required /></div>
                    <div className="db-fg"><label className="db-lbl">Exit Date</label><input className="db-inp" type="date" name="exitDate" value={form.exitDate} onChange={handleChange} required /></div>
                    <div className="db-fg"><label className="db-lbl">Market</label><select className="db-sel" name="market" value={form.market} onChange={handleChange}>{['Stocks','Crypto','Forex','Futures','Options','Commodities'].map(m => <option key={m}>{m}</option>)}</select></div>
                    <div className="db-fg"><label className="db-lbl">Direction</label><select className="db-sel" name="direction" value={form.direction} onChange={handleChange}><option>Long</option><option>Short</option></select></div>
                    <div className="db-fg"><label className="db-lbl">Entry Price ({getCurrency(form.market).symbol})</label><input className="db-inp" type="number" step="any" name="entryPrice" placeholder="0.00" value={form.entryPrice} onChange={handleChange} required /></div>
                    <div className="db-fg"><label className="db-lbl">Exit Price ({getCurrency(form.market).symbol})</label><input className="db-inp" type="number" step="any" name="exitPrice" placeholder="0.00" value={form.exitPrice} onChange={handleChange} required /></div>
                    <div className="db-fg"><label className="db-lbl">Quantity</label><input className="db-inp" type="number" step="any" name="quantity" placeholder="1" value={form.quantity} onChange={handleChange} required /></div>
                    <div className="db-fg"><label className="db-lbl">Strategy</label><input className="db-inp" name="strategy" placeholder="e.g. Breakout" value={form.strategy} onChange={handleChange} /></div>
                    <div className="db-fg"><label className="db-lbl">Brokerage ({getCurrency(form.market).symbol})</label><input className="db-inp" type="number" step="any" min="0" name="brokerage" placeholder="e.g. 40" value={form.brokerage} onChange={handleChange} /></div>
                    {['Forex', 'Crypto'].includes(form.market) && (
                      <div className="db-fg">
                        <label className="db-lbl">Leverage</label>
                        <input className="db-inp" type="number" min="1" step="any" name="leverage" placeholder="e.g. 10" value={form.leverage} onChange={handleChange} required />
                      </div>
                    )}

                    {/* ── LIVE P&L PREVIEW (shown when prices & qty are filled) ── */}
                    {modalPnL && (
                      <div className="db-form-full">
                        <div className="modal-pnl-panel">
                          <div className="modal-pnl-row">
                            <span className="modal-pnl-label">Net P&amp;L</span>
                            <span className="modal-pnl-value" style={{color: parseFloat(modalPnL.net) >= 0 ? 'var(--acc)' : 'var(--red)'}}>
                              {parseFloat(modalPnL.net) >= 0 ? '+' : '−'}{formatAmount(modalPnL.net, form.market)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="db-fg db-form-full"><label className="db-lbl">Notes</label><textarea className="db-ta" name="notes" placeholder="What happened? Lessons learned..." value={form.notes} onChange={handleChange} /></div>
                  </div>
                </div>
                <div className="db-modal-footer">
                  <button type="button" className="db-btn-cancel" onClick={closeModal}>Cancel</button>
                  <button type="submit" className={`db-btn-save ${editTrade ? 'edit-mode' : ''}`} disabled={submitting}>
                    {submitting ? 'Saving...' : editTrade ? '✎ Update Trade' : 'Save Trade'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
