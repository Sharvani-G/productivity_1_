// Frontend API wrapper for tasks - communicates with backend
// Used by weekly planner (main.js, ui.js)

const token = localStorage.getItem('token') || sessionStorage.getItem('token');

export async function loadTasksFromBackend(weekKey) {
  try {
    const response = await fetch(`/api/tasks/${weekKey}`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    if (!response.ok) {
      if (response.status === 404) return { days: {} };
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (e) {
    console.warn('Failed to load tasks from backend:', e.message);
    return { days: {} };
  }
}

export async function saveTasksToBackend(weekKey, days) {
  try {
    const response = await fetch(`/api/tasks/${weekKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ days })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    console.log('✅ Tasks saved to backend');
    return true;
  } catch (e) {
    console.error('Failed to save tasks to backend:', e.message);
    return false;
  }
}

export async function clearWeekOnBackend(weekKey) {
  try {
    const response = await fetch(`/api/tasks/${weekKey}`, {
      method: 'DELETE',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    console.log('✅ Week cleared on backend');
    return true;
  } catch (e) {
    console.error('Failed to clear week on backend:', e.message);
    return false;
  }
}

export async function deleteTaskFromBackend(weekKey, dayIndex, taskId) {
  try {
    const response = await fetch(`/api/tasks/${weekKey}/${dayIndex}/${taskId}`, {
      method: 'DELETE',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    console.log('✅ Task deleted from backend');
    return true;
  } catch (e) {
    console.error('Failed to delete task from backend:', e.message);
    return false;
  }
}

export async function updateTaskOnBackend(weekKey, dayIndex, taskId, updatedFields) {
  try {
    const response = await fetch(`/api/tasks/${weekKey}/${dayIndex}/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(updatedFields)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    console.log('✅ Task updated on backend');
    return true;
  } catch (e) {
    console.error('Failed to update task on backend:', e.message);
    return false;
  }
}
