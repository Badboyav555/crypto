/* ============================================
   CRYPTO VAULT - ADMIN PANEL
   ============================================ */

const SUPABASE_URL = 'SUPABASE_URL';
const SUPABASE_ANON_KEY = 'SUPABASE_ANON_KEY';

let sb;
try {
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (e) {
  console.warn('Supabase not configured. Admin running in demo mode.');
  sb = null;
}

const isDemo = !sb;

// ── Demo Admin Data ──
const DEMO_USERS = [
  { id: 'demo-001', username: 'DemoUser', email: 'demo@cryptovault.app', role: 'user', created_at: '2025-01-15T10:00:00Z' },
  { id: 'demo-002', username: 'Alice', email: 'alice@test.com', role: 'user', created_at: '2025-01-20T14:30:00Z' },
  { id: 'demo-003', username: 'Bob', email: 'bob@test.com', role: 'user', created_at: '2025-02-01T09:15:00Z' },
  { id: 'demo-004', username: 'Charlie', email: 'charlie@test.com', role: 'user', created_at: '2025-02-10T16:45:00Z' },
  { id: 'demo-005', username: 'Diana', email: 'diana@test.com', role: 'user', created_at: '2025-02-18T11:20:00Z' }
];

const DEMO_WALLETS = {
  'demo-001': { btc_balance: 0.015, eth_balance: 0.25, sol_balance: 2.5, xrp_balance: 100, doge_balance: 500, bnb_balance: 0.1, usdt_balance: 50, inr_balance: 5000, wallet_address: '0x7a3b...6a7b', frozen: false },
  'demo-002': { btc_balance: 0.05, eth_balance: 1.2, sol_balance: 10, xrp_balance: 500, doge_balance: 2000, bnb_balance: 0.5, usdt_balance: 200, inr_balance: 25000, wallet_address: '0x1a2b...3c4d', frozen: false },
  'demo-003': { btc_balance: 0.001, eth_balance: 0.02, sol_balance: 0.5, xrp_balance: 50, doge_balance: 100, bnb_balance: 0, usdt_balance: 10, inr_balance: 500, wallet_address: '0x5e6f...7g8h', frozen: false },
  'demo-004': { btc_balance: 0.5, eth_balance: 5, sol_balance: 50, xrp_balance: 5000, doge_balance: 10000, bnb_balance: 3, usdt_balance: 1000, inr_balance: 100000, wallet_address: '0x9i0j...1k2l', frozen: false },
  'demo-005': { btc_balance: 0, eth_balance: 0, sol_balance: 0, xrp_balance: 0, doge_balance: 0, bnb_balance: 0, usdt_balance: 0, inr_balance: 0, wallet_address: '0xm3n4...5o6p', frozen: false }
};

const DEMO_WITHDRAWALS = [
  { id: 'wd1', user_id: 'demo-002', coin: 'ETH', crypto_amount: 0.1, amount_inr: 24500, withdrawal_method: 'upi', upi_id: 'alice@upi', status: 'processing', created_at: '2025-02-20T10:00:00Z' },
  { id: 'wd2', user_id: 'demo-004', coin: 'BTC', crypto_amount: 0.01, amount_inr: 82500, withdrawal_method: 'bank', bank_name: 'HDFC', account_holder_name: 'Charlie', account_number: '1234567890', ifsc_code: 'HDFC0001234', status: 'processing', created_at: '2025-02-21T14:00:00Z' }
];

const DEMO_TRANSACTIONS = [
  { id: 'tx1', sender_id: 'demo-002', receiver_id: 'demo-001', coin: 'ETH', amount: 0.05, amount_inr: 12250, tx_hash: '0xa1b2c3d4e5f6...7890', status: 'completed', confirmations: 3, created_at: '2025-02-19T09:00:00Z' },
  { id: 'tx2', sender_id: 'demo-004', receiver_id: null, coin: 'BTC', amount: 0.005, amount_inr: 41250, tx_hash: '0xf1e2d3c4b5a6...1234', status: 'completed', confirmations: 3, created_at: '2025-02-20T11:00:00Z' },
  { id: 'tx3', sender_id: 'demo-001', receiver_id: 'demo-003', coin: 'SOL', amount: 0.5, amount_inr: 9100, tx_hash: '0x1234abcd5678...ef90', status: 'confirming', confirmations: 1, created_at: '2025-02-21T15:00:00Z' }
];

// ── State ──
let adminState = {
  users: [],
  wallets: {},
  withdrawals: [],
  transactions: [],
  balanceAction: 'set'
};

// ── Utility ──
function formatINR(num) {
  if (num === null || num === undefined || isNaN(num)) return '₹0.00';
  const n = parseFloat(num);
  if (n >= 10000000) return '₹' + (n / 10000000).toFixed(2) + ' Cr';
  if (n >= 100000) return '₹' + (n / 100000).toFixed(2) + ' L';
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatCrypto(num, dec) {
  if (!num) return '0';
  return parseFloat(num).toFixed(dec || 8).replace(/\.?0+$/, '') || '0';
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

function adminToast(msg, type) {
  const t = document.getElementById('adminToast');
  const icon = document.getElementById('adminToastIcon');
  const msgEl = document.getElementById('adminToastMsg');
  t.style.borderLeft = `3px solid ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'}`;
  icon.innerHTML = type === 'success' ? '&#10003;' : type === 'error' ? '&#10007;' : '&#9432;';
  icon.style.color = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6';
  msgEl.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

const COINS_ADMIN = {
  BTC: { price: 8250000 }, ETH: { price: 245000 }, SOL: { price: 18200 },
  XRP: { price: 48.5 }, DOGE: { price: 22.3 }, BNB: { price: 72000 }, USDT: { price: 83.5 }
};

function walletToINR(w) {
  if (!w) return 0;
  let total = w.inr_balance || 0;
  for (const [k, v] of Object.entries(COINS_ADMIN)) {
    const col = k.toLowerCase() + '_balance';
    total += (w[col] || 0) * v.price;
  }
  return total;
}

// ── Admin Auth ──
const AdminAuth = {
  async init() {
    document.getElementById('adminAuthForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('adminEmail').value.trim();
      const password = document.getElementById('adminPassword').value;
      const errEl = document.getElementById('adminAuthError');
      const btn = document.getElementById('adminAuthBtn');
      errEl.style.display = 'none';
      btn.disabled = true;
      btn.textContent = 'Signing in...';

      try {
        if (isDemo) {
          // Demo: accept any login
          if (!email || !password) throw new Error('Enter email and password');
          AdminAuth.onLogin({ email });
          return;
        }

        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // Check admin role
        const { data: profile } = await sb.from('profiles').select('role').eq('id', data.user.id).single();
        if (!profile || profile.role !== 'admin') {
          await sb.auth.signOut();
          throw new Error('Access denied. Admin role required.');
        }

        AdminAuth.onLogin({ email: data.user.email });
      } catch (err) {
        errEl.textContent = err.message || 'Authentication failed';
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Sign In';
      }
    });

    // Check existing session
    if (!isDemo) {
      const { data: { session } } = await sb.auth.getSession();
      if (session) {
        const { data: profile } = await sb.from('profiles').select('role').eq('id', session.user.id).single();
        if (profile && profile.role === 'admin') {
          AdminAuth.onLogin({ email: session.user.email });
          return;
        }
        await sb.auth.signOut();
      }
    }
  },

  onLogin(user) {
    document.getElementById('adminAuth').classList.add('hidden');
    document.getElementById('adminMain').classList.remove('hidden');
    document.getElementById('adminUserEmail').textContent = user.email;
    AdminDashboard.init();
  },

  async signOut() {
    if (!isDemo) await sb.auth.signOut();
    document.getElementById('adminMain').classList.add('hidden');
    document.getElementById('adminAuth').classList.remove('hidden');
    document.getElementById('adminAuthBtn').disabled = false;
    document.getElementById('adminAuthBtn').textContent = 'Sign In';
  }
};

// ── Admin UI ──
const AdminUI = {
  switchSection(section) {
    document.querySelectorAll('.admin-section').forEach(s => s.classList.add('hidden'));
    document.getElementById('sec-' + section).classList.remove('hidden');
    document.querySelectorAll('.admin-nav-item').forEach(n => {
      n.classList.toggle('active', n.dataset.section === section);
    });
    const titles = { dashboard: 'Dashboard', users: 'User Management', withdrawals: 'Withdrawals', transactions: 'Transactions', announcements: 'Announcements' };
    document.getElementById('adminPageTitle').textContent = titles[section] || section;

    // Load data for section
    if (section === 'users') AdminUsers.load();
    if (section === 'withdrawals') AdminWithdrawals.load();
    if (section === 'transactions') AdminTx.load();

    // Close mobile sidebar
    document.getElementById('adminSidebar').classList.remove('open');
    document.getElementById('adminOverlay').classList.remove('active');
  },

  toggleSidebar() {
    document.getElementById('adminSidebar').classList.toggle('open');
    document.getElementById('adminOverlay').classList.toggle('active');
  }
};

// ── Dashboard ──
const AdminDashboard = {
  charts: {},

  async init() {
    await this.loadData();
    this.renderStats();
    this.renderCharts();
    this.renderRecentUsers();
  },

  async loadData() {
    if (isDemo) {
      adminState.users = [...DEMO_USERS];
      adminState.wallets = { ...DEMO_WALLETS };
      adminState.withdrawals = [...DEMO_WITHDRAWALS];
      adminState.transactions = [...DEMO_TRANSACTIONS];
      return;
    }

    const [usersRes, walletsRes, wdRes, txRes] = await Promise.all([
      sb.from('profiles').select('*').order('created_at', { ascending: false }),
      sb.from('wallets').select('*'),
      sb.from('withdrawals').select('*').order('created_at', { ascending: false }),
      sb.from('transactions').select('*').order('created_at', { ascending: false })
    ]);

    adminState.users = usersRes.data || [];
    adminState.wallets = {};
    (walletsRes.data || []).forEach(w => { adminState.wallets[w.user_id] = w; });
    adminState.withdrawals = wdRes.data || [];
    adminState.transactions = txRes.data || [];
  },

  renderStats() {
    const totalUsers = adminState.users.length;
    const activeUsers = adminState.users.filter(u => {
      const w = adminState.wallets[u.id];
      return w && walletToINR(w) > 0;
    }).length;
    const totalTx = adminState.transactions.length;
    const totalWd = adminState.withdrawals.length;
    const processingWd = adminState.withdrawals.filter(w => w.status === 'processing').length;

    let totalVolume = 0;
    adminState.transactions.forEach(t => { totalVolume += t.amount_inr || 0; });
    adminState.withdrawals.forEach(w => { totalVolume += w.amount_inr || 0; });

    const stats = [
      { label: 'Total Users', value: totalUsers, change: '+12%', up: true, icon: 'users' },
      { label: 'Active Users', value: activeUsers, change: '+8%', up: true, icon: 'active' },
      { label: 'Total Transactions', value: totalTx, change: '+23%', up: true, icon: 'tx' },
      { label: 'Processing Withdrawals', value: processingWd, change: totalWd > 0 ? (processingWd / totalWd * 100).toFixed(0) + '%' : '0%', up: false, icon: 'wd' },
      { label: 'Total Volume (INR)', value: formatINR(totalVolume), change: '+15%', up: true, icon: 'vol' },
      { label: 'Total Withdrawals', value: totalWd, change: '+5%', up: true, icon: 'totalwd' }
    ];

    document.getElementById('adminStats').innerHTML = stats.map(s => `
      <div class="admin-stat-card">
        <div class="admin-stat-label">${s.label}</div>
        <div class="admin-stat-value">${s.value}</div>
        <div class="admin-stat-change ${s.up ? 'up' : 'down'}">${s.change} from last month</div>
      </div>`).join('');
  },

  renderCharts() {
    // User Growth Chart
    const userCtx = document.getElementById('adminUserChart');
    if (this.charts.user) this.charts.user.destroy();
    this.charts.user = new Chart(userCtx, {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
        datasets: [{
          label: 'Users',
          data: [10, 18, 32, 45, 58, 72, adminState.users.length || 85],
          borderColor: '#818cf8',
          backgroundColor: 'rgba(129,140,248,0.1)',
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: '#818cf8'
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#565b72', font: { size: 11 } }, grid: { color: '#1e1f2e' } },
          y: { ticks: { color: '#565b72', font: { size: 11 } }, grid: { color: '#1e1f2e' } }
        }
      }
    });

    // TX Volume Chart
    const txCtx = document.getElementById('adminTxChart');
    if (this.charts.tx) this.charts.tx.destroy();
    this.charts.tx = new Chart(txCtx, {
      type: 'bar',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
        datasets: [{
          label: 'Volume',
          data: [120000, 250000, 380000, 520000, 710000, 890000, 1050000],
          backgroundColor: 'rgba(59,130,246,0.6)',
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#565b72', font: { size: 11 } }, grid: { display: false } },
          y: { ticks: { color: '#565b72', font: { size: 11 }, callback: v => '₹' + (v / 100000).toFixed(0) + 'L' }, grid: { color: '#1e1f2e' } }
        }
      }
    });
  },

  renderRecentUsers() {
    const tbody = document.querySelector('#dashboardUsersTable tbody');
    const recent = adminState.users.slice(0, 5);
    tbody.innerHTML = recent.map(u => {
      const w = adminState.wallets[u.id];
      return `<tr>
        <td style="font-weight:600;color:#f1f2f6">${u.username || '-'}</td>
        <td>${u.email || '-'}</td>
        <td style="font-weight:600;color:#c8cbd5">${w ? formatINR(walletToINR(w)) : '₹0'}</td>
        <td>${u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN') : '-'}</td>
      </tr>`;
    }).join('');
  }
};

// ── Admin Users ──
const AdminUsers = {
  filterText: '',

  async load() {
    if (isDemo) {
      adminState.users = [...DEMO_USERS];
      adminState.wallets = { ...DEMO_WALLETS };
    } else {
      const [usersRes, walletsRes] = await Promise.all([
        sb.from('profiles').select('*').order('created_at', { ascending: false }),
        sb.from('wallets').select('*')
      ]);
      adminState.users = usersRes.data || [];
      adminState.wallets = {};
      (walletsRes.data || []).forEach(w => { adminState.wallets[w.user_id] = w; });
    }
    this.render();
  },

  render() {
    const tbody = document.querySelector('#usersTable tbody');
    let users = adminState.users;
    if (this.filterText) {
      const q = this.filterText.toLowerCase();
      users = users.filter(u => (u.username || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q));
    }

    tbody.innerHTML = users.map(u => {
      const w = adminState.wallets[u.id];
      const bal = w ? walletToINR(w) : 0;
      const frozen = w ? w.frozen : false;
      const statusBadge = frozen
        ? '<span class="badge badge-rejected">Frozen</span>'
        : '<span class="badge badge-completed">Active</span>';
      const holdSummary = w
        ? Object.entries(COINS_ADMIN).map(([k]) => {
            const b = w[k.toLowerCase() + '_balance'] || 0;
            return b > 0 ? `${formatCrypto(b, k === 'BTC' || k === 'ETH' ? 6 : 2)} ${k}` : null;
          }).filter(Boolean).join(', ') || 'None'
        : 'No wallet';

      return `<tr>
        <td style="font-weight:600;color:#f1f2f6">${u.username || '-'}</td>
        <td style="color:#8b8fa3">${u.email || '-'}</td>
        <td style="font-family:monospace;font-size:0.75rem;color:#565b72">${w ? w.wallet_address.substring(0, 10) + '...' : '-'}</td>
        <td>
          <div style="font-weight:600;color:#c8cbd5">${formatINR(bal)}</div>
          <div style="font-size:0.6875rem;color:#565b72;margin-top:2px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${holdSummary}</div>
        </td>
        <td>${statusBadge}</td>
        <td>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="admin-btn admin-btn-edit" onclick="AdminUsers.openEditBalance('${u.id}','${u.username || u.email}')">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
              Edit
            </button>
            <button class="admin-btn admin-btn-freeze" onclick="AdminUsers.toggleFreeze('${u.id}')">
              ${frozen ? 'Unfreeze' : 'Freeze'}
            </button>
          </div>
        </td>
      </tr>`;
    }).join('');

    if (!users.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#565b72;padding:40px">No users found</td></tr>';
    }
  },

  filter(val) { this.filterText = val; this.render(); },

  openEditBalance(userId, userName) {
    document.getElementById('editBalUserId').value = userId;
    document.getElementById('editBalUser').textContent = userName;
    document.getElementById('editBalAmount').value = '';
    adminState.balanceAction = 'set';
    this.setBalanceAction('set');
    document.getElementById('editBalanceModal').classList.add('active');
  },

  setBalanceAction(action) {
    adminState.balanceAction = action;
    const setBtn = document.getElementById('editBalSetBtn');
    const addBtn = document.getElementById('editBalAddBtn');
    if (action === 'set') {
      setBtn.style.background = '#3b82f6';
      setBtn.style.color = '#fff';
      setBtn.style.border = 'none';
      addBtn.style.background = '#181923';
      addBtn.style.color = '#8b8fa3';
      addBtn.style.border = '1px solid #252736';
    } else {
      addBtn.style.background = '#3b82f6';
      addBtn.style.color = '#fff';
      addBtn.style.border = 'none';
      setBtn.style.background = '#181923';
      setBtn.style.color = '#8b8fa3';
      setBtn.style.border = '1px solid #252736';
    }
  },

  async saveBalance() {
    const userId = document.getElementById('editBalUserId').value;
    const coin = document.getElementById('editBalCoin').value;
    const amount = parseFloat(document.getElementById('editBalAmount').value);

    if (isNaN(amount) || amount < 0) { adminToast('Enter valid amount', 'error'); return; }

    try {
      if (isDemo) {
        const w = adminState.wallets[userId];
        if (w) {
          w[coin] = adminState.balanceAction === 'set' ? amount : (w[coin] || 0) + amount;
        }
      } else {
        if (adminState.balanceAction === 'set') {
          await sb.from('wallets').update({ [coin]: amount }).eq('user_id', userId);
        } else {
          // Use raw SQL for atomic add
          await sb.rpc('add_to_balance', { p_user_id: userId, p_column: coin, p_amount: amount }).catch(async () => {
            const { data: w } = await sb.from('wallets').select(coin).eq('user_id', userId).single();
            if (w) await sb.from('wallets').update({ [coin]: (w[coin] || 0) + amount }).eq('user_id', userId);
          });
        }

        // Notification
        const coinLabel = coin.replace('_balance', '').toUpperCase();
        const actionLabel = adminState.balanceAction === 'set' ? 'set to' : 'credited with';
        await sb.from('notifications').insert({
          user_id: userId,
          title: 'Balance Updated',
          message: `Your ${coinLabel} balance has been ${actionLabel} ${amount} by admin.`,
          type: 'info'
        });

        // Refetch
        const { data: w } = await sb.from('wallets').select('*').eq('user_id', userId).single();
        if (w) adminState.wallets[userId] = w;
      }

      adminToast('Balance updated successfully', 'success');
      document.getElementById('editBalanceModal').classList.remove('active');
      this.render();
      AdminDashboard.renderStats();
    } catch (err) {
      adminToast('Failed: ' + (err.message || 'Unknown error'), 'error');
    }
  },

  async toggleFreeze(userId) {
    const w = adminState.wallets[userId];
    if (!w) return;
    const newFrozen = !w.frozen;

    try {
      if (isDemo) {
        w.frozen = newFrozen;
      } else {
        await sb.from('wallets').update({ frozen: newFrozen }).eq('user_id', userId);
        const { data } = await sb.from('wallets').select('*').eq('user_id', userId).single();
        if (data) adminState.wallets[userId] = data;

        await sb.from('notifications').insert({
          user_id: userId,
          title: newFrozen ? 'Account Frozen' : 'Account Unfrozen',
          message: newFrozen ? 'Your account has been frozen by admin. Contact support for help.' : 'Your account has been unfrozen. You can now use all features.',
          type: newFrozen ? 'error' : 'success'
        });
      }

      adminToast(newFrozen ? 'Account frozen' : 'Account unfrozen', newFrozen ? 'error' : 'success');
      this.render();
    } catch (err) {
      adminToast('Failed: ' + (err.message || 'Unknown error'), 'error');
    }
  }
};

// ── Admin Withdrawals ──
const AdminWithdrawals = {
  filterType: 'all',

  async load() {
    if (isDemo) {
      adminState.withdrawals = [...DEMO_WITHDRAWALS];
    } else {
      const { data } = await sb.from('withdrawals').select('*').order('created_at', { ascending: false });
      adminState.withdrawals = data || [];
    }
    this.render();
  },

  render() {
    const tbody = document.querySelector('#withdrawalsTable tbody');
    let items = adminState.withdrawals;
    if (this.filterType !== 'all') items = items.filter(w => w.status === this.filterType);

    tbody.innerHTML = items.map(w => {
      const user = adminState.users.find(u => u.id === w.user_id);
      const userName = user ? user.username || user.email : 'Unknown';
      const method = w.withdrawal_method === 'upi' ? `UPI: ${w.upi_id || '-'}` : `Bank: ${w.bank_name || '-'}`;
      const statusClass = `badge-${w.status}`;

      return `<tr>
        <td style="font-weight:600;color:#f1f2f6">${userName}</td>
        <td>${w.coin}</td>
        <td style="font-weight:600;color:#c8cbd5">${formatCrypto(w.crypto_amount, 6)}</td>
        <td style="font-weight:600;color:#c8cbd5">${formatINR(w.amount_inr)}</td>
        <td style="font-size:0.75rem;color:#8b8fa3">${method}</td>
        <td><span class="badge ${statusClass}">${w.status}</span></td>
        <td style="color:#8b8fa3;font-size:0.8125rem">${w.created_at ? new Date(w.created_at).toLocaleDateString('en-IN') : '-'}</td>
        <td>
          ${w.status === 'processing' ? `
            <div style="display:flex;gap:6px">
              <button class="admin-btn admin-btn-approve" onclick="AdminWithdrawals.approve('${w.id}')">Approve</button>
              <button class="admin-btn admin-btn-reject" onclick="AdminWithdrawals.reject('${w.id}')">Reject</button>
            </div>` : '<span style="color:#565b72;font-size:0.75rem">-</span>'}
        </td>
      </tr>`;
    }).join('');

    if (!items.length) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#565b72;padding:40px">No withdrawals found</td></tr>';
    }
  },

  setFilter(type, el) {
    this.filterType = type;
    el.parentElement.querySelectorAll('span').forEach(s => {
      s.style.background = '#181923';
      s.style.color = '#8b8fa3';
      s.style.borderColor = '#252736';
    });
    el.style.background = '#3b82f6';
    el.style.color = '#fff';
    el.style.borderColor = '#3b82f6';
    this.render();
  },

  async approve(id) {
    try {
      if (isDemo) {
        const wd = adminState.withdrawals.find(w => w.id === id);
        if (wd) wd.status = 'completed';
      } else {
        await sb.from('withdrawals').update({
          status: 'completed',
          completed_at: new Date().toISOString()
        }).eq('id', id);

        const wd = adminState.withdrawals.find(w => w.id === id);
        if (wd) {
          await sb.from('notifications').insert({
            user_id: wd.user_id,
            title: 'Withdrawal Completed',
            message: `Your withdrawal of ${formatINR(wd.amount_inr)} has been processed and funds have been delivered.`,
            type: 'success'
          });
        }

        const { data } = await sb.from('withdrawals').select('*').order('created_at', { ascending: false });
        adminState.withdrawals = data || [];
      }

      adminToast('Withdrawal approved and completed', 'success');
      this.render();
      AdminDashboard.renderStats();
    } catch (err) {
      adminToast('Failed: ' + (err.message || 'Unknown error'), 'error');
    }
  },

  async reject(id) {
    try {
      if (isDemo) {
        const wd = adminState.withdrawals.find(w => w.id === id);
        if (wd) {
          wd.status = 'rejected';
          // Refund crypto
          const w = adminState.wallets[wd.user_id];
          if (w) {
            const col = wd.coin.toLowerCase() + '_balance';
            w[col] = (w[col] || 0) + wd.crypto_amount;
          }
        }
      } else {
        const wd = adminState.withdrawals.find(w => w.id === id);
        if (wd) {
          // Refund
          const col = wd.coin.toLowerCase() + '_balance';
          const { data: wallet } = await sb.from('wallets').select(col).eq('user_id', wd.user_id).single();
          if (wallet) {
            await sb.from('wallets').update({ [col]: (wallet[col] || 0) + wd.crypto_amount }).eq('user_id', wd.user_id);
          }

          await sb.from('withdrawals').update({ status: 'rejected' }).eq('id', id);

          await sb.from('notifications').insert({
            user_id: wd.user_id,
            title: 'Withdrawal Rejected',
            message: `Your withdrawal of ${formatINR(wd.amount_inr)} has been rejected. The crypto has been refunded to your wallet.`,
            type: 'error'
          });
        }

        const { data } = await sb.from('withdrawals').select('*').order('created_at', { ascending: false });
        adminState.withdrawals = data || [];
      }

      adminToast('Withdrawal rejected. Crypto refunded.', 'error');
      this.render();
      AdminDashboard.renderStats();
    } catch (err) {
      adminToast('Failed: ' + (err.message || 'Unknown error'), 'error');
    }
  }
};

// ── Admin Transactions ──
const AdminTx = {
  filterText: '',

  async load() {
    if (isDemo) {
      adminState.transactions = [...DEMO_TRANSACTIONS];
    } else {
      const { data } = await sb.from('transactions').select('*').order('created_at', { ascending: false });
      adminState.transactions = data || [];
    }
    this.render();
  },

  render() {
    const tbody = document.querySelector('#txTable tbody');
    let items = adminState.transactions;
    if (this.filterText) {
      const q = this.filterText.toLowerCase();
      items = items.filter(t => (t.tx_hash || '').toLowerCase().includes(q) || (t.coin || '').toLowerCase().includes(q));
    }

    tbody.innerHTML = items.map(t => {
      const sender = adminState.users.find(u => u.id === t.sender_id);
      const receiver = adminState.users.find(u => u.id === t.receiver_id);
      const senderName = sender ? sender.username || sender.email : (t.sender_id ? 'External' : '-');
      const receiverName = receiver ? receiver.username || receiver.email : (t.receiver_id ? 'External' : '-');
      const statusClass = `badge-${t.status}`;
      const hashShort = t.tx_hash ? t.tx_hash.substring(0, 12) + '...' : '-';

      return `<tr>
        <td style="font-family:monospace;font-size:0.75rem;color:#818cf8">${hashShort}</td>
        <td style="color:#c8cbd5">${senderName}</td>
        <td style="color:#c8cbd5">${receiverName}</td>
        <td style="font-weight:600;color:#f1f2f6">${t.coin}</td>
        <td style="font-weight:600;color:#c8cbd5">${formatCrypto(t.amount, 6)}</td>
        <td style="color:#c8cbd5">${formatINR(t.amount_inr)}</td>
        <td><span class="badge ${statusClass}">${t.status}</span></td>
        <td style="color:#8b8fa3;font-size:0.8125rem">${t.created_at ? new Date(t.created_at).toLocaleDateString('en-IN') : '-'}</td>
      </tr>`;
    }).join('');

    if (!items.length) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#565b72;padding:40px">No transactions found</td></tr>';
    }
  },

  filter(val) { this.filterText = val; this.render(); }
};

// ── Admin Announcements ──
const AdminAnnouncements = {
  async send() {
    const title = document.getElementById('annTitle').value.trim();
    const message = document.getElementById('annMessage').value.trim();
    const type = document.getElementById('annType').value;

    if (!title || !message) { adminToast('Fill in title and message', 'error'); return; }

    try {
      if (isDemo) {
        adminToast('Announcement sent to all users (demo)', 'success');
      } else {
        const notifications = adminState.users.map(u => ({
          user_id: u.id,
          title, message, type
        }));

        // Send in batches of 100
        for (let i = 0; i < notifications.length; i += 100) {
          await sb.from('notifications').insert(notifications.slice(i, i + 100));
        }

        adminToast(`Announcement sent to ${adminState.users.length} users`, 'success');
      }

      document.getElementById('annTitle').value = '';
      document.getElementById('annMessage').value = '';
    } catch (err) {
      adminToast('Failed: ' + (err.message || 'Unknown error'), 'error');
    }
  },

  async sendToUser() {
    const email = document.getElementById('annUserEmail').value.trim();
    const title = document.getElementById('annUserTitle').value.trim();
    const message = document.getElementById('annUserMessage').value.trim();

    if (!email || !title || !message) { adminToast('Fill in all fields', 'error'); return; }

    try {
      if (isDemo) {
        adminToast('Notification sent (demo)', 'success');
      } else {
        const { data: user } = await sb.from('profiles').select('id').eq('email', email).single();
        if (!user) { adminToast('User not found', 'error'); return; }

        await sb.from('notifications').insert({
          user_id: user.id,
          title, message, type: 'info'
        });

        adminToast('Notification sent successfully', 'success');
      }

      document.getElementById('annUserEmail').value = '';
      document.getElementById('annUserTitle').value = '';
      document.getElementById('annUserMessage').value = '';
    } catch (err) {
      adminToast('Failed: ' + (err.message || 'Unknown error'), 'error');
    }
  }
};

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  AdminAuth.init();
});
