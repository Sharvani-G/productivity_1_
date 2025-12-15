# Developer Quick Reference

## API Endpoints

### GET /api/tasks/:weekKey
Fetches all tasks for a given week
```
GET /api/tasks/2025-11-10
Returns: { 0: [...], 1: [...], ... }  (object with day indices as keys)
```

### POST /api/tasks/:weekKey
Saves all tasks for a week (bulk update)
```
POST /api/tasks/2025-11-10
Body: { "days": { 0: [...], 1: [...], ... } }
Returns: { success: true, weekKey, days: {...} }
```

### PUT /api/tasks/:weekKey/:dayIndex/:taskId
Updates a specific task
```
PUT /api/tasks/2025-11-10/0/task_1234567890_abc
Body: { "text": "Updated task", "status": "Completed" }
Returns: { success: true, task: {...} }
```

### DELETE /api/tasks/:weekKey/:dayIndex/:taskId
Deletes a specific task
```
DELETE /api/tasks/2025-11-10/0/task_1234567890_abc
Returns: { success: true, days: {...} }
```

---

## Task Object Structure

```javascript
{
  id: "task_1234567890_xyz",      // Unique identifier
  text: "Complete project",        // Task description
  status: "In Process"            // "Completed" | "Abandoned" | "In Process"
}
```

---

## Global State (`window.tasksByWeek`)

```javascript
// Structure:
{
  "2025-11-10": {
    0: [{ id: "...", text: "...", status: "..." }],  // Monday
    1: [{ id: "...", text: "...", status: "..." }],  // Tuesday
    // ... etc for 7 days
  }
}
```

---

## Key Functions

### From `storage.js`:
```javascript
loadTasksFromBackend(weekKey)           // GET tasks
saveTasksToBackend(weekKey)             // POST all tasks
deleteTaskFromBackend(weekKey, dayIndex, taskId)  // DELETE task
updateTaskOnBackend(weekKey, dayIndex, taskId, text, status)  // PUT task
clearWeekOnBackend(weekKey)             // DELETE entire week
```

### From `ui.js`:
```javascript
updateWeekUI(tasksForWeek, weekKey)     // Render week UI
createTaskCard(text, status, id, dayIndex)  // Create task element
getPresentWeek(date)                    // Get Monday of week
formatWeekKey(date)                     // Convert to YYYY-MM-DD
```

### From `main.js`:
```javascript
window.loadAndRenderWeek(dateObj)       // Load & render any week
window.saveCurrentWeek()                // Save current week
window.clearCurrentWeek()               // Clear current week
```

---

## Common Tasks

### Add Event Listener to All Task Buttons
```javascript
document.querySelectorAll('.task-card button').forEach(btn => {
  btn.addEventListener('click', (e) => {
    // Your handler
  });
});
```

### Get Current Week Data
```javascript
const weekKey = window.currentWeekKey;
const tasksThisWeek = window.tasksByWeek[weekKey];
console.log(tasksThisWeek);
```

### Get All Tasks for a Specific Day
```javascript
const dayIndex = 0; // Monday
const tasksMonday = window.tasksByWeek[window.currentWeekKey][dayIndex];
```

### Manually Trigger UI Update
```javascript
await window.loadAndRenderWeek(new Date());
```

---

## Debugging Tips

### Check if tasks loaded:
```javascript
console.log('Current week:', window.currentWeekKey);
console.log('All tasks:', window.tasksByWeek);
console.log('This week:', window.tasksByWeek[window.currentWeekKey]);
```

### Monitor API calls:
1. Open DevTools (F12)
2. Go to Network tab
3. Perform action (add/edit/delete task)
4. Check if request succeeded (green status code)

### Check browser errors:
1. Open DevTools (F12)
2. Go to Console tab
3. Look for red error messages
4. Click to see full stack trace

---

## CSS Classes

### Task Card Status Colors
- `.task-card.completed` - Green background
- `.task-card.abandoned` - Red background
- `.task-card.in-process` - Yellow background
- `.task-card.default` - Blue background

### Examples:
```css
.task-card.completed {
    background-color: rgba(0, 200, 0, 0.3);
}
```

---

## Common Errors & Solutions

| Error | Cause | Fix |
|-------|-------|-----|
| "Failed to save task" | Server not responding | Check server is running |
| Task disappears after refresh | Backend not called | Verify API endpoints |
| Edit button not working | Missing `updateTaskOnBackend` | Check storage.js imports |
| Delete confirmation not showing | Missing confirm dialog | Check createTaskCard function |
| Task ID undefined | Empty `id` parameter | Use generated ID if null |

---

## Testing in Console

```javascript
// Manually create a task
const taskId = 'task_' + Date.now();
const weekKey = window.currentWeekKey;
const dayIndex = 0;

window.tasksByWeek[weekKey][dayIndex].push({
  id: taskId,
  text: 'Test task',
  status: 'In Process'
});

// Save to backend
await window.saveCurrentWeek();

// Reload UI
await window.loadAndRenderWeek(new Date());
```

---

## Performance Notes

- Week data is stored in memory (`window.tasksByWeek`)
- Each task renders as a separate DOM element
- Limit to ~50 tasks per day for optimal performance
- Large payload (>100 tasks/week) may cause UI lag
- Consider pagination if exceeding 200 tasks per week

---

**Last Updated:** November 11, 2025
