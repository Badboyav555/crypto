/* ============================================
   CRYPTO VAULT - MAIN APPLICATION
   ============================================ */

// ── Supabase Configuration ──
const SUPABASE_URL = 'https://mhxeokmuceyibtbmeoak.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_crdLnlfyDOI1KOgqAK_bHQ_UkC400OS';

let supabaseClient;
try {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (e) {
  console.warn('Supabase not configured. Running in demo mode.');
  supabaseClient = null;
}

const sb = supabaseClient;

// ── Coin Definitions ──
const COINS = {
  BTC: { name: 'Bitcoin', symbol: 'BTC', color: '#F7931A', letter: 'B', geckoId: 'bitcoin', decimals: 8 },
  ETH: { name: 'Ethereum', symbol: 'ETH', color: '#627EEA', letter: 'E', geckoId: 'ethereum', decimals: 8 },
  SOL: { name: 'Solana', symbol: 'SOL', color: '#9945FF', letter: 'S', geckoId: 'solana', decimals: 6 },
  XRP: { name: 'XRP', symbol: 'XRP', color: '#23292F', letter: 'X', geckoId: 'ripple', decimals: 6 },
  DOGE: { name: 'Dogecoin', symbol: 'DOGE', color: '#C2A633', letter: 'D', geckoId: 'dogecoin', decimals: 4 },
  BNB: { name: 'BNB', symbol: 'BNB', color: '#F3BA2F', letter: 'B', geckoId: 'binancecoin', decimals: 6 },
  USDT: { name: 'Tether', symbol: 'USDT', color: '#26A17B', letter: 'T', geckoId: 'tether', decimals: 4 }
};

const COIN_KEYS = Object.keys(COINS);

// ── App State ──
const state = {
  user: null,
  profile: null,
  wallet: null,
  prices: {},
  transactions: [],
  withdrawals: [],
  notifications: [],
  watchlist: [],
  currentTab: 'home',
  theme: localStorage.getItem('cv_theme') || 'dark',
  twoFa: localStorage.getItem('cv_2fa') === 'true',
  lastReward: null,
  isDemo: !supabaseClient
};

// ── Demo Data ──
const DEMO_PROFILE = {
  id: 'demo-001',
  username: 'DemoUser',
  email: 'demo@cryptovault.app',
  avatar_url: '',
  role: 'user',
  referral_code: 'DEMO1234',
  created_at: new Date().toISOString()
};

const DEMO_WALLET = {
  id: 'dw-001',
  user_id: 'demo-001',
  btc_balance: 0.01500,
  eth_balance: 0.25000,
  usdt_balance: 50.00,
  sol_balance: 2.50000,
  xrp_balance: 100.000000,
  doge_balance: 500.0000,
  bnb_balance: 0.100000,
  inr_balance: 5000.00,
  wallet_address: '0x7a3b9c8d2e1f4a5b6c7d8e9f0a1b2c3d4e5f6a7b',
  frozen: false,
  created_at: new Date().toISOString()
};

const DEMO_PRICES = {
  BTC: { price: 8250000, change: 2.34 },
  ETH: { price: 245000, change: -1.12 },
  SOL: { price: 18200, change: 5.67 },
  XRP: { price: 48.50, change: 0.89 },
  DOGE: { price: 22.30, change: -3.45 },
  BNB: { price: 72000, change: 1.23 },
  USDT: { price: 83.50, change: 0.01 }
};

// ── Utilities ──
function formatINR(num) {
  if (num === null || num === undefined || isNaN(num)) return '₹0.00';
  const n = parseFloat(num);
  if (n >= 10000000) return '₹' + (n / 10000000).toFixed(2) + ' Cr';
  if (n >= 100000) return '₹' + (n / 100000).toFixed(2) + ' L';
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatCrypto(num, decimals) {
  if (!num) return '0';
  const d = decimals || 8;
  return parseFloat(num).toFixed(d).replace(/\.?0+$/, '') || '0';
}

function generateTxHash() {
  const chars = '0123456789abcdef';
  let hash = '0x';
  for (let i = 0; i < 64; i++) hash += chars[Math.floor(Math.random() * 16)];
  return hash;
}

function timeAgo(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function coinIconHTML(coinKey, size) {
  const c = COINS[coinKey];
  if (!c) return '';
  const s = size || 40;
  return `<div style="width:${s}px;height:${s}px;border-radius:50%;background:${c.color};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:${s * 0.4}px;color:#fff;flex-shrink:0">${c.letter}</div>`;
}

// ── Toast ──
const UI = {
  showToast(msg, type) {
    const t = document.getElementById('toast');
    const icon = document.getElementById('toastIcon');
    const msgEl = document.getElementById('toastMsg');
    t.className = 'toast ' + type;
    msgEl.textContent = msg;
    const icons = { success: '&#10003;', error: '&#10007;', info: '&#9432;' };
    icon.innerHTML = icons[type] || icons.info;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
  },

  openModal(id) {
    document.getElementById(id).classList.add('active');
    document.body.style.overflow = 'hidden';
    if (id === 'receiveModal') Wallet.generateQR();
    if (id === 'notifModal') Notif.render();
    if (id === 'sendModal') Transaction.initSendModal();
    if (id === 'withdrawModal') Withdrawal.initModal();
  },

  closeModal(id) {
    document.getElementById(id).classList.remove('active');
    document.body.style.overflow = '';
    if (id === 'sendModal') {
      document.getElementById('sendFormView').classList.remove('hidden');
      document.getElementById('sendSuccessView').classList.add('hidden');
    }
    if (id === 'withdrawModal') {
      document.getElementById('wdFormView').classList.remove('hidden');
      document.getElementById('wdSuccessView').classList.add('hidden');
    }
  },

  closeModalOnOverlay(e, id) {
    if (e.target === e.currentTarget) UI.closeModal(id);
  },

  switchTab(tab) {
    state.currentTab = tab;
    document.querySelectorAll('.section-content').forEach(s => s.classList.remove('active'));
    document.getElementById(tab + 'Section').classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => {
      n.classList.toggle('active', n.dataset.tab === tab);
    });
    const fab = document.getElementById('fabBtn');
    fab.style.display = (tab === 'home' || tab === 'wallet') ? 'flex' : 'none';
    if (tab === 'wallet') Wallet.renderWalletSection();
    if (tab === 'activity') Transaction.renderList();
    if (tab === 'markets') Market.render();
    if (tab === 'profile') Profile.render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  skeleton(show) {}
};

// ── Auth Module ──
const Auth = {
  isSignUp: false,

  init() {
    document.getElementById('authToggle').addEventListener('click', (e) => {
      if (e.target.id !== 'authToggleLink') return;
      Auth.isSignUp = !Auth.isSignUp;
      document.getElementById('authTitle').textContent = Auth.isSignUp ? 'Create Account' : 'Welcome Back';
      document.getElementById('authSubtitle').textContent = Auth.isSignUp ? 'Sign up for a new CryptoVault wallet' : 'Sign in to your CryptoVault wallet';
      document.getElementById('authBtnText').textContent = Auth.isSignUp ? 'Create Account' : 'Sign In';
      document.getElementById('usernameGroup').style.display = Auth.isSignUp ? 'block' : 'none';
      document.getElementById('authToggle').innerHTML = Auth.isSignUp
        ? 'Already have an account? <a id="authToggleLink" href="javascript:void(0)">Sign in</a>'
        : 'Don\'t have an account? <a id="authToggleLink" href="javascript:void(0)">Create one</a>';
    });

    document.getElementById('authForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('authEmail').value.trim();
      const password = document.getElementById('authPassword').value;
      const username = document.getElementById('authUsername').value.trim();
      const errEl = document.getElementById('authError');
      const btn = document.getElementById('authBtn');
      const btnText = document.getElementById('authBtnText');

      errEl.classList.remove('show');
      btn.disabled = true;
      btnText.innerHTML = '<span class="spinner"></span>';

      try {
        if (state.isDemo) {
          state.user = { id: DEMO_PROFILE.id, email: email || DEMO_PROFILE.email };
          state.profile = { ...DEMO_PROFILE, email: email || DEMO_PROFILE.email, username: username || DEMO_PROFILE.username };
          state.wallet = { ...DEMO_WALLET };
          state.prices = { ...DEMO_PRICES };
          Auth.onLogin();
          return;
        }

        let result;
        if (Auth.isSignUp) {
          result = await sb.auth.signUp({
            email, password,
            options: { data: { username: username || email.split('@')[0] } }
          });
        } else {
          result = await sb.auth.signInWithPassword({ email, password });
        }

        if (result.error) throw result.error;

        if (result.data.user && !result.data.session) {
          errEl.textContent = 'Please check your email to verify your account.';
          errEl.classList.add('show');
          btn.disabled = false;
          btnText.textContent = Auth.isSignUp ? 'Create Account' : 'Sign In';
          return;
        }

        state.user = result.data.user;
        await Auth.loadUserData();
        Auth.onLogin();

      } catch (err) {
        console.error('Auth error:', err);
        errEl.textContent = err.message || 'Authentication failed';
        errEl.classList.add('show');
        btn.disabled = false;
        btnText.textContent = Auth.isSignUp ? 'Create Account' : 'Sign In';
      }
    });

    Auth.checkSession();
  },

  async checkSession() {
    if (state.isDemo) {
      state.user = { id: DEMO_PROFILE.id, email: DEMO_PROFILE.email };
      state.profile = { ...DEMO_PROFILE };
      state.wallet = { ...DEMO_WALLET };
      state.prices = { ...DEMO_PRICES };
      Auth.onLogin();
      return;
    }

    try {
      const { data, error } = await sb.auth.getSession();
      if (error) throw error;
      if (data && data.session && data.session.user) {
        state.user = data.session.user;
        await Auth.loadUserData();
        Auth.onLogin();
      }
    } catch (e) {
      console.warn('Session check failed:', e);
    }
  },

  async loadUserData() {
    if (state.isDemo) return;
    if (!state.user || !state.user.id) return;

    try {
      const [profileRes, walletRes] = await Promise.all([
        sb.from('profiles').select('*').eq('id', state.user.id).single(),
        sb.from('wallets').select('*').eq('user_id', state.user.id).single()
      ]);

      state.profile = profileRes.data;
      state.wallet = walletRes.data;

      if (!state.profile) {
        const p = {
          id: state.user.id,
          username: state.user.user_metadata?.username || state.user.email?.split('@')[0] || 'User',
          email: state.user.email || '',
          avatar_url: '',
          role: 'user',
          referral_code: 'CV' + Math.random().toString(36).substring(2, 8).toUpperCase(),
          created_at: new Date().toISOString()
        };
        const { data } = await sb.from('profiles').insert(p).select().single();
        if (data) state.profile = data;
      }

      if (!state.wallet) {
        const w = {
          user_id: state.user.id,
          btc_balance: 0, eth_balance: 0, usdt_balance: 0,
          sol_balance: 0, xrp_balance: 0, doge_balance: 0, bnb_balance: 0,
          inr_balance: 0,
          wallet_address: '0x' + Array.from({length: 40}, () => Math.floor(Math.random() * 16).toString(16)).join(''),
          frozen: false,
          created_at: new Date().toISOString()
        };
        const { data } = await sb.from('wallets').insert(w).select().single();
        if (data) state.wallet = data;
      }
    } catch (e) {
      console.error('loadUserData error:', e);
    }
  },

  onLogin() {
    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    if (typeof App !== 'undefined' && App.init) App.init();
  },

  async signOut() {
    if (!state.isDemo && sb) {
      try { await sb.auth.signOut(); } catch (e) {}
    }
    state.user = null;
    state.profile = null;
    state.wallet = null;
    document.getElementById('mainApp').classList.add('hidden');
    document.getElementById('authScreen').classList.remove('hidden');
    document.getElementById('authError').classList.remove('show');
    document.getElementById('authBtn').disabled = false;
    document.getElementById('authBtnText').textContent = 'Sign In';
    Auth.isSignUp = false;
    document.getElementById('authTitle').textContent = 'Welcome Back';
    document.getElementById('authSubtitle').textContent = 'Sign in to your CryptoVault wallet';
    document.getElementById('usernameGroup').style.display = 'none';
    document.getElementById('authToggle').innerHTML = 'Don\'t have an account? <a id="authToggleLink" href="javascript:void(0)">Create one</a>';
  }
};

// ── Market Module ──

// ── Market Module ──
const Market = {
  filterText: '',
  filterType: 'all',

  async fetchPrices() {
    if (state.isDemo) {
      state.prices = { ...DEMO_PRICES };
      // Simulate small random changes
      COIN_KEYS.forEach(k => {
        state.prices[k].change += (Math.random() - 0.5) * 0.5;
        state.prices[k].price *= (1 + (Math.random() - 0.5) * 0.002);
      });
      return;
    }

    try {
      const ids = COIN_KEYS.map(k => COINS[k].geckoId).join(',');
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=inr&include_24hr_change=true`);
      const data = await res.json();
      COIN_KEYS.forEach(k => {
        const g = COINS[k].geckoId;
        if (data[g]) {
          state.prices[k] = {
            price: data[g].inr,
            change: data[g].inr_24h_change || 0
          };
        }
      });
      // Update DB
      for (const k of COIN_KEYS) {
        if (state.prices[k]) {
          await sb.from('market_prices').upsert({
            coin_name: COINS[k].name,
            symbol: k,
            current_price_inr: state.prices[k].price,
            change_percentage: state.prices[k].change
          }, { onConflict: 'symbol' });
        }
      }
    } catch (e) {
      console.warn('Price fetch failed, using cached', e);
      // Fallback to DB prices
      if (!state.isDemo) {
        const { data } = await sb.from('market_prices').select('*');
        if (data) data.forEach(r => {
          state.prices[r.symbol] = { price: r.current_price_inr, change: r.change_percentage };
        });
      }
    }
  },

  render() {
    const container = document.getElementById('marketList');
    let coins = COIN_KEYS.filter(k => state.prices[k]);

    if (this.filterText) {
      const q = this.filterText.toLowerCase();
      coins = coins.filter(k => COINS[k].name.toLowerCase().includes(q) || k.toLowerCase().includes(q));
    }

    if (this.filterType === 'gainers') coins = coins.filter(k => state.prices[k].change > 0);
    else if (this.filterType === 'losers') coins = coins.filter(k => state.prices[k].change < 0);
    else if (this.filterType === 'watchlist') coins = coins.filter(k => state.watchlist.includes(k));

    if (!coins.length) {
      container.innerHTML = '<p class="text-muted fs-sm text-center" style="padding:40px 0">No coins found</p>';
      return;
    }

    container.innerHTML = coins.map(k => {
      const c = COINS[k];
      const p = state.prices[k];
      const isUp = p.change >= 0;
      const inWl = state.watchlist.includes(k);
      return `
        <div class="coin-item" onclick="Market.showDetail('${k}')">
          ${coinIconHTML(k)}
          <div class="coin-info">
            <div class="coin-name">${c.name}</div>
            <div class="coin-symbol">${c.symbol}</div>
          </div>
          <div class="watchlist-star ${inWl ? 'active' : ''}" onclick="event.stopPropagation();Market.toggleWatchlist('${k}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="${inWl ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </div>
          <div class="coin-price-col">
            <div class="coin-price">${formatINR(p.price)}</div>
            <div class="coin-change ${isUp ? 'up' : 'down'}">${isUp ? '+' : ''}${p.change.toFixed(2)}%</div>
          </div>
        </div>`;
    }).join('');
  },

  filter(val) { this.filterText = val; this.render(); },
  setFilter(type, el) {
    this.filterType = type;
    document.querySelectorAll('#marketFilters .filter-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    this.render();
  },

  async toggleWatchlist(symbol) {
    const idx = state.watchlist.indexOf(symbol);
    if (idx > -1) {
      state.watchlist.splice(idx, 1);
      if (!state.isDemo) await sb.from('watchlist').delete().eq('user_id', state.user.id).eq('symbol', symbol);
      UI.showToast(`Removed ${symbol} from watchlist`, 'info');
    } else {
      state.watchlist.push(symbol);
      if (!state.isDemo) await sb.from('watchlist').insert({ user_id: state.user.id, symbol });
      UI.showToast(`Added ${symbol} to watchlist`, 'success');
    }
    this.render();
  },

  showDetail(symbol) {
    const c = COINS[symbol];
    const p = state.prices[symbol];
    if (!p) return;
    document.getElementById('coinDetailTitle').textContent = c.name;
    const isUp = p.change >= 0;
    const bal = state.wallet ? state.wallet[symbol.toLowerCase() + '_balance'] || 0 : 0;
    document.getElementById('coinDetailBody').innerHTML = `
      <div class="text-center mb-16">
        ${coinIconHTML(symbol, 64)}
        <div style="font-size:1.75rem;font-weight:800;margin-top:12px">${formatINR(p.price)}</div>
        <div class="${isUp ? 'text-green' : 'text-red'} fw-600 fs-sm" style="margin-top:4px">${isUp ? '+' : ''}${p.change.toFixed(2)}% (24h)</div>
      </div>
      <div class="card">
        <div class="flex justify-between mb-8">
          <span class="text-muted fs-sm">Your Balance</span>
          <span class="fw-600 fs-sm">${formatCrypto(bal, c.decimals)} ${symbol}</span>
        </div>
        <div class="flex justify-between mb-8">
          <span class="text-muted fs-sm">Value in INR</span>
          <span class="fw-600 fs-sm">${formatINR(bal * p.price)}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted fs-sm">Market Rank</span>
          <span class="fw-600 fs-sm">#${COIN_KEYS.indexOf(symbol) + 1}</span>
        </div>
      </div>
      <div class="flex gap-8 mt-16">
        <button class="btn-primary" style="flex:1" onclick="UI.closeModal('coinDetailModal');Transaction.preSelectCoin('${symbol}');UI.openModal('sendModal')">Send</button>
        <button class="btn-secondary" style="flex:1" onclick="UI.closeModal('coinDetailModal');UI.openModal('receiveModal')">Receive</button>
      </div>`;
    UI.openModal('coinDetailModal');
  }
};

// ── Wallet Module ──
const Wallet = {
  getBalance() {
    if (!state.wallet) return 0;
    let total = state.wallet.inr_balance || 0;
    COIN_KEYS.forEach(k => {
      const bal = state.wallet[k.toLowerCase() + '_balance'] || 0;
      const price = state.prices[k] ? state.prices[k].price : 0;
      total += bal * price;
    });
    return total;
  },

  getPortfolioChange() {
    // Simulated portfolio change
    const changes = COIN_KEYS.map(k => {
      const bal = state.wallet ? (state.wallet[k.toLowerCase() + '_balance'] || 0) : 0;
      const price = state.prices[k] ? state.prices[k].price : 0;
      const change = state.prices[k] ? state.prices[k].change : 0;
      return bal * price * (change / 100);
    });
    const totalChange = changes.reduce((a, b) => a + b, 0);
    const total = this.getBalance();
    return total > 0 ? (totalChange / (total - totalChange)) * 100 : 0;
  },

  renderHomeBalance() {
    const total = this.getBalance();
    const change = this.getPortfolioChange();
    const isUp = change >= 0;

    // Animate counter
    this.animateCounter('totalBalance', total, '₹');

    const changeEl = document.getElementById('balanceChange');
    changeEl.className = 'balance-change ' + (isUp ? 'up' : 'down');
    changeEl.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="${isUp ? 'm18 15-6-6-6 6' : 'm6 9 6 6 6-6'}"/></svg>
      <span>${isUp ? '+' : ''}${change.toFixed(2)}%</span>`;
  },

  animateCounter(elementId, target, prefix) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const start = parseFloat(el.textContent.replace(/[^0-9.-]/g, '')) || 0;
    const duration = 800;
    const startTime = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (target - start) * eased;
      el.textContent = formatINR(current);
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  },

  renderPortfolioChart() {
    const canvas = document.getElementById('portfolioChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Generate simulated portfolio history
    const points = 30;
    const base = this.getBalance();
    const data = [];
    for (let i = 0; i < points; i++) {
      data.push(base * (0.92 + Math.random() * 0.16 + (i / points) * 0.04));
    }
    data.push(base);

    const gradient = ctx.createLinearGradient(0, 0, 0, 80);
    gradient.addColorStop(0, 'rgba(99,102,241,0.3)');
    gradient.addColorStop(1, 'rgba(99,102,241,0.0)');

    if (this._chart) this._chart.destroy();
    this._chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map((_, i) => i),
        datasets: [{
          data,
          borderColor: '#818cf8',
          borderWidth: 2,
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { display: false },
          y: { display: false }
        },
        interaction: { intersect: false },
        animation: { duration: 1000, easing: 'easeOutQuart' }
      }
    });
  },

  renderHomeHoldings() {
    const container = document.getElementById('homeHoldings');
    if (!state.wallet) { container.innerHTML = ''; return; }

    const holdings = COIN_KEYS
      .map(k => ({
        symbol: k,
        balance: state.wallet[k.toLowerCase() + '_balance'] || 0,
        price: state.prices[k] ? state.prices[k].price : 0,
        change: state.prices[k] ? state.prices[k].change : 0
      }))
      .filter(h => h.balance > 0)
      .sort((a, b) => (b.balance * b.price) - (a.balance * a.price))
      .slice(0, 4);

    if (!holdings.length) {
      container.innerHTML = '<p class="text-muted fs-sm text-center" style="padding:20px 0">No holdings yet</p>';
      return;
    }

    container.innerHTML = holdings.map(h => {
      const isUp = h.change >= 0;
      return `
        <div class="coin-item" onclick="Market.showDetail('${h.symbol}')">
          ${coinIconHTML(h.symbol)}
          <div class="coin-info">
            <div class="coin-name">${COINS[h.symbol].name}</div>
            <div class="coin-symbol">${formatCrypto(h.balance, COINS[h.symbol].decimals)} ${h.symbol}</div>
          </div>
          <div class="coin-price-col">
            <div class="coin-price">${formatINR(h.balance * h.price)}</div>
            <div class="coin-change ${isUp ? 'up' : 'down'}">${isUp ? '+' : ''}${h.change.toFixed(2)}%</div>
          </div>
        </div>`;
    }).join('');
  },

  renderHomeTrending() {
    const container = document.getElementById('homeTrending');
    const sorted = COIN_KEYS
      .filter(k => state.prices[k])
      .sort((a, b) => Math.abs(state.prices[b].change) - Math.abs(state.prices[a].change))
      .slice(0, 3);

    container.innerHTML = sorted.map(k => {
      const p = state.prices[k];
      const isUp = p.change >= 0;
      return `
        <div class="coin-item" onclick="Market.showDetail('${k}')">
          ${coinIconHTML(k, 36)}
          <div class="coin-info">
            <div class="coin-name">${COINS[k].name}</div>
            <div class="coin-symbol">${k}</div>
          </div>
          <div class="coin-price-col">
            <div class="coin-price">${formatINR(p.price)}</div>
            <div class="coin-change ${isUp ? 'up' : 'down'}">${isUp ? '+' : ''}${p.change.toFixed(2)}%</div>
          </div>
        </div>`;
    }).join('');
  },

  renderWalletSection() {
    const bal = this.getBalance();
    const change = this.getPortfolioChange();
    const isUp = change >= 0;

    document.getElementById('walletBalance').textContent = formatINR(bal);
    const changeEl = document.getElementById('walletChange');
    changeEl.className = 'balance-change ' + (isUp ? 'up' : 'down');
    changeEl.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="${isUp ? 'm18 15-6-6-6 6' : 'm6 9 6 6 6-6'}"/></svg>
      <span>${isUp ? '+' : ''}${change.toFixed(2)}%</span>`;

    const container = document.getElementById('walletCoinList');
    if (!state.wallet) return;

    const allCoins = COIN_KEYS.map(k => {
      const bal = state.wallet[k.toLowerCase() + '_balance'] || 0;
      const price = state.prices[k] ? state.prices[k].price : 0;
      const change = state.prices[k] ? state.prices[k].change : 0;
      return { symbol: k, balance: bal, price, change };
    }).sort((a, b) => (b.balance * b.price) - (a.balance * a.price));

    container.innerHTML = allCoins.map(c => {
      const isUp = c.change >= 0;
      const val = c.balance * c.price;
      return `
        <div class="coin-item" onclick="Market.showDetail('${c.symbol}')">
          ${coinIconHTML(c.symbol)}
          <div class="coin-info">
            <div class="coin-name">${COINS[c.symbol].name}</div>
            <div class="coin-symbol">${formatCrypto(c.balance, COINS[c.symbol].decimals)} ${c.symbol}</div>
          </div>
          <div style="text-align:right">
            <div class="coin-price">${formatINR(val)}</div>
            <div class="coin-change ${isUp ? 'up' : 'down'}">${isUp ? '+' : ''}${c.change.toFixed(2)}%</div>
          </div>
        </div>`;
    }).join('');
  },

  async generateQR() {
    const addr = state.wallet ? state.wallet.wallet_address : '0x0000000000000000000000000000000000000000';
    document.getElementById('receiveAddr').textContent = addr;
    const canvas = document.getElementById('qrCanvas');
    try {
      await QRCode.toCanvas(canvas, addr, {
        width: 200,
        margin: 2,
        color: { dark: '#111827', light: '#ffffff' }
      });
    } catch (e) {
      console.warn('QR generation failed', e);
    }
  },

  copyAddress() {
    if (!state.wallet) return;
    navigator.clipboard.writeText(state.wallet.wallet_address).then(() => {
      UI.showToast('Address copied to clipboard', 'success');
    }).catch(() => {
      UI.showToast('Failed to copy', 'error');
    });
  },

  shareAddress() {
    if (!state.wallet) return;
    if (navigator.share) {
      navigator.share({ title: 'My Wallet Address', text: state.wallet.wallet_address });
    } else {
      this.copyAddress();
    }
  },

  async claimReward() {
    if (state.wallet.frozen) { UI.showToast('Account is frozen', 'error'); return; }

    const lastClaim = localStorage.getItem('cv_last_reward');
    if (lastClaim) {
      const elapsed = Date.now() - parseInt(lastClaim);
      if (elapsed < 86400000) {
        const remaining = 86400000 - elapsed;
        const hours = Math.floor(remaining / 3600000);
        const mins = Math.floor((remaining % 3600000) / 60000);
        UI.showToast(`Come back in ${hours}h ${mins}m`, 'info');
        return;
      }
    }

    // Random reward
    const coinKeys = ['BTC', 'ETH', 'SOL', 'DOGE', 'XRP'];
    const rewardCoin = coinKeys[Math.floor(Math.random() * coinKeys.length)];
    const rewards = { BTC: 0.00001, ETH: 0.0005, SOL: 0.01, DOGE: 5, XRP: 2 };
    const amount = rewards[rewardCoin];

    if (state.isDemo) {
      state.wallet[rewardCoin.toLowerCase() + '_balance'] += amount;
    } else {
      const update = {};
      update[rewardCoin.toLowerCase() + '_balance'] = amount;
      await sb.from('wallets').update(update, { sql: `${rewardCoin.toLowerCase()}_balance = ${rewardCoin.toLowerCase()}_balance + ${amount}` }).eq('user_id', state.user.id);
      // Refetch wallet
      const { data } = await sb.from('wallets').select('*').eq('user_id', state.user.id).single();
      state.wallet = data;
    }

    localStorage.setItem('cv_last_reward', Date.now().toString());
    UI.showToast(`Claimed ${amount} ${rewardCoin}!`, 'success');
    Wallet.updateRewardUI();
    Wallet.renderHomeHoldings();
    Wallet.renderHomeBalance();
  },

  updateRewardUI() {
    const lastClaim = localStorage.getItem('cv_last_reward');
    const card = document.getElementById('rewardCard');
    const btn = document.getElementById('rewardBtn');

    if (lastClaim && (Date.now() - parseInt(lastClaim)) < 86400000) {
      card.classList.add('claimed');
      btn.textContent = 'Claimed';
    } else {
      card.classList.remove('claimed');
      btn.textContent = 'Claim';
    }
  }
};

// ── Transaction Module ──
const Transaction = {
  allTx: [],
  filterText: '',
  filterType: 'all',
  selectedCoin: 'BTC',

  async loadAll() {
    if (state.isDemo) {
      this.allTx = [];
      return;
    }

    const [txRes, wdRes] = await Promise.all([
      sb.from('transactions').select('*').or(`sender_id.eq.${state.user.id},receiver_id.eq.${state.user.id}`).order('created_at', { ascending: false }),
      sb.from('withdrawals').select('*').eq('user_id', state.user.id).order('created_at', { ascending: false })
    ]);

    state.transactions = txRes.data || [];
    state.withdrawals = wdRes.data || [];

    // Merge for display
    this.allTx = [
      ...state.transactions.map(t => ({
        type: t.sender_id === state.user.id ? 'sent' : 'received',
        coin: t.coin,
        amount: t.amount,
        amountInr: t.amount_inr,
        txHash: t.tx_hash,
        status: t.status,
        date: t.created_at,
        id: t.id
      })),
      ...state.withdrawals.map(w => ({
        type: 'withdrawal',
        coin: w.coin,
        amount: w.crypto_amount,
        amountInr: w.amount_inr,
        txHash: null,
        status: w.status,
        date: w.created_at,
        method: w.withdrawal_method,
        id: w.id
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  renderList() {
    const container = document.getElementById('txList');
    let items = this.allTx;

    if (this.filterText) {
      const q = this.filterText.toLowerCase();
      items = items.filter(t => t.coin.toLowerCase().includes(q) || (t.txHash && t.txHash.toLowerCase().includes(q)));
    }

    if (this.filterType !== 'all') {
      items = items.filter(t => t.type === this.filterType);
    }

    if (!items.length) {
      container.innerHTML = '<p class="text-muted fs-sm text-center" style="padding:40px 0">No transactions found</p>';
      return;
    }

    container.innerHTML = items.map(t => {
      const iconClass = t.type === 'sent' ? 'sent' : t.type === 'withdrawal' ? 'withdrawal' : 'received';
      const iconSvg = t.type === 'sent'
        ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m18 15-6-6-6 6"/></svg>'
        : t.type === 'withdrawal'
          ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>'
          : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>';

      const title = t.type === 'sent' ? `Sent ${t.coin}` : t.type === 'withdrawal' ? `Withdrawal (${t.coin})` : `Received ${t.coin}`;
      const amountStr = (t.type === 'sent' || t.type === 'withdrawal') ? `-${formatCrypto(t.amount, COINS[t.coin]?.decimals || 4)} ${t.coin}` : `+${formatCrypto(t.amount, COINS[t.coin]?.decimals || 4)} ${t.coin}`;
      const statusClass = t.status === 'completed' ? 'badge-completed' : t.status === 'pending' ? 'badge-pending' : t.status === 'confirming' ? 'badge-confirming' : t.status === 'processing' ? 'badge-processing' : t.status === 'approved' ? 'badge-approved' : 'badge-failed';

      return `
        <div class="tx-item" onclick="Transaction.showDetail('${t.id}','${t.type}')">
          <div class="tx-icon ${iconClass}">${iconSvg}</div>
          <div class="tx-info">
            <div class="tx-title">${title}</div>
            <div class="tx-sub">${timeAgo(t.date)}</div>
          </div>
          <div class="tx-amount">
            <div class="tx-amount-val">${amountStr}</div>
            <div class="tx-amount-sub"><span class="badge ${statusClass}">${t.status}</span></div>
          </div>
        </div>`;
    }).join('');
  },

  renderHomeActivity() {
    const container = document.getElementById('homeActivity');
    const recent = this.allTx.slice(0, 3);
    if (!recent.length) {
      container.innerHTML = '<p class="text-muted fs-sm text-center" style="padding:20px 0">No recent activity</p>';
      return;
    }

    container.innerHTML = recent.map(t => {
      const iconClass = t.type === 'sent' ? 'sent' : t.type === 'withdrawal' ? 'withdrawal' : 'received';
      const iconSvg = t.type === 'sent'
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m18 15-6-6-6 6"/></svg>'
        : t.type === 'withdrawal'
          ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>'
          : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>';

      const title = t.type === 'sent' ? `Sent ${t.coin}` : t.type === 'withdrawal' ? `Withdrawal` : `Received ${t.coin}`;
      const amountStr = (t.type === 'sent' || t.type === 'withdrawal') ? `-${formatCrypto(t.amount, 4)}` : `+${formatCrypto(t.amount, 4)}`;

      return `
        <div class="tx-item" onclick="Transaction.showDetail('${t.id}','${t.type}')">
          <div class="tx-icon ${iconClass}">${iconSvg}</div>
          <div class="tx-info">
            <div class="tx-title">${title}</div>
            <div class="tx-sub">${timeAgo(t.date)}</div>
          </div>
          <div class="tx-amount">
            <div class="tx-amount-val">${amountStr} ${t.coin}</div>
            <div class="tx-amount-sub">${formatINR(t.amountInr)}</div>
          </div>
        </div>`;
    }).join('');
  },

  initSendModal() {
    const container = document.getElementById('sendCoinSelector');
    container.innerHTML = COIN_KEYS.map(k => {
      const bal = state.wallet ? state.wallet[k.toLowerCase() + '_balance'] || 0 : 0;
      return `<div class="coin-chip ${k === this.selectedCoin ? 'active' : ''}" onclick="Transaction.selectSendCoin('${k}')">
        <span class="coin-chip-dot" style="background:${COINS[k].color}">${COINS[k].letter}</span>
        ${k}
      </div>`;
    }).join('');
    this.updateSendAvailable();
  },

  selectSendCoin(symbol) {
    this.selectedCoin = symbol;
    document.querySelectorAll('#sendCoinSelector .coin-chip').forEach(c => c.classList.remove('active'));
    event.target.closest('.coin-chip').classList.add('active');
    this.updateSendAvailable();
    this.updateSendPreview();
  },

  preSelectCoin(symbol) {
    this.selectedCoin = symbol;
  },

  updateSendAvailable() {
    const bal = state.wallet ? state.wallet[this.selectedCoin.toLowerCase() + '_balance'] || 0 : 0;
    document.getElementById('sendAvailable').textContent = formatCrypto(bal, COINS[this.selectedCoin]?.decimals || 8) + ' ' + this.selectedCoin;
  },

  sendMax() {
    const bal = state.wallet ? state.wallet[this.selectedCoin.toLowerCase() + '_balance'] || 0 : 0;
    document.getElementById('sendAmount').value = bal;
    this.updateSendPreview();
  },

  updateSendPreview() {
    const amount = parseFloat(document.getElementById('sendAmount').value) || 0;
    const price = state.prices[this.selectedCoin] ? state.prices[this.selectedCoin].price : 0;
    document.getElementById('sendInrValue').textContent = formatINR(amount * price);
  },

  async send() {
    const address = document.getElementById('sendAddress').value.trim();
    const amount = parseFloat(document.getElementById('sendAmount').value);
    const coin = this.selectedCoin;

    if (!address) { UI.showToast('Enter recipient address', 'error'); return; }
    if (!amount || amount <= 0) { UI.showToast('Enter valid amount', 'error'); return; }

    const bal = state.wallet[coin.toLowerCase() + '_balance'] || 0;
    if (amount > bal) { UI.showToast('Insufficient balance', 'error'); return; }
    if (state.wallet.frozen) { UI.showToast('Account is frozen', 'error'); return; }

    const btn = document.getElementById('sendBtn');
    btn.disabled = true;
    btn.textContent = 'Processing...';

    const txHash = generateTxHash();
    const price = state.prices[coin] ? state.prices[coin].price : 0;
    const amountInr = amount * price;

    try {
      if (state.isDemo) {
        // Deduct from sender
        state.wallet[coin.toLowerCase() + '_balance'] -= amount;
        // Simulate adding to receiver (just reduce balance in demo)
      } else {
        // Deduct balance
        const col = coin.toLowerCase() + '_balance';
        await sb.rpc('deduct_balance', { p_user_id: state.user.id, p_column: col, p_amount: amount }).catch(() => {
          // Fallback: direct update
          return sb.from('wallets').update({ [col]: bal - amount }).eq('user_id', state.user.id);
        });

        // Create transaction
        await sb.from('transactions').insert({
          sender_id: state.user.id,
          receiver_id: null,
          coin, amount, amount_inr: amountInr,
          tx_hash: txHash,
          status: 'pending',
          confirmations: 0
        });

        // If receiver exists in our system, credit them
        const { data: recvWallet } = await sb.from('wallets').select('user_id').eq('wallet_address', address).single();
        if (recvWallet) {
          await sb.from('transactions').update({ receiver_id: recvWallet.user_id }).eq('tx_hash', txHash);
          // Credit receiver
          const { data: rw } = await sb.from('wallets').select(col).eq('user_id', recvWallet.user_id).single();
          if (rw) {
            await sb.from('wallets').update({ [col]: (rw[col] || 0) + amount }).eq('user_id', recvWallet.user_id);
          }
          // Notify receiver
          await sb.from('notifications').insert({
            user_id: recvWallet.user_id,
            title: 'Crypto Received',
            message: `You received ${amount} ${coin} from ${state.profile.username}`,
            type: 'success'
          });
        }

        // Refetch wallet
        const { data: newWallet } = await sb.from('wallets').select('*').eq('user_id', state.user.id).single();
        state.wallet = newWallet;

        // Self notification
        await sb.from('notifications').insert({
          user_id: state.user.id,
          title: 'Transfer Sent',
          message: `You sent ${amount} ${coin} to ${address.substring(0, 10)}...`,
          type: 'info'
        });
      }

      // Show success
      document.getElementById('sendFormView').classList.add('hidden');
      document.getElementById('sendSuccessView').classList.remove('hidden');
      document.getElementById('sendTxHash').textContent = txHash;
      document.getElementById('sendSuccessSub').textContent = `Sent ${amount} ${coin} successfully`;

      // Simulate confirmations
      this.simulateConfirmations(txHash);

      // Refresh
      Wallet.renderHomeBalance();
      Wallet.renderHomeHoldings();

    } catch (err) {
      UI.showToast('Transaction failed: ' + (err.message || 'Unknown error'), 'error');
    }

    btn.disabled = false;
    btn.textContent = 'Send';
  },

  async simulateConfirmations(txHash) {
    const confEl = document.getElementById('sendConfirmations');
    for (let i = 1; i <= 3; i++) {
      await new Promise(r => setTimeout(r, 1500));
      confEl.textContent = `${i}/3`;
      if (!state.isDemo && txHash) {
        await sb.from('transactions').update({
          confirmations: i,
          status: i === 3 ? 'completed' : 'confirming'
        }).eq('tx_hash', txHash);
      }
    }
    // Update badge in success view
    const badge = document.querySelector('#sendSuccessView .badge');
    if (badge) { badge.className = 'badge badge-completed'; badge.textContent = 'Completed'; }
  },

  filter(val) { this.filterText = val; this.renderList(); },
  setFilter(type, el) {
    this.filterType = type;
    document.querySelectorAll('#txFilters .filter-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    this.renderList();
  },

  showDetail(id, type) {
    let tx;
    if (type === 'withdrawal') {
      tx = state.withdrawals.find(w => w.id === id);
      if (!tx) return;
      document.getElementById('txDetailBody').innerHTML = `
        <div class="text-center mb-16">
          <div class="tx-icon withdrawal" style="width:56px;height:56px;margin:0 auto;display:flex;align-items:center;justify-content:center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div style="font-size:1.5rem;font-weight:800;margin-top:12px">-${formatCrypto(tx.crypto_amount, 4)} ${tx.coin}</div>
          <div class="text-muted fs-sm">${formatINR(tx.amount_inr)}</div>
        </div>
        <div class="card">
          <div class="flex justify-between mb-8"><span class="text-muted fs-sm">Type</span><span class="fw-600 fs-sm">Withdrawal</span></div>
          <div class="flex justify-between mb-8"><span class="text-muted fs-sm">Method</span><span class="fw-600 fs-sm">${tx.withdrawal_method === 'upi' ? 'UPI' : 'Bank Transfer'}</span></div>
          ${tx.withdrawal_method === 'upi' ? `<div class="flex justify-between mb-8"><span class="text-muted fs-sm">UPI ID</span><span class="fw-600 fs-sm">${tx.upi_id || '-'}</span></div>` : `
          <div class="flex justify-between mb-8"><span class="text-muted fs-sm">Bank</span><span class="fw-600 fs-sm">${tx.bank_name || '-'}</span></div>
          <div class="flex justify-between mb-8"><span class="text-muted fs-sm">Account</span><span class="fw-600 fs-sm">${tx.account_number || '-'}</span></div>
          <div class="flex justify-between mb-8"><span class="text-muted fs-sm">IFSC</span><span class="fw-600 fs-sm">${tx.ifsc_code || '-'}</span></div>`}
          <div class="flex justify-between mb-8"><span class="text-muted fs-sm">Status</span><span class="badge badge-${tx.status}">${tx.status}</span></div>
          <div class="flex justify-between mb-8"><span class="text-muted fs-sm">Date</span><span class="fs-sm">${new Date(tx.created_at).toLocaleString('en-IN')}</span></div>
          ${tx.estimated_arrival ? `<div class="flex justify-between"><span class="text-muted fs-sm">Est. Arrival</span><span class="fs-sm">${new Date(tx.estimated_arrival).toLocaleDateString('en-IN')}</span></div>` : ''}
        </div>`;
    } else {
      tx = state.transactions.find(t => t.id === id);
      if (!tx) return;
      const isSent = tx.sender_id === state.user.id;
      document.getElementById('txDetailBody').innerHTML = `
        <div class="text-center mb-16">
          <div class="tx-icon ${isSent ? 'sent' : 'received'}" style="width:56px;height:56px;margin:0 auto;display:flex;align-items:center;justify-content:center">
            ${isSent
              ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m18 15-6-6-6 6"/></svg>'
              : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>'}
          </div>
          <div style="font-size:1.5rem;font-weight:800;margin-top:12px">${isSent ? '-' : '+'}${formatCrypto(tx.amount, 4)} ${tx.coin}</div>
          <div class="text-muted fs-sm">${formatINR(tx.amount_inr)}</div>
        </div>
        <div class="card">
          <div class="flex justify-between mb-8"><span class="text-muted fs-sm">Type</span><span class="fw-600 fs-sm">${isSent ? 'Sent' : 'Received'}</span></div>
          <div class="flex justify-between mb-8"><span class="text-muted fs-sm">Coin</span><span class="fw-600 fs-sm">${tx.coin}</span></div>
          <div class="flex justify-between mb-8"><span class="text-muted fs-sm">Status</span><span class="badge badge-${tx.status}">${tx.status}</span></div>
          <div class="flex justify-between mb-8"><span class="text-muted fs-sm">Confirmations</span><span class="fw-600 fs-sm">${tx.confirmations}/3</span></div>
          <div class="flex justify-between mb-8"><span class="text-muted fs-sm">TX Hash</span><span class="fs-xs fw-600" style="font-family:monospace;max-width:180px;overflow:hidden;text-overflow:ellipsis">${tx.tx_hash || '-'}</span></div>
          <div class="flex justify-between"><span class="text-muted fs-sm">Date</span><span class="fs-sm">${new Date(tx.created_at).toLocaleString('en-IN')}</span></div>
        </div>`;
    }
    UI.openModal('txDetailModal');
  }
};

// ── Withdrawal Module ──
const Withdrawal = {
  selectedCoin: 'BTC',
  method: 'upi',

  initModal() {
    const container = document.getElementById('wdCoinSelector');
    container.innerHTML = COIN_KEYS.filter(k => k !== 'USDT').map(k => {
      return `<div class="coin-chip ${k === this.selectedCoin ? 'active' : ''}" onclick="Withdrawal.selectCoin('${k}')">
        <span class="coin-chip-dot" style="background:${COINS[k].color}">${COINS[k].letter}</span>
        ${k}
      </div>`;
    }).join('');
    this.updateAvailable();
  },

  selectCoin(symbol) {
    this.selectedCoin = symbol;
    document.querySelectorAll('#wdCoinSelector .coin-chip').forEach(c => c.classList.remove('active'));
    event.target.closest('.coin-chip').classList.add('active');
    this.updateAvailable();
    this.updatePreview();
  },

  setMethod(m) {
    this.method = m;
    document.getElementById('wdMethodUpi').classList.toggle('active', m === 'upi');
    document.getElementById('wdMethodBank').classList.toggle('active', m === 'bank');
    document.getElementById('wdUpiFields').classList.toggle('hidden', m !== 'upi');
    document.getElementById('wdBankFields').classList.toggle('hidden', m !== 'bank');
  },

  updateAvailable() {
    const bal = state.wallet ? state.wallet[this.selectedCoin.toLowerCase() + '_balance'] || 0 : 0;
    document.getElementById('wdAvailable').textContent = formatCrypto(bal, COINS[this.selectedCoin]?.decimals || 8) + ' ' + this.selectedCoin;
  },

  wdMax() {
    const bal = state.wallet ? state.wallet[this.selectedCoin.toLowerCase() + '_balance'] || 0 : 0;
    document.getElementById('wdAmount').value = bal;
    this.updatePreview();
  },

  updatePreview() {
    const amount = parseFloat(document.getElementById('wdAmount').value) || 0;
    const price = state.prices[this.selectedCoin] ? state.prices[this.selectedCoin].price : 0;
    document.getElementById('wdInrValue').textContent = formatINR(amount * price);
    document.getElementById('wdRate').textContent = formatINR(price) + ' per ' + this.selectedCoin;
  },

  async submit() {
    const amount = parseFloat(document.getElementById('wdAmount').value);
    const coin = this.selectedCoin;

    if (!amount || amount <= 0) { UI.showToast('Enter valid amount', 'error'); return; }

    const bal = state.wallet[coin.toLowerCase() + '_balance'] || 0;
    if (amount > bal) { UI.showToast('Insufficient balance', 'error'); return; }
    if (state.wallet.frozen) { UI.showToast('Account is frozen', 'error'); return; }

    if (this.method === 'upi') {
      const upiId = document.getElementById('wdUpiId').value.trim();
      if (!upiId || !upiId.includes('@')) { UI.showToast('Enter valid UPI ID', 'error'); return; }
    } else {
      const bank = document.getElementById('wdBankName').value.trim();
      const holder = document.getElementById('wdHolderName').value.trim();
      const accNum = document.getElementById('wdAccNumber').value.trim();
      const ifsc = document.getElementById('wdIfsc').value.trim();
      if (!bank || !holder || !accNum || !ifsc) { UI.showToast('Fill all bank details', 'error'); return; }
    }

    const btn = document.getElementById('wdBtn');
    btn.disabled = true;
    btn.textContent = 'Processing...';

    const price = state.prices[coin] ? state.prices[coin].price : 0;
    const amountInr = amount * price;
    const estArrival = new Date(Date.now() + 3 * 86400000);

    try {
      if (state.isDemo) {
        state.wallet[coin.toLowerCase() + '_balance'] -= amount;
      } else {
        // Deduct balance
        const col = coin.toLowerCase() + '_balance';
        await sb.from('wallets').update({ [col]: bal - amount }).eq('user_id', state.user.id);

        // Create withdrawal
        const wdData = {
          user_id: state.user.id,
          coin,
          crypto_amount: amount,
          amount_inr: amountInr,
          withdrawal_method: this.method,
          status: 'processing',
          processing_days_remaining: 3,
          estimated_arrival: estArrival.toISOString()
        };

        if (this.method === 'upi') {
          wdData.upi_id = document.getElementById('wdUpiId').value.trim();
        } else {
          wdData.bank_name = document.getElementById('wdBankName').value.trim();
          wdData.account_holder_name = document.getElementById('wdHolderName').value.trim();
          wdData.account_number = document.getElementById('wdAccNumber').value.trim();
          wdData.ifsc_code = document.getElementById('wdIfsc').value.trim();
        }

        await sb.from('withdrawals').insert(wdData);

        // Notification
        await sb.from('notifications').insert({
          user_id: state.user.id,
          title: 'Withdrawal Submitted',
          message: `Your withdrawal of ${formatINR(amountInr)} is being processed. ETA: 3 business days.`,
          type: 'info'
        });

        // Refetch
        const { data: newWallet } = await sb.from('wallets').select('*').eq('user_id', state.user.id).single();
        state.wallet = newWallet;
      }

      // Show success
      document.getElementById('wdFormView').classList.add('hidden');
      document.getElementById('wdSuccessView').classList.remove('hidden');
      document.getElementById('wdSuccessAmount').textContent = formatINR(amountInr);
      document.getElementById('wdSuccessMethod').textContent = this.method === 'upi' ? 'UPI' : 'Bank Transfer';

      // Animate progress
      let progress = 33;
      const progEl = document.getElementById('wdProgress');
      const interval = setInterval(() => {
        progress += 1;
        if (progress >= 66) { clearInterval(interval); return; }
        progEl.style.width = progress + '%';
      }, 100);

      // Refresh
      Wallet.renderHomeBalance();
      Wallet.renderHomeHoldings();

    } catch (err) {
      UI.showToast('Withdrawal failed: ' + (err.message || 'Unknown error'), 'error');
    }

    btn.disabled = false;
    btn.textContent = 'Submit Withdrawal';
  }
};

// ── Notification Module ──
const Notif = {
  async load() {
    if (state.isDemo) {
      state.notifications = [
        { id: 'n1', title: 'Welcome to CryptoVault', message: 'Start exploring your wallet. ', type: 'info', read_status: false, created_at: new Date().toISOString() }
      ];
      return;
    }

    const { data } = await sb.from('notifications').select('*').eq('user_id', state.user.id).order('created_at', { ascending: false }).limit(50);
    state.notifications = data || [];
  },

  render() {
    const container = document.getElementById('notifList');
    if (!state.notifications.length) {
      container.innerHTML = '<p class="text-muted fs-sm text-center" style="padding:30px 0">No notifications</p>';
      return;
    }

    container.innerHTML = state.notifications.map(n => `
      <div class="notif-item ${n.read_status ? '' : 'unread'}">
        <div class="notif-dot"></div>
        <div class="notif-content">
          <div class="notif-title">${n.title}</div>
          <div class="notif-msg">${n.message}</div>
          <div class="notif-time">${timeAgo(n.created_at)}</div>
        </div>
      </div>`).join('');

    // Mark as read
    this.markAllRead();
  },

  async markAllRead() {
    if (state.isDemo) {
      state.notifications.forEach(n => n.read_status = true);
      document.getElementById('notifBadge').classList.add('hidden');
      return;
    }
    const unread = state.notifications.filter(n => !n.read_status);
    if (unread.length) {
      await sb.from('notifications').update({ read_status: true }).in('id', unread.map(n => n.id));
      state.notifications.forEach(n => n.read_status = true);
      document.getElementById('notifBadge').classList.add('hidden');
    }
  },

  updateBadge() {
    const unread = state.notifications.filter(n => !n.read_status).length;
    const badge = document.getElementById('notifBadge');
    if (unread > 0) badge.classList.remove('hidden');
    else badge.classList.add('hidden');
  }
};

// ── Profile Module ──
const Profile = {
  render() {
    if (!state.profile) return;
    document.getElementById('profileAvatar').textContent = (state.profile.username || 'U')[0].toUpperCase();
    document.getElementById('profileName').textContent = state.profile.username || 'User';
    document.getElementById('profileEmail').textContent = state.profile.email || '';
    const addr = state.wallet ? state.wallet.wallet_address : '';
    document.getElementById('profileAddr').textContent = addr ? addr.substring(0, 12) + '...' + addr.substring(addr.length - 8) : '-';
    document.getElementById('referralCode').textContent = state.profile.referral_code || '--------';

    // Theme toggle
    const toggle = document.getElementById('themeToggle');
    toggle.classList.toggle('active', state.theme === 'dark');

    // 2FA
    const twoFaToggle = document.getElementById('twoFaToggle');
    twoFaToggle.classList.toggle('active', state.twoFa);
    document.getElementById('twoFaStatus').textContent = state.twoFa ? 'Enabled' : 'Disabled';
  },

  toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    localStorage.setItem('cv_theme', state.theme);
    document.getElementById('themeToggle').classList.toggle('active', state.theme === 'dark');
  },

  toggle2FA() {
    state.twoFa = !state.twoFa;
    localStorage.setItem('cv_2fa', state.twoFa);
    document.getElementById('twoFaToggle').classList.toggle('active', state.twoFa);
    document.getElementById('twoFaStatus').textContent = state.twoFa ? 'Enabled' : 'Disabled';
    UI.showToast(state.twoFa ? '2FA Enabled (simulated)' : '2FA Disabled', state.twoFa ? 'success' : 'info');
  },

  copyReferral() {
    const code = state.profile ? state.profile.referral_code : '';
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => UI.showToast('Referral code copied', 'success'));
  }
};

// ── App Initialization ──
const App = {
  chartInterval: null,
  priceInterval: null,

  async init() {
    // Apply theme
    document.documentElement.setAttribute('data-theme', state.theme);

    // Initialize Lucide icons
    if (window.lucide) lucide.createIcons();

    // Set greeting
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    document.getElementById('headerGreeting').textContent = greeting;
    document.getElementById('headerName').textContent = state.profile ? state.profile.username || 'User' : 'User';

    // Fetch prices
    await Market.fetchPrices();

    // Load data
    await Promise.all([
      Transaction.loadAll(),
      Notif.load(),
      this.loadWatchlist()
    ]);

    // Render everything
    Wallet.renderHomeBalance();
    Wallet.renderPortfolioChart();
    Wallet.renderHomeHoldings();
    Wallet.renderHomeTrending();
    Wallet.updateRewardUI();
    Transaction.renderHomeActivity();
    Transaction.renderList();
    Market.render();
    Notif.updateBadge();
    Profile.render();

    // Show FAB
    document.getElementById('fabBtn').style.display = 'flex';

    // Re-init Lucide
    if (window.lucide) lucide.createIcons();

    // GSAP entrance animations
    if (window.gsap) {
      gsap.from('.balance-card', { y: 20, opacity: 0, duration: 0.6, ease: 'power3.out' });
      gsap.from('.quick-actions .quick-action', { y: 15, opacity: 0, duration: 0.4, stagger: 0.08, delay: 0.2, ease: 'power3.out' });
    }

    // Refresh prices every 30s
    this.priceInterval = setInterval(async () => {
      await Market.fetchPrices();
      Wallet.renderHomeBalance();
      Wallet.renderHomeTrending();
      if (state.currentTab === 'markets') Market.render();
      if (state.currentTab === 'wallet') Wallet.renderWalletSection();
    }, 30000);

    // Refresh transactions every 15s
    this.chartInterval = setInterval(async () => {
      await Transaction.loadAll();
      Transaction.renderHomeActivity();
      if (state.currentTab === 'activity') Transaction.renderList();
      await Notif.load();
      Notif.updateBadge();
    }, 15000);

    // Setup Supabase realtime
    if (!state.isDemo && sb) {
      sb.channel('wallet-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `sender_id=eq.${state.user.id}` }, () => {
          Transaction.loadAll().then(() => {
            Transaction.renderHomeActivity();
            if (state.currentTab === 'activity') Transaction.renderList();
          });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${state.user.id}` }, () => {
          Notif.load().then(() => Notif.updateBadge());
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'wallets', filter: `user_id=eq.${state.user.id}` }, (payload) => {
          if (payload.new) {
            state.wallet = payload.new;
            Wallet.renderHomeBalance();
            Wallet.renderHomeHoldings();
            Wallet.renderWalletSection();
          }
        })
        .subscribe();
    }
  },

  async loadWatchlist() {
    if (state.isDemo) { state.watchlist = []; return; }
    const { data } = await sb.from('watchlist').select('symbol').eq('user_id', state.user.id);
    state.watchlist = data ? data.map(d => d.symbol) : [];
  }
};

// ── Start ──
document.addEventListener('DOMContentLoaded', () => {
  Auth.init();
});
