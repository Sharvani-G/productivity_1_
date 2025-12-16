// public/js/index-todo.js - Corrected to match weekly tracker's date AND day index logic

/**
 * Gets the Monday of the current week, consistent with public/main.js.
 * Defines the week as starting on Monday.
 * @param {Date} date 
 * @returns {Date} The Date object for the Monday of that week.
 */
function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    // d.getDate() - day: brings it to Sunday (day 0)
    // + (day === 0 ? -6 : 1): adjusts it to Monday
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
    d.setDate(diff);
    // Reset time to start of day to ensure consistency
    d.setHours(0, 0, 0, 0); 
    return d;
}

/**
 * Formats the Date object into the YYYY-MM-DD format used as the weekKey.
 * @param {Date} date 
 * @returns {string} Week key string (e.g., '2025-12-15')
 */
function formatWeekKey(date) {
    // We expect the date to be the Monday of the week
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Calculates the current week's details using the Monday-based key.
 * @returns {object} { weekKey: 'YYYY-MM-DD', dayIndex: 0-6 (0=Mon, 6=Sun) }
 */
function getCurrentWeekDetails() {
    const date = new Date();
    // JS getDay() returns 0 for Sunday, 1 for Monday, ..., 6 for Saturday.
    const jsDayIndex = date.getDay(); 
    
    // FIX: Convert JS day index (0=Sun, 1=Mon, 2=Tue, ..., 6=Sat) 
    // to the Tracker's UI index (0=Mon, 1=Tue, 2=Wed, ..., 6=Sun).
    // The formula (dayIndex + 6) % 7 performs this shift.
    const trackerDayIndex = (jsDayIndex + 6) % 7;

    // Get the Monday of the current week (which is used as the weekKey)
    const monday = getMonday(date);
    const weekKey = formatWeekKey(monday);

    return { 
        weekKey: weekKey, 
        // Use the corrected day index (0=Mon, 6=Sun) to match how tasks were saved
        dayIndex: trackerDayIndex 
    };
}

/**
 * Renders the tasks into the given container element. 
 * @param {Array<Object>} tasks - The list of tasks.
 * @param {HTMLElement} container - The DOM element to render into.
 */
function renderTasks(tasks, container) {
    container.innerHTML = ''; 

    if (tasks.length === 0) {
        container.innerHTML = '<p>🎉 No tasks scheduled for today. Time to relax or <a href="/weekly">add some</a>!</p>';
        return;
    }

    const ul = document.createElement('ul');

    tasks.forEach(task => {
        const li = document.createElement('li');
        // Simple display: task text and status
        const statusText = task.status === 'completed' ? '✅' : '⏳';
        li.innerHTML = `${statusText} ${task.text}`;
        
        // Apply minimal style for completed tasks
        if (task.status === 'completed') {
            li.style.textDecoration = 'line-through';
            li.style.opacity = '0.7';
        }
        
        ul.appendChild(li);
    });

    container.appendChild(ul);
}

/**
 * Fetches the current day's tasks for the authenticated user and renders them.
 */
async function loadCurrentDayTasks() {
    const tasksContainer = document.getElementById('current-day-tasks');
    if (!tasksContainer) return; 

    // 1. Check for user authentication token
    const token = localStorage.getItem('token');
    if (!token) {
        tasksContainer.innerHTML = '<p>Please <a href="/login" style="color: #72cfd7ff;">log in</a> to see your daily tasks.</p>';
        return;
    }

    // 2. Get the date keys using the unified logic
    const { weekKey, dayIndex } = getCurrentWeekDetails();

    tasksContainer.innerHTML = '<p>Loading today\'s tasks...</p>';

    try {
        // 3. Fetch data from the API
        const response = await fetch(`/api/tasks/${weekKey}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 401) {
             tasksContainer.innerHTML = '<p>Session expired. Please <a href="/login">log in</a> again.</p>';
             localStorage.removeItem('token');
             return;
        }

        if (!response.ok) {
            // This happens if the week simply doesn't exist in the DB
            tasksContainer.innerHTML = '<p>No tasks saved for this week.</p>';
            return;
        }

        // 4. Extract tasks for the current day
        const days = await response.json();
        
        // The day index key is a string (0=Mon, 6=Sun)
        const todayTasks = days[String(dayIndex)] || [];

        // 5. Render the tasks
        renderTasks(todayTasks, tasksContainer);

    } catch (error) {
        console.error('Fetch error:', error);
        tasksContainer.innerHTML = '<p>A network error occurred while fetching tasks.</p>';
    }
}

// Execute the function when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', loadCurrentDayTasks);
window.addEventListener('pageshow', loadCurrentDayTasks); // <-- ADD THIS LINE