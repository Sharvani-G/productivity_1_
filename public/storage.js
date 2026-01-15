// public/storage.js

// Helper to get the latest token from storage
const getAuthHeader = () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export async function loadTasksFromBackend(weekKey) {
  try {
    const response = await fetch(`/api/tasks/${weekKey}`, {
      headers: getAuthHeader()
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
    // If days isn't passed directly, try to get it from the global store
    const dataToSend = days || (window.tasksByWeek && window.tasksByWeek[weekKey]) || {};
    
    const response = await fetch(`/api/tasks/${weekKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({ days: dataToSend })
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
      headers: getAuthHeader()
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
      headers: getAuthHeader()
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    console.log('✅ Task deleted from backend');
    return true;
  } catch (e) {
    console.error('Failed to delete task from backend:', e.message);
    return false;
  }
}

export async function updateTaskOnBackend(weekKey, dayIndex, taskId, text, status) {
  try {
    const response = await fetch(`/api/tasks/${weekKey}/${dayIndex}/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({ text, status })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    console.log('✅ Task updated on backend');
    return true;
  } catch (e) {
    console.error('Failed to update task on backend:', e.message);
    return false;
  }
}