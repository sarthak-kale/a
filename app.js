/* ===== AXION APP.JS — Core utilities ===== */

// ===== THEME =====
const ThemeManager = {
  init() {
    const saved = localStorage.getItem('axion_theme') || 'dark';
    this.apply(saved);
  },
  apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('axion_theme', theme);
    const btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
  },
  toggle() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    this.apply(current === 'dark' ? 'light' : 'dark');
    playSound('click');
  }
};

// ===== SOUNDS =====
const SoundManager = {
  enabled: true,
  ctx: null,
  init() {
    this.enabled = localStorage.getItem('axion_sounds') !== 'false';
    this.ctx = null;
  },
  getCtx() {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){}
    }
    return this.ctx;
  },
  play(type) {
    if (!this.enabled) return;
    const ctx = this.getCtx();
    if (!ctx) return;
    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      const configs = {
        click: { freq: 800, type: 'sine', dur: 0.06, vol: 0.1 },
        success: { freq: [523, 659, 784], type: 'sine', dur: 0.4, vol: 0.15 },
        error: { freq: 200, type: 'sawtooth', dur: 0.2, vol: 0.1 },
        tick: { freq: 1000, type: 'sine', dur: 0.02, vol: 0.05 },
        complete: { freq: [784, 988, 1175], type: 'sine', dur: 0.6, vol: 0.2 }
      };
      const cfg = configs[type] || configs.click;
      if (Array.isArray(cfg.freq)) {
        cfg.freq.forEach((f, i) => {
          setTimeout(() => {
            const o2 = ctx.createOscillator();
            const g2 = ctx.createGain();
            o2.connect(g2); g2.connect(ctx.destination);
            o2.frequency.setValueAtTime(f, ctx.currentTime);
            o2.type = cfg.type;
            g2.gain.setValueAtTime(cfg.vol, ctx.currentTime);
            g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + cfg.dur / cfg.freq.length);
            o2.start(ctx.currentTime);
            o2.stop(ctx.currentTime + cfg.dur / cfg.freq.length);
          }, i * 120);
        });
      } else {
        o.frequency.setValueAtTime(cfg.freq, ctx.currentTime);
        o.type = cfg.type;
        g.gain.setValueAtTime(cfg.vol, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + cfg.dur);
        o.start(ctx.currentTime);
        o.stop(ctx.currentTime + cfg.dur);
      }
    } catch(e) {}
  }
};
function playSound(type) { SoundManager.play(type); }

// ===== TOAST =====
const Toast = {
  container: null,
  init() {
    if (!document.getElementById('toast-container')) {
      const c = document.createElement('div');
      c.id = 'toast-container';
      document.body.appendChild(c);
    }
    this.container = document.getElementById('toast-container');
  },
  show(msg, type = 'info', duration = 3500) {
    if (!this.container) this.init();
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<span class="toast-icon">${icons[type]||icons.info}</span><span class="toast-msg">${msg}</span>`;
    this.container.appendChild(t);
    if (type === 'success') playSound('success');
    else if (type === 'error') playSound('error');
    setTimeout(() => {
      t.classList.add('hiding');
      setTimeout(() => t.remove(), 300);
    }, duration);
  }
};

// ===== AUTH GUARD =====
function requireAuth() {
  const user = JSON.parse(localStorage.getItem('axion_user') || 'null');
  if (!user) { window.location.href = 'login.html'; return null; }
  return user;
}

// ===== SCROLL REVEAL =====
function initScrollReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
    });
  }, { threshold: 0.1 });
  els.forEach(el => obs.observe(el));
}

// ===== SPLASH =====
function initSplash() {
  const splash = document.getElementById('splash');
  if (!splash) return;
  setTimeout(() => splash.classList.add('hidden'), 1200);
}

// ===== PWA =====
function initPWA() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  }
}

// ===== SIDEBAR MOBILE =====
function initSidebarMobile() {
  const btn = document.getElementById('mobileMenuBtn');
  const sidebar = document.querySelector('.sidebar');
  if (!btn || !sidebar) return;
  btn.addEventListener('click', () => sidebar.classList.toggle('open'));
  document.addEventListener('click', (e) => {
    if (!sidebar.contains(e.target) && !btn.contains(e.target)) sidebar.classList.remove('open');
  });
}

// ===== UPDATE USER DISPLAY =====
function updateUserDisplay() {
  const user = JSON.parse(localStorage.getItem('axion_user') || 'null');
  if (!user) return;
  const nameEls = document.querySelectorAll('.user-name');
  const avatarEls = document.querySelectorAll('.user-avatar');
  nameEls.forEach(el => el.textContent = user.name || 'User');
  avatarEls.forEach(el => {
    const profile = JSON.parse(localStorage.getItem('axion_profile') || '{}');
    if (profile.avatar) {
      el.innerHTML = `<img src="${profile.avatar}" alt="avatar">`;
    } else {
      el.textContent = (user.name || 'U')[0].toUpperCase();
    }
  });
}

// ===== FORMAT DATE =====
function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function formatTime(d) {
  return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  ThemeManager.init();
  SoundManager.init();
  Toast.init();
  initSplash();
  initPWA();
  initScrollReveal();
  initSidebarMobile();
  updateUserDisplay();

  // Theme toggle
  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) themeBtn.addEventListener('click', () => ThemeManager.toggle());

  // Click sounds on buttons
  document.addEventListener('click', (e) => {
    if (e.target.matches('.btn, .btn-icon, .sidebar-link, .cal-nav-btn, .pom-btn-reset')) {
      playSound('click');
    }
  });
});
