import { authStatus, saveConfig, logout } from './api.js';

// ── Navigation config ─────────────────────────────────────────
const NAV_ITEMS = [
  {
    id: 'asset-categories',
    label: 'Asset Categories',
    children: [
      { label: 'Import', route: 'categories/import', icon: '↑' },
      { label: 'Export', route: 'categories/export', icon: '↓' },
    ],
  },
  {
    id: 'info',
    label: 'Info',
    children: [
      { label: 'Tutorial', route: 'help', icon: '?' },
      { label: 'About', route: 'about', icon: 'i' },
    ],
  },
];

// ── Shared state ──────────────────────────────────────────────
let _state = {
  authenticated: false,
  hasConfig: false,
  tokenExpiry: null,
};

export function getState() { return { ..._state }; }

export function setState(updates) {
  _state = { ..._state, ...updates };
  renderTopbar();
  renderNav();
}

// ── Toast system ──────────────────────────────────────────────
const TOAST_ICONS = { info: 'ℹ', success: '✓', warning: '⚠', error: '✗' };

export function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${TOAST_ICONS[type] || 'ℹ'}</span>
    <span class="toast-body">${escHtml(message)}</span>
    <span class="toast-close" title="Dismiss">&times;</span>
  `;

  const close = () => {
    toast.style.transition = 'opacity 0.2s';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 200);
  };

  toast.querySelector('.toast-close').addEventListener('click', close);
  container.appendChild(toast);
  if (duration > 0) setTimeout(close, duration);
}

// ── Helpers ───────────────────────────────────────────────────
function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function currentRoute() {
  return (location.hash || '').replace(/^#/, '').replace(/^\//, '') || '';
}

function navigate(route) {
  location.hash = '#' + route;
}

// ── Topbar rendering ──────────────────────────────────────────
function renderTopbar() {
  const left = document.getElementById('topbar-left');
  const authDiv = document.getElementById('auth-status');

  let pageTitle = 'Forma Asset Manager';
  const route = currentRoute();
  for (const group of NAV_ITEMS) {
    for (const child of group.children || []) {
      if (child.route === route) { pageTitle = `${group.label} — ${child.label}`; break; }
    }
  }
  left.textContent = pageTitle;

  if (!_state.hasConfig) {
    authDiv.innerHTML = `<span class="auth-chip unconfigured"><span class="status-dot gray"></span>Not Configured</span>`;
  } else if (_state.authenticated) {
    const expiry = _state.tokenExpiry ? new Date(_state.tokenExpiry).toLocaleTimeString() : '';
    authDiv.innerHTML = `
      <span class="auth-chip authenticated"><span class="status-dot green"></span>Authenticated${expiry ? ' · expires ' + expiry : ''}</span>
      <button class="topbar-btn" id="logout-btn">Sign out</button>
    `;
    document.getElementById('logout-btn')?.addEventListener('click', async () => {
      await logout();
      _state = { authenticated: false, hasConfig: false, tokenExpiry: null };
      renderTopbar();
      renderNav();
      routeTo('');
    });
  } else {
    authDiv.innerHTML = `
      <span class="auth-chip unauthenticated"><span class="status-dot red"></span>Not Authenticated</span>
      <a href="/auth/login" class="btn btn-primary btn-sm">Authenticate</a>
    `;
  }
}

// ── Nav rendering ─────────────────────────────────────────────
function renderNav() {
  const nav = document.getElementById('nav');
  const route = currentRoute();

  nav.innerHTML = NAV_ITEMS.map(group => `
    <div class="nav-group">
      <span class="nav-group-label">${escHtml(group.label)}</span>
      ${(group.children || []).map(child => `
        <div class="nav-item${child.route === route ? ' active' : ''}" data-route="${escHtml(child.route)}">
          <span class="nav-icon">${child.icon || '·'}</span>
          ${escHtml(child.label)}
        </div>
      `).join('')}
    </div>
  `).join('');

  nav.querySelectorAll('.nav-item[data-route]').forEach(el => {
    el.addEventListener('click', () => navigate(el.dataset.route));
  });
}

// ── Page routing ──────────────────────────────────────────────
async function routeTo(route) {
  const content = document.getElementById('content');

  // Not configured → show setup
  if (!_state.hasConfig) {
    renderTopbar();
    renderNav();
    renderSetupPage(content);
    return;
  }

  // Configured but not authenticated → show auth prompt
  if (!_state.authenticated) {
    renderTopbar();
    renderNav();
    renderAuthPage(content);
    return;
  }

  renderTopbar();
  renderNav();

  if (!route || route === '') {
    navigate('categories/import');
    return;
  }

  // Show loading
  content.innerHTML = `<div class="loading-screen"><div class="spinner"></div></div>`;

  try {
    if (route === 'categories/import') {
      const { render } = await import('./pages/categories-import.js');
      content.innerHTML = '';
      render(content);
    } else if (route === 'categories/export') {
      const { render } = await import('./pages/categories-export.js');
      content.innerHTML = '';
      render(content);
    } else if (route === 'help') {
      const { render } = await import('./pages/help.js');
      content.innerHTML = '';
      render(content);
    } else if (route === 'about') {
      const { render } = await import('./pages/about.js');
      content.innerHTML = '';
      render(content);
    } else {
      content.innerHTML = `
        <div class="card" style="max-width:480px;margin:40px auto;text-align:center">
          <div style="font-size:48px;margin-bottom:12px">404</div>
          <h2>Page not found</h2>
          <p style="margin:12px 0 20px">The route <code>#${escHtml(route)}</code> does not exist.</p>
          <button class="btn btn-primary" onclick="location.hash='#categories/import'">Go to Import</button>
        </div>`;
    }
  } catch (err) {
    content.innerHTML = `
      <div class="alert alert-error">
        <span class="alert-icon">✗</span>
        <div><strong>Failed to load page:</strong> ${escHtml(err.message)}</div>
      </div>`;
  }
}

// ── Setup page ────────────────────────────────────────────────
function renderSetupPage(container, prefill = {}) {
  container.innerHTML = `
    <div class="setup-page">
      <div class="page-title">
        <div style="font-size:40px;margin-bottom:8px">⚙</div>
        <h1>Configure App</h1>
        <p>Enter your APS application credentials to get started. You will select a project inside each feature.</p>
      </div>

      <div class="card">
        <div class="callback-info">
          <span class="callback-label">Callback URL</span>
          <span class="callback-url">${location.protocol}//${location.host}/auth/callback</span>
        </div>

        <div class="form-group">
          <label class="form-label required" for="setup-client-id">APS Client ID</label>
          <input id="setup-client-id" class="form-input" type="text" placeholder="Your APS application client ID" value="${escHtml(prefill.clientId || '')}" autocomplete="off" />
        </div>

        <div class="form-group">
          <label class="form-label required" for="setup-client-secret">APS Client Secret</label>
          <input id="setup-client-secret" class="form-input" type="password" placeholder="Your APS application client secret" autocomplete="off" />
          <div class="form-hint">Stored in your browser session only — never persisted to disk.</div>
        </div>

        <div id="setup-error" class="form-error hidden"></div>

        <div class="btn-group" style="margin-top:8px">
          <button id="setup-save-btn" class="btn btn-primary">Save &amp; Authenticate</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('setup-save-btn').addEventListener('click', async () => {
    const clientId = document.getElementById('setup-client-id').value.trim();
    const clientSecret = document.getElementById('setup-client-secret').value.trim();
    const errEl = document.getElementById('setup-error');

    if (!clientId || !clientSecret) {
      errEl.textContent = 'Both fields are required.';
      errEl.classList.remove('hidden');
      return;
    }

    errEl.classList.add('hidden');
    const btn = document.getElementById('setup-save-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-spinner"></span> Saving…';

    try {
      await saveConfig(clientId, clientSecret);
      _state.hasConfig = true;
      _state.authenticated = false;
      renderTopbar();
      renderNav();
      window.location.href = '/auth/login';
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'Save & Authenticate';
    }
  });

  ['setup-client-id', 'setup-client-secret'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('setup-save-btn').click();
    });
  });
}

// ── Auth prompt page ──────────────────────────────────────────
function renderAuthPage(container) {
  container.innerHTML = `
    <div class="auth-page">
      <div class="page-title">
        <div class="auth-icon">🔐</div>
        <h1>Authentication Required</h1>
        <p>Your app is configured. Sign in with your Autodesk account to continue.</p>
      </div>

      <div class="card">
        <div class="project-info-row">
          <span class="pi-label">Project ID</span>
          <span class="pi-value mono">${escHtml(_state.projectId || 'N/A')}</span>
        </div>

        <div class="alert alert-info" style="margin-bottom:20px">
          <span class="alert-icon">ℹ</span>
          <div>You will be redirected to Autodesk's login page and returned here after authenticating.</div>
        </div>

        <div class="btn-group">
          <a href="/auth/login" class="btn btn-primary btn-lg">Authenticate with Autodesk</a>
        </div>

        <div class="reconfigure-link">
          <a id="reconfigure-link">Reconfigure credentials</a>
        </div>
      </div>
    </div>
  `;

  document.getElementById('reconfigure-link').addEventListener('click', () => {
    _state.hasConfig = false;
    renderTopbar();
    renderNav();
    renderSetupPage(container, { projectId: _state.projectId });
  });
}

// ── Init ──────────────────────────────────────────────────────
async function init() {
  // Check URL params first
  const params = new URLSearchParams(location.search);
  const authParam = params.get('auth');
  const errorParam = params.get('error');

  // Clean URL params without reload
  if (authParam || errorParam) {
    const cleanUrl = location.pathname + location.hash;
    history.replaceState(null, '', cleanUrl);
  }

  // Fetch auth state from server
  try {
    const status = await authStatus();
    _state = {
      authenticated: status.authenticated,
      hasConfig: status.hasConfig,
      tokenExpiry: status.tokenExpiry,
    };
  } catch {
    _state = { authenticated: false, hasConfig: false, tokenExpiry: null };
  }

  // Show toasts for URL params
  if (authParam === 'success') {
    showToast('Successfully authenticated with Autodesk!', 'success');
  } else if (errorParam) {
    const msgs = {
      auth_failed: 'Authentication failed. Please try again.',
      no_code: 'Authorization code not received.',
      not_configured: 'App is not configured yet.',
      access_denied: 'Access was denied.',
    };
    showToast(msgs[errorParam] || `Auth error: ${errorParam}`, 'error', 6000);
  }

  renderNav();
  renderTopbar();

  // Handle hash routing
  const handleRoute = () => routeTo(currentRoute());
  window.addEventListener('hashchange', handleRoute);

  // Initial route
  if (!_state.hasConfig) {
    renderSetupPage(document.getElementById('content'));
  } else if (!_state.authenticated) {
    renderAuthPage(document.getElementById('content'));
  } else {
    if (!currentRoute()) {
      navigate('categories/import');
    } else {
      routeTo(currentRoute());
    }
  }
}

init();
