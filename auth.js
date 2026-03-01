/* ===== AXION AUTH.JS ===== */

const Auth = {
  // Simple hash (not cryptographic, just for demo)
  hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(31, h) + str.charCodeAt(i) | 0;
    }
    return h.toString(36);
  },

  getUsers() { return JSON.parse(localStorage.getItem('axion_users') || '[]'); },
  saveUsers(users) { localStorage.setItem('axion_users', JSON.stringify(users)); },

  register(name, email, password) {
    const users = this.getUsers();
    if (users.find(u => u.email === email)) return { ok: false, msg: 'Email already registered.' };
    const user = { id: Date.now().toString(), name, email, password: this.hash(password), createdAt: Date.now() };
    users.push(user);
    this.saveUsers(users);
    return { ok: true, user };
  },

  login(email, password) {
    const users = this.getUsers();
    const user = users.find(u => u.email === email && u.password === this.hash(password));
    if (!user) return { ok: false, msg: 'Invalid email or password.' };
    return { ok: true, user };
  },

  setSession(user) {
    const session = { id: user.id, name: user.name, email: user.email };
    localStorage.setItem('axion_user', JSON.stringify(session));
  },

  logout() {
    localStorage.removeItem('axion_user');
    window.location.href = 'login.html';
  },

  getSession() {
    return JSON.parse(localStorage.getItem('axion_user') || 'null');
  }
};

// ===== INIT AUTH PAGE =====
document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, go to dashboard
  if (Auth.getSession() && window.location.pathname.includes('login')) {
    window.location.href = 'dashboard.html';
    return;
  }

  // Tab switching
  const tabBtns = document.querySelectorAll('.auth-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      document.getElementById(`tab-${tab}`)?.classList.add('active');
      playSound('click');
    });
  });

  // Password toggles
  document.querySelectorAll('.password-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling;
      if (!input) return;
      input.type = input.type === 'password' ? 'text' : 'password';
      btn.textContent = input.type === 'password' ? '👁️' : '🙈';
    });
  });

  // Login form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;
      const errEl = document.getElementById('loginError');
      const result = Auth.login(email, password);
      if (!result.ok) {
        errEl.textContent = result.msg;
        errEl.classList.add('show');
        playSound('error');
        return;
      }
      errEl.classList.remove('show');
      Auth.setSession(result.user);
      playSound('success');
      Toast.show('Welcome back! 🎉', 'success');
      setTimeout(() => window.location.href = 'dashboard.html', 800);
    });
  }

  // Register form
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('regName').value.trim();
      const email = document.getElementById('regEmail').value.trim();
      const password = document.getElementById('regPassword').value;
      const errEl = document.getElementById('registerError');

      if (password.length < 6) {
        errEl.textContent = 'Password must be at least 6 characters.';
        errEl.classList.add('show');
        playSound('error');
        return;
      }

      const result = Auth.register(name, email, password);
      if (!result.ok) {
        errEl.textContent = result.msg;
        errEl.classList.add('show');
        playSound('error');
        return;
      }

      errEl.classList.remove('show');
      Auth.setSession(result.user);
      localStorage.setItem('axion_first_launch', '1');
      playSound('success');
      Toast.show('Account created! Welcome to AXION 🚀', 'success');
      setTimeout(() => window.location.href = 'dashboard.html', 800);
    });
  }

  // Demo login
  const demoBtn = document.getElementById('demoLogin');
  if (demoBtn) {
    demoBtn.addEventListener('click', () => {
      const users = Auth.getUsers();
      let demo = users.find(u => u.email === 'demo@axion.app');
      if (!demo) {
        Auth.register('Demo User', 'demo@axion.app', 'demo123');
        demo = Auth.getUsers().find(u => u.email === 'demo@axion.app');
      }
      Auth.setSession(demo);
      playSound('success');
      Toast.show('Logged in as Demo User 🎮', 'info');
      setTimeout(() => window.location.href = 'dashboard.html', 800);
    });
  }
});
