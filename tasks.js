/* ===== AXION TASKS.JS ===== */

const TaskManager = {
  KEY: 'axion_tasks',

  getAll() { return JSON.parse(localStorage.getItem(this.KEY) || '[]'); },
  save(tasks) { localStorage.setItem(this.KEY, JSON.stringify(tasks)); },

  add(data) {
    const tasks = this.getAll();
    const task = {
      id: Date.now().toString(),
      title: data.title,
      description: data.description || '',
      priority: data.priority || 'medium',
      category: data.category || 'general',
      dueDate: data.dueDate || null,
      done: false,
      createdAt: Date.now(),
      completedAt: null
    };
    tasks.unshift(task);
    this.save(tasks);
    return task;
  },

  update(id, updates) {
    const tasks = this.getAll();
    const i = tasks.findIndex(t => t.id === id);
    if (i === -1) return null;
    tasks[i] = { ...tasks[i], ...updates };
    this.save(tasks);
    return tasks[i];
  },

  toggle(id) {
    const tasks = this.getAll();
    const t = tasks.find(t => t.id === id);
    if (!t) return;
    t.done = !t.done;
    t.completedAt = t.done ? Date.now() : null;
    this.save(tasks);
    if (t.done) StreakManager.recordActivity();
    return t;
  },

  delete(id) {
    const tasks = this.getAll();
    this.save(tasks.filter(t => t.id !== id));
  },

  getStats() {
    const tasks = this.getAll();
    const total = tasks.length;
    const done = tasks.filter(t => t.done).length;
    const overdue = tasks.filter(t => !t.done && t.dueDate && new Date(t.dueDate) < new Date()).length;
    const today = tasks.filter(t => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate); const n = new Date();
      return d.toDateString() === n.toDateString();
    }).length;
    return { total, done, pending: total - done, overdue, today };
  }
};

// ===== RENDER FUNCTIONS =====
function renderTasks(containerId, filter = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let tasks = TaskManager.getAll();

  if (filter.search) tasks = tasks.filter(t => t.title.toLowerCase().includes(filter.search.toLowerCase()));
  if (filter.priority) tasks = tasks.filter(t => t.priority === filter.priority);
  if (filter.category) tasks = tasks.filter(t => t.category === filter.category);
  if (filter.status === 'done') tasks = tasks.filter(t => t.done);
  if (filter.status === 'pending') tasks = tasks.filter(t => !t.done);
  if (filter.status === 'overdue') tasks = tasks.filter(t => !t.done && t.dueDate && new Date(t.dueDate) < new Date());
  if (typeof filter.limit === 'number') tasks = tasks.slice(0, filter.limit);

  if (tasks.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">📋</div>
      <div class="empty-state-title">No tasks yet</div>
      <div class="empty-state-desc">Add your first task above</div>
    </div>`;
    return;
  }

  container.innerHTML = tasks.map(t => taskHTML(t)).join('');
  bindTaskEvents(container);
}

function taskHTML(t) {
  const priorityColors = { high: 'badge-red', medium: 'badge-yellow', low: 'badge-green' };
  const due = t.dueDate ? `<span class="badge ${new Date(t.dueDate) < new Date() && !t.done ? 'badge-red' : 'badge-blue'}">${formatDate(t.dueDate)}</span>` : '';
  return `<div class="task-item" data-id="${t.id}">
    <div class="task-check ${t.done ? 'checked' : ''}" data-action="toggle" data-id="${t.id}"></div>
    <div class="task-text ${t.done ? 'done' : ''}">${escapeHtml(t.title)}</div>
    <div class="task-meta">
      ${due}
      <span class="badge ${priorityColors[t.priority]}">${t.priority}</span>
    </div>
    <div class="task-actions">
      <button class="task-action-btn" data-action="edit" data-id="${t.id}" title="Edit">✏️</button>
      <button class="task-action-btn del" data-action="delete" data-id="${t.id}" title="Delete">🗑️</button>
    </div>
  </div>`;
}

function bindTaskEvents(container) {
  container.querySelectorAll('[data-action]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const { action, id } = el.dataset;
      if (action === 'toggle') {
        TaskManager.toggle(id);
        playSound('success');
        renderTasks(container.id, container.__filter || {});
        updateDashboardStats();
        StreakManager.render();
      } else if (action === 'delete') {
        if (confirm('Delete this task?')) {
          TaskManager.delete(id);
          playSound('click');
          renderTasks(container.id, container.__filter || {});
          updateDashboardStats();
        }
      } else if (action === 'edit') {
        openEditTaskModal(id);
      }
    });
  });
}

// ===== TASK MODAL =====
let editingTaskId = null;

function openAddTaskModal() {
  editingTaskId = null;
  const modal = document.getElementById('taskModal');
  if (!modal) return;
  document.getElementById('taskModalTitle').textContent = '+ New Task';
  document.getElementById('taskForm').reset();
  modal.classList.add('open');
  playSound('click');
}

function openEditTaskModal(id) {
  const task = TaskManager.getAll().find(t => t.id === id);
  if (!task) return;
  editingTaskId = id;
  const modal = document.getElementById('taskModal');
  if (!modal) return;
  document.getElementById('taskModalTitle').textContent = 'Edit Task';
  document.getElementById('taskTitle').value = task.title;
  document.getElementById('taskDescription').value = task.description || '';
  document.getElementById('taskPriority').value = task.priority;
  document.getElementById('taskCategory').value = task.category;
  if (task.dueDate) document.getElementById('taskDueDate').value = new Date(task.dueDate).toISOString().split('T')[0];
  modal.classList.add('open');
  playSound('click');
}

function closeTaskModal() {
  document.getElementById('taskModal')?.classList.remove('open');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function updateDashboardStats() {
  const stats = TaskManager.getStats();
  const els = {
    statTotal: stats.total,
    statDone: stats.done,
    statPending: stats.pending,
    statOverdue: stats.overdue
  };
  for (const [id, val] of Object.entries(els)) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }
}

// ===== INIT TASKS PAGE =====
document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('tasksPage') && !document.getElementById('dashboardPage')) return;

  const user = requireAuth();
  if (!user) return;
  updateDashboardStats();

  // Quick add (dashboard)
  const quickInput = document.getElementById('quickAddInput');
  const quickBtn = document.getElementById('quickAddBtn');
  if (quickInput && quickBtn) {
    const doQuickAdd = () => {
      const title = quickInput.value.trim();
      if (!title) return;
      TaskManager.add({ title });
      quickInput.value = '';
      playSound('success');
      Toast.show('Task added!', 'success');
      renderTasks('recentTasksList', { limit: 5 });
      updateDashboardStats();
      StreakManager.render();
    };
    quickBtn.addEventListener('click', doQuickAdd);
    quickInput.addEventListener('keydown', e => { if (e.key === 'Enter') doQuickAdd(); });
  }

  // Task form submit
  const taskForm = document.getElementById('taskForm');
  if (taskForm) {
    taskForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = {
        title: document.getElementById('taskTitle').value.trim(),
        description: document.getElementById('taskDescription').value.trim(),
        priority: document.getElementById('taskPriority').value,
        category: document.getElementById('taskCategory').value,
        dueDate: document.getElementById('taskDueDate').value ? new Date(document.getElementById('taskDueDate').value).getTime() : null
      };
      if (!data.title) { Toast.show('Task title required', 'error'); return; }

      if (editingTaskId) {
        TaskManager.update(editingTaskId, data);
        Toast.show('Task updated!', 'success');
      } else {
        TaskManager.add(data);
        Toast.show('Task added! 🎯', 'success');
      }

      closeTaskModal();
      playSound('success');
      const container = document.getElementById('fullTasksList') || document.getElementById('recentTasksList');
      if (container) renderTasks(container.id, container.__filter || {});
      updateDashboardStats();
    });
  }

  // Modal close
  document.getElementById('closeTaskModal')?.addEventListener('click', closeTaskModal);
  document.getElementById('taskModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'taskModal') closeTaskModal();
  });

  // Filter buttons
  document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      const container = document.getElementById('fullTasksList');
      if (container) {
        const f = {};
        if (['done', 'pending', 'overdue'].includes(filter)) f.status = filter;
        else if (['high','medium','low'].includes(filter)) f.priority = filter;
        container.__filter = f;
        renderTasks('fullTasksList', f);
      }
      playSound('click');
    });
  });

  // Search
  const searchInput = document.getElementById('taskSearch');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const container = document.getElementById('fullTasksList');
      if (container) renderTasks('fullTasksList', { search: searchInput.value });
    });
  }

  // Add task btn
  document.getElementById('addTaskBtn')?.addEventListener('click', openAddTaskModal);

  // Initial renders
  const fullList = document.getElementById('fullTasksList');
  if (fullList) { fullList.__filter = {}; renderTasks('fullTasksList', {}); }
  const recentList = document.getElementById('recentTasksList');
  if (recentList) { recentList.__filter = {}; renderTasks('recentTasksList', { limit: 5 }); }
});
