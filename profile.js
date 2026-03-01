/* ===== AXION PROFILE.JS ===== */

const ProfileManager = {
  KEY: 'axion_profile',

  get() {
    const user = JSON.parse(localStorage.getItem('axion_user') || '{}');
    const profile = JSON.parse(localStorage.getItem(this.KEY) || '{}');
    return { ...user, ...profile };
  },

  save(data) {
    localStorage.setItem(this.KEY, JSON.stringify(data));
  },

  updateAvatar(dataUrl) {
    const profile = JSON.parse(localStorage.getItem(this.KEY) || '{}');
    profile.avatar = dataUrl;
    this.save(profile);
    updateUserDisplay();
  },

  exportData() {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      tasks: JSON.parse(localStorage.getItem('axion_tasks') || '[]'),
      events: JSON.parse(localStorage.getItem('axion_events') || '[]'),
      profile: this.get(),
      streak: JSON.parse(localStorage.getItem('axion_streak_data') || '{}'),
      pomodoroHistory: JSON.parse(localStorage.getItem('axion_pomodoro_history') || '[]')
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `axion-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    Toast.show('Backup downloaded! 💾', 'success');
    playSound('success');
  },

  importData(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.tasks) localStorage.setItem('axion_tasks', JSON.stringify(data.tasks));
        if (data.events) localStorage.setItem('axion_events', JSON.stringify(data.events));
        if (data.streak) localStorage.setItem('axion_streak_data', JSON.stringify(data.streak));
        if (data.pomodoroHistory) localStorage.setItem('axion_pomodoro_history', JSON.stringify(data.pomodoroHistory));
        Toast.show('Data restored successfully! 🔄', 'success');
        playSound('success');
        setTimeout(() => window.location.reload(), 1000);
      } catch(err) {
        Toast.show('Invalid backup file', 'error');
        playSound('error');
      }
    };
    reader.readAsText(file);
  },

  clearAll() {
    if (!confirm('⚠️ This will delete ALL your AXION data. This cannot be undone. Continue?')) return;
    const keys = ['axion_tasks','axion_events','axion_profile','axion_streak_data','axion_pomodoro_state','axion_pomodoro_history'];
    keys.forEach(k => localStorage.removeItem(k));
    Toast.show('All data cleared', 'info');
    setTimeout(() => window.location.reload(), 1000);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('settingsPage')) return;
  requireAuth();

  // Load profile data
  const profile = ProfileManager.get();
  const nameInput = document.getElementById('profileName');
  const emailInput = document.getElementById('profileEmail');
  const bioInput = document.getElementById('profileBio');
  const timezoneInput = document.getElementById('profileTimezone');

  if (nameInput) nameInput.value = profile.name || '';
  if (emailInput) emailInput.value = profile.email || '';
  if (bioInput) bioInput.value = profile.bio || '';
  if (timezoneInput) timezoneInput.value = profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Sound toggle
  const soundToggle = document.getElementById('soundToggle');
  if (soundToggle) {
    soundToggle.checked = localStorage.getItem('axion_sounds') !== 'false';
    soundToggle.addEventListener('change', () => {
      SoundManager.enabled = soundToggle.checked;
      localStorage.setItem('axion_sounds', soundToggle.checked);
      Toast.show(soundToggle.checked ? 'Sounds enabled 🔊' : 'Sounds muted 🔇', 'info');
    });
  }

  // Save profile
  document.getElementById('saveProfileBtn')?.addEventListener('click', () => {
    const data = {
      name: nameInput?.value.trim() || profile.name,
      bio: bioInput?.value.trim() || '',
      timezone: timezoneInput?.value || ''
    };
    ProfileManager.save(data);
    // Update user session name
    const user = JSON.parse(localStorage.getItem('axion_user') || '{}');
    user.name = data.name;
    localStorage.setItem('axion_user', JSON.stringify(user));
    updateUserDisplay();
    Toast.show('Profile saved! ✅', 'success');
    playSound('success');
  });

  // Avatar upload
  const avatarInput = document.getElementById('avatarInput');
  const avatarPreview = document.getElementById('avatarPreview');
  document.getElementById('changeAvatarBtn')?.addEventListener('click', () => avatarInput?.click());
  avatarInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      ProfileManager.updateAvatar(ev.target.result);
      if (avatarPreview) avatarPreview.src = ev.target.result;
      Toast.show('Avatar updated!', 'success');
    };
    reader.readAsDataURL(file);
  });

  // Load avatar
  const savedProfile = JSON.parse(localStorage.getItem('axion_profile') || '{}');
  if (savedProfile.avatar && avatarPreview) avatarPreview.src = savedProfile.avatar;

  // Export/Import
  document.getElementById('exportBtn')?.addEventListener('click', () => ProfileManager.exportData());
  const importInput = document.getElementById('importInput');
  document.getElementById('importBtn')?.addEventListener('click', () => importInput?.click());
  importInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) ProfileManager.importData(file);
  });

  // Clear data
  document.getElementById('clearDataBtn')?.addEventListener('click', () => ProfileManager.clearAll());

  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    playSound('click');
    Auth.logout();
  });
});
