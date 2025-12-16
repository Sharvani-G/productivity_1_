// Fetch and render today's todos for the authenticated user
// Helper used by both DOMContentLoaded and manual invocation from DevTools
async function fetchTodosForToday() {
  try {
    const container = document.getElementById('todo');
    if (!container) return null;

    const token = localStorage.getItem('authToken');
    if (!token) {
      console.log('index-todo: no auth token present (anonymous user)');
      return null; // quiet for anonymous users
    }

    // compute weekKey (Monday of current week) — same logic as planner.js
    const today = new Date();
    const day = today.getDay(); // Sun=0 .. Sat=6
    const tosubtractdays = day === 0 ? -6 : 1 - day; // Monday as start
    const monday = new Date(today);
    monday.setDate(today.getDate() + tosubtractdays);
    const weekKey = monday.toISOString().split('T')[0];

    // compute dayIndex where Monday=0, Sunday=6
    const dayIndex = day === 0 ? 6 : day - 1;

    const res = await fetch(`/api/tasks/${weekKey}`, { headers: { 'Authorization': 'Bearer ' + token } });
    if (!res.ok) {
      console.log('index-todo: fetch returned', res.status);
      return null; // silently ignore errors (keep UI unchanged)
    }
    const days = await res.json();
    // visible debug log for developers (no UI change)
    console.log('index-todo fetched', { weekKey, dayIndex, days });

    // Ensure we don't modify the existing header/paragraph — append a UL after them
    let list = container.querySelector('ul.todo-list');
    if (!list) {
      list = document.createElement('ul');
      list.className = 'todo-list';
      container.appendChild(list);
    }
    list.innerHTML = '';

    const todays = days && days[dayIndex] ? days[dayIndex] : [];
    if (!todays.length) {
      const li = document.createElement('li');
      li.textContent = 'No tasks for today.';
      li.className = 'todo-empty';
      list.appendChild(li);
      return days;
    }

    todays.forEach(task => {
      const li = document.createElement('li');
      const status = task.status ? ` [${task.status}]` : '';
      li.textContent = `${task.text}${status}`;
      list.appendChild(li);
    });

    return days;
  } catch (e) {
    // Keep UI untouched on any unexpected error
    console.warn('todo widget error', e && e.message ? e.message : e);
    return null;
  }
}

// Expose helper for manual testing from DevTools
window.fetchTodosForToday = fetchTodosForToday;

// Auto-run on page load (keeps behaviour unchanged)
document.addEventListener('DOMContentLoaded', () => { fetchTodosForToday().catch(() => {}); });

// Dev-only visible trigger (hidden by default). Enable by setting localStorage.showTodoDev = '1'
function maybeAddDevButton(){
  try{
    if (localStorage.getItem('showTodoDev') !== '1') return;
    const container = document.getElementById('todo');
    if (!container) return;
    if (container.querySelector('.todo-dev-btn')) return; // already added
    const btn = document.createElement('button');
    btn.className = 'todo-dev-btn';
    btn.style.marginTop = '8px';
    btn.style.padding = '6px 10px';
    btn.style.fontSize = '13px';
    btn.textContent = 'Refresh To-Do (dev)';
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      const r = await fetchTodosForToday();
      console.log('fetchTodosForToday (button) result:', r);
      btn.disabled = false;
    });
    container.appendChild(btn);
  }catch(e){ /* ignore */ }
}

document.addEventListener('DOMContentLoaded', () => { maybeAddDevButton(); });
