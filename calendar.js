/* ===== AXION CALENDAR.JS ===== */

const CalendarManager = {
  KEY: 'axion_events',
  getAll() { return JSON.parse(localStorage.getItem(this.KEY) || '[]'); },
  save(events) { localStorage.setItem(this.KEY, JSON.stringify(events)); },
  add(data) {
    const events = this.getAll();
    const ev = {
      id: Date.now().toString(),
      title: data.title,
      description: data.description || '',
      date: data.date,
      time: data.time || '',
      endTime: data.endTime || '',
      category: data.category || 'other',
      color: data.color || '#6c63ff',
      createdAt: Date.now()
    };
    events.push(ev);
    this.save(events);
    return ev;
  },
  update(id, updates) {
    const events = this.getAll();
    const i = events.findIndex(e => e.id === id);
    if (i === -1) return;
    events[i] = { ...events[i], ...updates };
    this.save(events);
  },
  delete(id) {
    this.save(this.getAll().filter(e => e.id !== id));
  },
  getForDate(dateStr) {
    return this.getAll().filter(e => e.date === dateStr);
  },
  getForMonth(year, month) {
    const prefix = `${year}-${String(month+1).padStart(2,'0')}`;
    return this.getAll().filter(e => e.date.startsWith(prefix));
  }
};

// ===== CALENDAR RENDERER =====
const Calendar = {
  currentDate: new Date(),
  selectedDate: null,
  view: 'month',

  init() {
    this.selectedDate = new Date().toISOString().split('T')[0];
    this.render();
    this.renderEventsList();
  },

  render() {
    if (this.view === 'month') this.renderMonth();
    else this.renderWeek();
  },

  renderMonth() {
    const y = this.currentDate.getFullYear();
    const m = this.currentDate.getMonth();
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    document.getElementById('calMonthLabel').textContent = `${monthNames[m]} ${y}`;

    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m+1, 0).getDate();
    const daysInPrev = new Date(y, m, 0).getDate();
    const events = CalendarManager.getForMonth(y, m);
    const today = new Date().toISOString().split('T')[0];

    const grid = document.getElementById('calGrid');
    if (!grid) return;

    const headers = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d =>
      `<div class="cal-day-header">${d}</div>`).join('');

    let days = '';
    // Prev month days
    for (let i = firstDay - 1; i >= 0; i--) {
      days += `<div class="cal-day other-month"><span class="cal-date">${daysInPrev - i}</span></div>`;
    }
    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dayEvents = events.filter(e => e.date === dateStr);
      const isToday = dateStr === today;
      const isSelected = dateStr === this.selectedDate;
      const evHTML = dayEvents.slice(0,3).map(e =>
        `<div class="cal-event ${e.category}" title="${e.title}">${e.title}</div>`).join('');
      const more = dayEvents.length > 3 ? `<div class="cal-more">+${dayEvents.length-3} more</div>` : '';
      days += `<div class="cal-day ${isToday?'today':''} ${isSelected?'selected':''}" data-date="${dateStr}">
        <span class="cal-date">${d}</span>${evHTML}${more}
      </div>`;
    }
    // Next month
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    let next = 1;
    for (let i = firstDay + daysInMonth; i < totalCells; i++) {
      days += `<div class="cal-day other-month"><span class="cal-date">${next++}</span></div>`;
    }

    grid.innerHTML = headers + days;
    grid.querySelectorAll('.cal-day:not(.other-month)').forEach(el => {
      el.addEventListener('click', () => {
        this.selectedDate = el.dataset.date;
        grid.querySelectorAll('.cal-day').forEach(d => d.classList.remove('selected'));
        el.classList.add('selected');
        this.renderEventsList();
        playSound('click');
      });
    });
  },

  renderWeek() {
    const y = this.currentDate.getFullYear();
    const m = this.currentDate.getMonth();
    const d = this.currentDate.getDate();
    const dayOfWeek = this.currentDate.getDay();
    const weekStart = new Date(y, m, d - dayOfWeek);
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    document.getElementById('calMonthLabel').textContent =
      `Week of ${monthNames[weekStart.getMonth()]} ${weekStart.getDate()}, ${weekStart.getFullYear()}`;

    const grid = document.getElementById('calGrid');
    if (!grid) return;

    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    let headers = '<div class="cal-day-header" style="background:var(--bg-secondary)">Time</div>';
    for (let i = 0; i < 7; i++) {
      const dt = new Date(weekStart); dt.setDate(dt.getDate() + i);
      const dateStr = dt.toISOString().split('T')[0];
      const isToday = dateStr === new Date().toISOString().split('T')[0];
      headers += `<div class="cal-day-header ${isToday?'today':''}">${dayNames[i]} ${dt.getDate()}</div>`;
    }

    let rows = headers;
    for (let h = 6; h < 22; h++) {
      rows += `<div class="week-time">${h === 12 ? '12pm' : h > 12 ? `${h-12}pm` : `${h}am`}</div>`;
      for (let i = 0; i < 7; i++) {
        const dt = new Date(weekStart); dt.setDate(dt.getDate() + i);
        const dateStr = dt.toISOString().split('T')[0];
        const evs = CalendarManager.getForDate(dateStr).filter(e => {
          if (!e.time) return false;
          const eh = parseInt(e.time.split(':')[0]);
          return eh === h;
        });
        const evHTML = evs.map(e => `<div class="cal-event ${e.category}" style="font-size:0.65rem;padding:2px 4px">${e.title}</div>`).join('');
        rows += `<div class="week-cell" data-date="${dateStr}" data-hour="${h}">${evHTML}</div>`;
      }
    }

    grid.style.gridTemplateColumns = '60px repeat(7, 1fr)';
    grid.innerHTML = rows;
    grid.querySelectorAll('.week-cell').forEach(el => {
      el.addEventListener('click', () => {
        this.selectedDate = el.dataset.date;
        this.renderEventsList();
        openAddEventModal(el.dataset.date, el.dataset.hour);
        playSound('click');
      });
    });
  },

  renderEventsList() {
    const container = document.getElementById('eventsList');
    if (!container) return;
    const events = this.selectedDate ? CalendarManager.getForDate(this.selectedDate) : CalendarManager.getAll().slice(0, 10);

    const dateLabel = document.getElementById('selectedDateLabel');
    if (dateLabel && this.selectedDate) {
      dateLabel.textContent = new Date(this.selectedDate + 'T12:00').toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });
    }

    if (events.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📅</div><div class="empty-state-title">No events</div><div class="empty-state-desc">Click a day to add an event</div></div>`;
      return;
    }

    const catColors = { work: '#8b83ff', personal: '#ff8099', health: '#43e97b', other: '#ffa502' };
    container.innerHTML = events.sort((a,b) => (a.time||'').localeCompare(b.time||'')).map(ev => `
      <div class="event-item" data-id="${ev.id}">
        <div class="event-time">${ev.time || 'All day'}${ev.endTime ? ' – '+ev.endTime : ''}</div>
        <div class="event-dot" style="background:${catColors[ev.category]||'#6c63ff'}"></div>
        <div class="event-content">
          <div class="event-name">${escapeHtml(ev.title)}</div>
          ${ev.description ? `<div class="event-desc">${escapeHtml(ev.description)}</div>` : ''}
        </div>
        <div class="event-actions">
          <button class="task-action-btn" data-action="edit-event" data-id="${ev.id}">✏️</button>
          <button class="task-action-btn del" data-action="delete-event" data-id="${ev.id}">🗑️</button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const { action, id } = btn.dataset;
        if (action === 'delete-event') {
          if (confirm('Delete this event?')) {
            CalendarManager.delete(id);
            this.render();
            this.renderEventsList();
            playSound('click');
          }
        } else if (action === 'edit-event') {
          openEditEventModal(id);
        }
      });
    });
  },

  prev() {
    if (this.view === 'month') this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    else this.currentDate.setDate(this.currentDate.getDate() - 7);
    this.render();
  },
  next() {
    if (this.view === 'month') this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    else this.currentDate.setDate(this.currentDate.getDate() + 7);
    this.render();
  },
  today() {
    this.currentDate = new Date();
    this.render();
  }
};

let editingEventId = null;

function openAddEventModal(date, hour) {
  editingEventId = null;
  const modal = document.getElementById('eventModal');
  if (!modal) return;
  document.getElementById('eventModalTitle').textContent = '+ New Event';
  document.getElementById('eventForm').reset();
  if (date) document.getElementById('eventDate').value = date;
  if (hour) document.getElementById('eventTime').value = `${String(hour).padStart(2,'0')}:00`;
  modal.classList.add('open');
  playSound('click');
}

function openEditEventModal(id) {
  const ev = CalendarManager.getAll().find(e => e.id === id);
  if (!ev) return;
  editingEventId = id;
  const modal = document.getElementById('eventModal');
  if (!modal) return;
  document.getElementById('eventModalTitle').textContent = 'Edit Event';
  document.getElementById('eventTitle').value = ev.title;
  document.getElementById('eventDescription').value = ev.description || '';
  document.getElementById('eventDate').value = ev.date;
  document.getElementById('eventTime').value = ev.time || '';
  document.getElementById('eventEndTime').value = ev.endTime || '';
  document.getElementById('eventCategory').value = ev.category;
  modal.classList.add('open');
  playSound('click');
}

function closeEventModal() {
  document.getElementById('eventModal')?.classList.remove('open');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('calendarPage')) return;
  const user = requireAuth();
  if (!user) return;

  Calendar.init();

  document.getElementById('calPrev')?.addEventListener('click', () => { Calendar.prev(); playSound('click'); });
  document.getElementById('calNext')?.addEventListener('click', () => { Calendar.next(); playSound('click'); });
  document.getElementById('calToday')?.addEventListener('click', () => { Calendar.today(); playSound('click'); });

  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-view]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      Calendar.view = btn.dataset.view;
      document.getElementById('calGrid').style.gridTemplateColumns = '';
      Calendar.render();
      playSound('click');
    });
  });

  document.getElementById('addEventBtn')?.addEventListener('click', () => openAddEventModal(Calendar.selectedDate));

  const eventForm = document.getElementById('eventForm');
  if (eventForm) {
    eventForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = {
        title: document.getElementById('eventTitle').value.trim(),
        description: document.getElementById('eventDescription').value.trim(),
        date: document.getElementById('eventDate').value,
        time: document.getElementById('eventTime').value,
        endTime: document.getElementById('eventEndTime').value,
        category: document.getElementById('eventCategory').value
      };
      if (!data.title || !data.date) { Toast.show('Title and date required', 'error'); return; }
      if (editingEventId) {
        CalendarManager.update(editingEventId, data);
        Toast.show('Event updated!', 'success');
      } else {
        CalendarManager.add(data);
        Toast.show('Event added! 📅', 'success');
      }
      closeEventModal();
      playSound('success');
      Calendar.render();
      Calendar.renderEventsList();
    });
  }

  document.getElementById('closeEventModal')?.addEventListener('click', closeEventModal);
  document.getElementById('eventModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'eventModal') closeEventModal();
  });
});
