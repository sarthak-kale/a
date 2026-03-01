// ==================== NOTIFICATIONS ====================
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function sendNotification(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(`AXION: ${title}`, { body });
  }
}

function checkOverdueTasks() {
  const tasks = Store.get(KEYS.tasks, []);
  const overdue = tasks.filter(t => !t.done && t.dueDate && new Date(t.dueDate) < new Date());
  if (overdue.length > 0) {
    sendNotification('Overdue Tasks', `You have ${overdue.length} overdue task(s)`);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  requestNotificationPermission();
});
