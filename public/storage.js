/**
 * Utility functions for interacting with the task API endpoints.
 * All functions rely on the JWT 'token' being set in localStorage.
 */

function getToken() {
    return localStorage.getItem('token');
}

// Helper for authorized API calls
async function fetchAuthorized(url, method = 'GET', body = null) {
    const token = getToken();
    if (!token) {
        // Redirect to login if no token is found
        window.location.href = '/login';
        throw new Error('Unauthorized: No token found. Redirecting...');
    }
    
    const headers = {
        'Authorization': `Bearer ${token}`,
    };
    if (body) {
        headers['Content-Type'] = 'application/json';
    }

    const options = {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    };

    const response = await fetch(url, options);

    if (response.status === 401) {
        // If the token is invalid or expired
        localStorage.removeItem('token');
        window.location.href = '/login';
        throw new Error('Session expired. Redirecting...');
    }

    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(`API Error: ${response.status} - ${errorBody.message}`);
    }
    
    // Attempt to return JSON, fall back to empty object for successful DELETEs
    return response.json().catch(() => ({})); 
}

/**
 * Loads the tasks for a specific week from the backend.
 * Uses GET /api/tasks/:weekKey.
 */
export async function loadTasksFromBackend(weekKey) {
    // The API returns the `days` object directly (e.g., { 0: [...tasks], 1: [...] })
    const data = await fetchAuthorized(`/api/tasks/${weekKey}`, 'GET');
    return data || {};
}

/**
 * Saves the entire week's task object to the backend (upsert).
 * Uses POST /api/tasks/:weekKey.
 */
export async function saveTasksToBackend(weekKey) {
    // Get the current local state of the tasks for the week
    const days = window.tasksByWeek[weekKey];
    return fetchAuthorized(`/api/tasks/${weekKey}`, 'POST', { days });
}

/**
 * Deletes a single task from the backend.
 * Uses DELETE /api/tasks/:weekKey/:dayIndex/:taskId.
 */
export async function deleteTaskFromBackend(weekKey, dayIndex, taskId) {
    return fetchAuthorized(`/api/tasks/${weekKey}/${dayIndex}/${taskId}`, 'DELETE');
}

/**
 * Updates a single task (text and status) on the backend.
 * Uses PUT /api/tasks/:weekKey/:dayIndex/:taskId.
 */
export async function updateTaskOnBackend(weekKey, dayIndex, taskId, text, status) {
    const apiStatus = status.toLowerCase().replace(' ', '-');
    return fetchAuthorized(`/api/tasks/${weekKey}/${dayIndex}/${taskId}`, 'PUT', { text, status: apiStatus });
}

/**
 * Clears an entire week by deleting the Week document.
 * Uses DELETE /api/tasks/:weekKey.
 */
export async function clearWeekOnBackend(weekKey) {
    return fetchAuthorized(`/api/tasks/${weekKey}`, 'DELETE');
}