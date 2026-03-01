/* ===== AXION STREAK.JS ===== */

const StreakManager = {
  KEY: 'axion_streak_data',

  getData() {
    return JSON.parse(localStorage.getItem(this.KEY) || JSON.stringify({
      currentStreak: 0,
      bestStreak: 0,
      lastActivityDate: null,
      totalDaysActive: 0,
      history: []
    }));
  },

  save(data) { localStorage.setItem(this.KEY, JSON.stringify(data)); },

  recordActivity() {
    const data = this.getData();
    const today = new Date().toDateString();

    if (data.lastActivityDate === today) return; // Already counted today

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const wasYesterday = data.lastActivityDate === yesterday.toDateString();

    if (wasYesterday) {
      data.currentStreak++;
    } else if (data.lastActivityDate !== today) {
      data.currentStreak = 1;
    }

    data.bestStreak = Math.max(data.bestStreak, data.currentStreak);
    data.lastActivityDate = today;
    data.totalDaysActive++;
    if (!data.history.includes(today)) {
      data.history.push(today);
    }

    this.save(data);
    this.render();
    this.checkMilestones(data.currentStreak);
  },

  checkMilestones(streak) {
    const milestones = [3, 7, 14, 30, 60, 100];
    if (milestones.includes(streak)) {
      Toast.show(`🔥 ${streak}-day streak! You're on fire!`, 'success');
      playSound('complete');
    }
  },

  getStreakStatus() {
    const data = this.getData();
    const today = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (data.lastActivityDate === today) return 'active';
    if (data.lastActivityDate === yesterday.toDateString()) return 'at-risk';
    if (data.currentStreak > 0) return 'broken';
    return 'new';
  },

  render() {
    const data = this.getData();
    const streakEl = document.getElementById('streakCount');
    const streakLabelEl = document.getElementById('streakLabel');
    if (streakEl) streakEl.textContent = data.currentStreak || 0;
    if (streakLabelEl) {
      const status = this.getStreakStatus();
      const messages = {
        active: '🔥 Active streak — keep it up!',
        'at-risk': '⚠️ Complete a task to keep your streak!',
        broken: '💔 Streak broken — start again today!',
        new: '✨ Start your first streak!'
      };
      streakLabelEl.textContent = messages[status] || 'Keep going!';
    }

    // Weekly heat map
    const heatmapEl = document.getElementById('streakHeatmap');
    if (heatmapEl) {
      const days = [];
      const today = new Date();
      for (let i = 27; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        days.push(d.toDateString());
      }
      heatmapEl.innerHTML = days.map(d => {
        const active = data.history && data.history.includes(d);
        return `<div class="heatmap-cell ${active ? 'active' : ''}" title="${d}"></div>`;
      }).join('');
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  StreakManager.render();
});
