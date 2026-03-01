/* ===== AXION ANALYTICS.JS ===== */

const Analytics = {
  renderAll() {
    this.renderTasksChart();
    this.renderWeeklyChart();
    this.renderCategoryChart();
    this.renderProductivityScore();
    this.renderStats();
  },

  renderStats() {
    const tasks = JSON.parse(localStorage.getItem('axion_tasks') || '[]');
    const pomH = JSON.parse(localStorage.getItem('axion_pomodoro_history') || '[]');
    const streak = JSON.parse(localStorage.getItem('axion_streak_data') || '{}');

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.done).length;
    const focusSessions = pomH.length;
    const focusMinutes = pomH.reduce((s, h) => s + (h.duration || 25), 0);

    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setEl('statTotalTasks', totalTasks);
    setEl('statCompletedTasks', completedTasks);
    setEl('statFocusSessions', focusSessions);
    setEl('statFocusTime', `${Math.floor(focusMinutes/60)}h ${focusMinutes%60}m`);
    setEl('statCurrentStreak', (streak.currentStreak || 0) + ' days');
    setEl('statBestStreak', (streak.bestStreak || 0) + ' days');
    setEl('statCompletionRate', totalTasks ? Math.round(completedTasks/totalTasks*100)+'%' : '0%');
  },

  renderTasksChart() {
    const canvas = document.getElementById('tasksChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const tasks = JSON.parse(localStorage.getItem('axion_tasks') || '[]');

    // Last 7 days
    const days = [];
    const labels = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toDateString();
      labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
      days.push(tasks.filter(t => t.done && t.completedAt && new Date(t.completedAt).toDateString() === dateStr).length);
    }

    this.drawBarChart(ctx, canvas, labels, days, '#6c63ff', 'Tasks Completed');
  },

  renderWeeklyChart() {
    const canvas = document.getElementById('weeklyChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const pomH = JSON.parse(localStorage.getItem('axion_pomodoro_history') || '[]');

    const days = [];
    const labels = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toDateString();
      labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
      const mins = pomH.filter(h => new Date(h.time).toDateString() === dateStr).reduce((s, h) => s + (h.duration || 25), 0);
      days.push(mins);
    }

    this.drawBarChart(ctx, canvas, labels, days, '#43e97b', 'Focus Minutes');
  },

  renderCategoryChart() {
    const canvas = document.getElementById('categoryChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const tasks = JSON.parse(localStorage.getItem('axion_tasks') || '[]');

    const cats = {};
    tasks.forEach(t => { cats[t.category || 'general'] = (cats[t.category || 'general'] || 0) + 1; });
    const labels = Object.keys(cats);
    const values = Object.values(cats);
    const colors = ['#6c63ff', '#ff6584', '#43e97b', '#ffa502', '#1ea7fd'];

    this.drawDonutChart(ctx, canvas, labels, values, colors);
  },

  renderProductivityScore() {
    const canvas = document.getElementById('productivityChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const tasks = JSON.parse(localStorage.getItem('axion_tasks') || '[]');
    const pomH = JSON.parse(localStorage.getItem('axion_pomodoro_history') || '[]');
    const labels = [];
    const scores = [];
    const today = new Date();

    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toDateString();
      labels.push(i === 0 ? 'Today' : d.getDate()+'');
      const taskScore = tasks.filter(t => t.done && t.completedAt && new Date(t.completedAt).toDateString() === dateStr).length * 10;
      const focusScore = pomH.filter(h => new Date(h.time).toDateString() === dateStr).length * 5;
      scores.push(Math.min(100, taskScore + focusScore));
    }

    this.drawLineChart(ctx, canvas, labels, scores, '#ff6584', 'Productivity Score');
  },

  drawBarChart(ctx, canvas, labels, values, color, label) {
    const W = canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    const H = canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    const w = canvas.offsetWidth, h = canvas.offsetHeight;

    ctx.clearRect(0, 0, w, h);
    const pad = { top: 20, right: 20, bottom: 40, left: 40 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;
    const max = Math.max(...values, 1);
    const barW = chartW / labels.length * 0.6;
    const gap = chartW / labels.length;

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + chartH - (i / 4) * chartH;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + chartW, y); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '10px Inter';
      ctx.fillText(Math.round(max * i / 4), pad.left - 30, y + 4);
    }

    // Bars
    labels.forEach((lbl, i) => {
      const x = pad.left + i * gap + gap / 2 - barW / 2;
      const barH = (values[i] / max) * chartH;
      const y = pad.top + chartH - barH;

      const grad = ctx.createLinearGradient(0, y, 0, pad.top + chartH);
      grad.addColorStop(0, color);
      grad.addColorStop(1, color + '44');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, 4);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '11px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(lbl, x + barW / 2, h - pad.bottom + 16);

      if (values[i] > 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = 'bold 11px Inter';
        ctx.fillText(values[i], x + barW / 2, y - 6);
      }
    });
    ctx.textAlign = 'left';
  },

  drawLineChart(ctx, canvas, labels, values, color, label) {
    const W = canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    const H = canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    const w = canvas.offsetWidth, h = canvas.offsetHeight;

    ctx.clearRect(0, 0, w, h);
    const pad = { top: 20, right: 20, bottom: 40, left: 45 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;
    const max = 100;

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + chartH - (i / 4) * chartH;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + chartW, y); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '10px Inter';
      ctx.fillText(max * i / 4, pad.left - 38, y + 4);
    }

    // Fill area
    ctx.beginPath();
    const pts = labels.map((_, i) => ({
      x: pad.left + (i / (labels.length - 1)) * chartW,
      y: pad.top + chartH - (values[i] / max) * chartH
    }));
    ctx.moveTo(pts[0].x, pad.top + chartH);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(pts[pts.length-1].x, pad.top + chartH);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
    grad.addColorStop(0, color + '44');
    grad.addColorStop(1, color + '00');
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    pts.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
    ctx.stroke();

    // Dots
    pts.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#0a0a0f';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Labels
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '10px Inter';
    ctx.textAlign = 'center';
    const step = Math.ceil(labels.length / 7);
    labels.forEach((lbl, i) => {
      if (i % step === 0) ctx.fillText(lbl, pts[i].x, h - pad.bottom + 16);
    });
    ctx.textAlign = 'left';
  },

  drawDonutChart(ctx, canvas, labels, values, colors) {
    const W = canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    const H = canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    const w = canvas.offsetWidth, h = canvas.offsetHeight;

    ctx.clearRect(0, 0, w, h);
    if (values.length === 0 || values.every(v => v === 0)) {
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.font = '14px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('No data yet', w/2, h/2);
      return;
    }

    const total = values.reduce((a, b) => a + b, 0);
    const cx = w * 0.4, cy = h / 2;
    const outerR = Math.min(cx, cy) * 0.8;
    const innerR = outerR * 0.6;

    let startAngle = -Math.PI / 2;
    values.forEach((val, i) => {
      const angle = (val / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, outerR, startAngle, startAngle + angle);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
      startAngle += angle;
    });

    // Inner circle
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.fillStyle = '#0a0a0f';
    ctx.fill();

    // Center text
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = 'bold 20px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(total, cx, cy + 4);
    ctx.font = '11px Inter';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('tasks', cx, cy + 18);

    // Legend
    const lx = w * 0.75;
    let ly = cy - (labels.length * 22) / 2;
    labels.forEach((lbl, i) => {
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.roundRect(lx, ly - 6, 12, 12, 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '12px Inter';
      ctx.textAlign = 'left';
      ctx.fillText(`${lbl} (${values[i]})`, lx + 18, ly + 4);
      ly += 22;
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('analyticsPage')) return;
  const user = requireAuth();
  if (!user) return;

  Analytics.renderAll();

  // Re-render on resize
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => Analytics.renderAll(), 200);
  });
});
