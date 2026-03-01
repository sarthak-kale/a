/* ===== AXION POMODORO.JS ===== */

const PomodoroTimer = {
  KEY: 'axion_pomodoro_state',
  HISTORY_KEY: 'axion_pomodoro_history',

  state: {
    mode: 'focus',
    running: false,
    timeLeft: 25 * 60,
    totalTime: 25 * 60,
    sessionsCompleted: 0,
    settings: { focus: 25, shortBreak: 5, longBreak: 15, sessionsBeforeLong: 4 }
  },

  interval: null,

  init() {
    // Load saved state
    const saved = localStorage.getItem(this.KEY);
    if (saved) {
      try {
        const s = JSON.parse(saved);
        this.state.sessionsCompleted = s.sessionsCompleted || 0;
        this.state.settings = { ...this.state.settings, ...s.settings };
      } catch(e) {}
    }
    this.state.timeLeft = this.state.settings.focus * 60;
    this.state.totalTime = this.state.settings.focus * 60;
    this.updateDisplay();
    this.updateSessionDots();
    this.renderHistory();
    this.applySettings();
  },

  saveState() {
    localStorage.setItem(this.KEY, JSON.stringify({
      sessionsCompleted: this.state.sessionsCompleted,
      settings: this.state.settings
    }));
  },

  start() {
    if (this.state.running) return;
    this.state.running = true;
    document.getElementById('pomPlayBtn').textContent = '⏸ Pause';
    document.getElementById('pomPlayBtn').onclick = () => this.pause();
    this.interval = setInterval(() => this.tick(), 1000);
    const ambient = document.getElementById('pomAmbient');
    if (ambient) { ambient.className = `pom-ambient ${this.state.mode === 'focus' ? 'focus' : 'break'}`; }
  },

  pause() {
    this.state.running = false;
    clearInterval(this.interval);
    document.getElementById('pomPlayBtn').textContent = '▶ Resume';
    document.getElementById('pomPlayBtn').onclick = () => this.start();
  },

  reset() {
    this.pause();
    this.state.timeLeft = this.state.totalTime;
    this.state.running = false;
    document.getElementById('pomPlayBtn').textContent = '▶ Start';
    document.getElementById('pomPlayBtn').onclick = () => this.start();
    this.updateDisplay();
    const ambient = document.getElementById('pomAmbient');
    if (ambient) ambient.className = 'pom-ambient';
  },

  tick() {
    playSound('tick');
    this.state.timeLeft--;
    this.updateDisplay();
    if (this.state.timeLeft <= 0) {
      this.complete();
    }
  },

  complete() {
    clearInterval(this.interval);
    this.state.running = false;
    playSound('complete');

    if (this.state.mode === 'focus') {
      this.state.sessionsCompleted++;
      this.saveState();
      this.addHistory();
      StreakManager.recordActivity();

      const isLong = this.state.sessionsCompleted % this.state.settings.sessionsBeforeLong === 0;
      Toast.show(isLong ? '🎉 Time for a long break!' : '✅ Focus session done! Take a break.', 'success');
      this.switchMode(isLong ? 'longBreak' : 'shortBreak');
    } else {
      Toast.show('💪 Break over! Ready to focus?', 'info');
      this.switchMode('focus');
    }

    this.updateSessionDots();
    document.getElementById('pomPlayBtn').textContent = '▶ Start';
    document.getElementById('pomPlayBtn').onclick = () => this.start();
  },

  switchMode(mode) {
    this.state.mode = mode;
    document.querySelectorAll('.pom-mode-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.mode === mode);
    });
    const times = { focus: this.state.settings.focus, shortBreak: this.state.settings.shortBreak, longBreak: this.state.settings.longBreak };
    this.state.totalTime = (times[mode] || 25) * 60;
    this.state.timeLeft = this.state.totalTime;
    this.updateDisplay();
    document.getElementById('pomPhaseLabel').textContent = { focus: 'Focus Session', shortBreak: 'Short Break', longBreak: 'Long Break' }[mode] || 'Focus';
  },

  updateDisplay() {
    const min = Math.floor(this.state.timeLeft / 60).toString().padStart(2, '0');
    const sec = (this.state.timeLeft % 60).toString().padStart(2, '0');
    const timeEl = document.getElementById('pomTime');
    if (timeEl) timeEl.textContent = `${min}:${sec}`;

    // Update ring
    const ring = document.getElementById('pomRingProgress');
    if (ring) {
      const r = 90;
      const circ = 2 * Math.PI * r;
      const pct = this.state.timeLeft / this.state.totalTime;
      ring.style.strokeDasharray = circ;
      ring.style.strokeDashoffset = circ * (1 - pct);
      const hue = this.state.mode === 'focus' ? '252' : '152';
      ring.style.stroke = `hsl(${hue}, 100%, 70%)`;
    }

    document.title = `${min}:${sec} — AXION Pomodoro`;
  },

  updateSessionDots() {
    const container = document.getElementById('pomSessionDots');
    if (!container) return;
    const total = this.state.settings.sessionsBeforeLong;
    const done = this.state.sessionsCompleted % total;
    container.innerHTML = Array.from({length: total}, (_, i) => {
      const cls = i < done ? 'done' : (i === done && this.state.running && this.state.mode === 'focus') ? 'current' : '';
      return `<div class="pom-session-dot ${cls}"></div>`;
    }).join('');
  },

  addHistory() {
    const h = JSON.parse(localStorage.getItem(this.HISTORY_KEY) || '[]');
    h.unshift({ mode: this.state.mode, duration: this.state.settings.focus, time: Date.now() });
    localStorage.setItem(this.HISTORY_KEY, JSON.stringify(h.slice(0, 20)));
    this.renderHistory();
  },

  renderHistory() {
    const container = document.getElementById('pomHistory');
    if (!container) return;
    const h = JSON.parse(localStorage.getItem(this.HISTORY_KEY) || '[]');
    if (h.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⏱️</div><div class="empty-state-title">No sessions yet</div></div>';
      return;
    }
    container.innerHTML = h.slice(0, 5).map(item => `
      <div class="pom-history-item">
        <div class="pom-history-icon">🍅</div>
        <div class="pom-history-label">Focus Session — ${item.duration} min</div>
        <div class="pom-history-time">${new Date(item.time).toLocaleTimeString('en-US', {hour:'2-digit',minute:'2-digit'})}</div>
      </div>
    `).join('');
  },

  applySettings() {
    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setEl('focusDuration', this.state.settings.focus);
    setEl('shortBreakDuration', this.state.settings.shortBreak);
    setEl('longBreakDuration', this.state.settings.longBreak);
    setEl('sessionsBeforeLong', this.state.settings.sessionsBeforeLong);
  },

  changeSetting(key, delta) {
    const min = { focus: 5, shortBreak: 1, longBreak: 5, sessionsBeforeLong: 1 };
    const max = { focus: 90, shortBreak: 15, longBreak: 45, sessionsBeforeLong: 8 };
    this.state.settings[key] = Math.max(min[key], Math.min(max[key], this.state.settings[key] + delta));
    this.saveState();
    this.applySettings();
    if (!this.state.running) {
      this.switchMode(this.state.mode);
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('pomodoroPage')) return;
  const user = requireAuth();
  if (!user) return;

  PomodoroTimer.init();

  document.getElementById('pomPlayBtn')?.addEventListener('click', () => PomodoroTimer.start());
  document.getElementById('pomResetBtn')?.addEventListener('click', () => { PomodoroTimer.reset(); playSound('click'); });

  document.querySelectorAll('.pom-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!PomodoroTimer.state.running) {
        PomodoroTimer.switchMode(btn.dataset.mode);
        playSound('click');
      }
    });
  });

  // Settings +/-
  document.querySelectorAll('[data-setting]').forEach(btn => {
    btn.addEventListener('click', () => {
      const { setting, delta } = btn.dataset;
      PomodoroTimer.changeSetting(setting, parseInt(delta));
      playSound('click');
    });
  });
});
