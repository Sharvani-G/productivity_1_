# Task Management Workflow & Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Browser)                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ UI Layer (ui.js)                                     │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ • createTaskCard() - renders task elements           │   │
│  │ • updateWeekUI() - renders entire week              │   │
│  │ • Event handlers (Edit, Delete, Save)               │   │
│  └──────────────────────────────────────────────────────┘   │
│           ↓                           ↓                       │
│  ┌──────────────────┐      ┌──────────────────────────────┐ │
│  │ State (main.js)  │      │ Storage Module (storage.js)  │ │
│  ├──────────────────┤      ├──────────────────────────────┤ │
│  │ tasksByWeek[..] │       │ loadTasks()                  │ │
│  │ currentDate     │       │ saveTasks()                  │ │
│  │ currentWeekKey  │       │ deleteTask() [NEW]           │ │
│  └──────────────────┘      │ updateTask() [NEW]           │ │
│           ↓                  └──────────────────────────────┘ │
│           └──────────────────────────┬──────────────────────┘ │
│                                      ↓                        │
│                        HTTP Requests (fetch API)             │
│                                      ↓                        │
├─────────────────────────────────────────────────────────────┤
│                      Network Layer (HTTP)                     │
├─────────────────────────────────────────────────────────────┤
│ GET /api/tasks/:weekKey                                      │
│ POST /api/tasks/:weekKey                                     │
│ PUT /api/tasks/:weekKey/:dayIndex/:taskId [NEW]             │
│ DELETE /api/tasks/:weekKey/:dayIndex/:taskId [NEW]          │
├─────────────────────────────────────────────────────────────┤
│                  Backend (Express.js)                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ API Routes (server.js)                               │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ app.get() - fetch week tasks                         │   │
│  │ app.post() - save week                               │   │
│  │ app.put() - update single task [NEW]                 │   │
│  │ app.delete() - delete single task [NEW]              │   │
│  └──────────────────────────────────────────────────────┘   │
│           ↓                                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Mongoose Models (models/Week.js)                     │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ weekKey: String (unique index)                       │   │
│  │ days: Object { 0: [...], 1: [...], etc }           │   │
│  │ timestamps: createdAt, updatedAt                     │   │
│  └──────────────────────────────────────────────────────┘   │
│           ↓                                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ MongoDB Database                                     │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ weeks collection                                     │   │
│  │ {                                                    │   │
│  │   weekKey: "2025-11-10",                            │   │
│  │   days: {                                            │   │
│  │     0: [                                             │   │
│  │       {                                              │   │
│  │         id: "task_123...",                           │   │
│  │         text: "Complete project",                    │   │
│  │         status: "In Process"                         │   │
│  │       }                                              │   │
│  │     ],                                               │   │
│  │     1: [...]                                         │   │
│  │   }                                                  │   │
│  │ }                                                    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## User Action Flows

### 1️⃣ Adding a New Task

```
User Action: Click "+ Task" button on day
        ↓
Frontend: createTaskCard(empty) creates new DOM element
        ↓
User enters task text and selects status
        ↓
User clicks "Save" button
        ↓
Frontend: Validate input (non-empty?)
        ↓
Frontend: Disable buttons, show "Saving..."
        ↓
API Call: PUT /api/tasks/:weekKey/:dayIndex/:taskId
        ↓
Backend: Find/Create week, add task to days[dayIndex]
        ↓
Database: MongoDB saves updated week document
        ↓
Response: { success: true, task: {...} }
        ↓
Frontend: Update DOM to show "Edit" button
        ↓
Frontend: Update local state (window.tasksByWeek)
        ↓
Frontend: Show success toast "Task saved successfully"
        ↓
UI: Task card now shows as completed with proper color
```

### 2️⃣ Loading Tasks on Page Load

```
User Action: Visit /weekly or refresh page
        ↓
Frontend: DOMContentLoaded event fires
        ↓
main.js: init() function runs
        ↓
main.js: Calculate current week's Monday (weekKey)
        ↓
API Call: GET /api/tasks/2025-11-10
        ↓
Backend: Find document with matching weekKey
        ↓
Database: MongoDB returns days object or empty {}
        ↓
Response: { 0: [...], 1: [...], ... }
        ↓
Frontend: updateWeekUI() called with fetched data
        ↓
Frontend: Loop through each day (0-6)
        ↓
Frontend: For each task in day, createTaskCard()
        ↓
UI: 7 day columns rendered with all saved tasks
        ↓
User sees: Previous tasks reappear with Edit/Delete buttons ✅
```

### 3️⃣ Editing a Task

```
User Action: Click "Edit" button on task
        ↓
Frontend: Replace task text (p tag) with input field
        ↓
Frontend: Enable status radios
        ↓
Frontend: Change button text to "Save"
        ↓
User modifies text and/or changes status
        ↓
User clicks "Save" button
        ↓
Frontend: Extract text from input field
        ↓
Frontend: Get selected status from radio button
        ↓
Frontend: Disable buttons, show "Saving..."
        ↓
API Call: PUT /api/tasks/:weekKey/:dayIndex/:taskId
          Body: { text: "New text", status: "Completed" }
        ↓
Backend: Find document and task by ID
        ↓
Backend: Update task: { id, text, status }
        ↓
Database: MongoDB saves changes
        ↓
Response: { success: true, task: {...} }
        ↓
Frontend: Replace input with text (p tag)
        ↓
Frontend: Disable radios
        ↓
Frontend: Change button back to "Edit"
        ↓
Frontend: Update local state
        ↓
UI: Task now shows updated content with new color ✅
```

### 4️⃣ Deleting a Task

```
User Action: Click "Delete" button
        ↓
Frontend: Show confirmation dialog
        ↓
User confirms deletion
        ↓
Frontend: Disable buttons, show "Deleting..."
        ↓
API Call: DELETE /api/tasks/:weekKey/:dayIndex/:taskId
        ↓
Backend: Find document and task
        ↓
Backend: Filter out task from days[dayIndex]
        ↓
Database: MongoDB saves week without task
        ↓
Response: { success: true, days: {...} }
        ↓
Frontend: Remove task element from DOM
        ↓
Frontend: Update local state (filter out task)
        ↓
UI: Task card disappears ✅
        ↓
Frontend: Show success toast "Task deleted successfully"
```

### 5️⃣ Navigating Between Weeks

```
User Action: Click "<" (previous week) or ">" (next week)
        ↓
main.js: Adjust window.currentDate by ±7 days
        ↓
main.js: Call window.loadAndRenderWeek(newDate)
        ↓
main.js: Calculate new weekKey (Monday of week)
        ↓
API Call: GET /api/tasks/:newWeekKey
        ↓
Backend: Fetch tasks for new week
        ↓
Response: { 0: [...], 1: [...], ... } or {}
        ↓
Frontend: updateWeekUI() renders new week
        ↓
UI: All 7 day columns show tasks from new week ✅
```

---

## Data Synchronization Flow

### Frontend ↔ Backend Sync

```
           Frontend State                Backend State
          (window.tasksByWeek)          (MongoDB)
                ↓                             ↓
         Local Memory                    Persistent DB
                ↓                             ↓
         Can be lost if              Survives browser
         browser crashes              refresh/close
                ↓                             ↓
         Fast (no network)            Slower (HTTP+DB)
                ↓                             ↓
    Used for immediate UI updates   Source of truth
```

### Consistency Guarantees

```
Operation                  Frontend Update      Backend Update
─────────────────────────────────────────────────────────────
Add Task (Save)            Immediate            After response
Edit Task (Save)           Immediate            After response
Delete Task                Immediate            After response
Navigate Week              Reload from Backend  Read from DB
Page Refresh               Load from Backend    Read from DB
Browser Crash              Lost                 Intact ✅
```

---

## Error Handling Flow

```
User Action (Add/Edit/Delete Task)
        ↓
Frontend: Send API request
        ↓
        ┌─────────────────────┐
        ↓                     ↓
    ✅ Success            ❌ Error
        ↓                     ↓
   Response OK          Network Error?
        ↓                     ↓
Update UI            Check Connection
Update State         Show Error Toast
Show Success Toast   Restore Buttons
                    User can retry ⚠️

Exception: When backend returns error response
  ↓
Catch in try-catch block
  ↓
Disable buttons → false
  ↓
Show error message: "Failed to [action]"
  ↓
Log error to console for debugging
```

---

## Key Improvements Implemented

| Feature | Before | After |
|---------|--------|-------|
| Load on Refresh | ❌ Blank | ✅ All tasks load |
| Edit Capability | 🟡 Limited | ✅ Full modal editing |
| Delete Feature | ❌ None | ✅ Confirmed delete |
| Button States | 🟡 Always clickable | ✅ Disable while loading |
| Error Messages | ❌ Silent fail | ✅ Toast notifications |
| Input Validation | 🟡 Basic | ✅ Comprehensive |
| Unique Task IDs | 🟡 Text-based | ✅ Timestamp-based |
| Database Sync | 🟡 Partial | ✅ Full CRUD |

---

## Testing Scenarios

### ✅ Happy Path
1. Add task → Refresh → Task still there
2. Edit task text → See changes immediately
3. Edit status → Card color changes
4. Delete task → Gone from UI and DB
5. Navigate weeks → Tasks preserved

### ⚠️ Edge Cases
1. Rapid clicking Save/Delete → Buttons disabled
2. Network timeout → Error message shown
3. Empty task submission → Validation error
4. Add task, delete without saving → Works
5. Multiple weeks with same task → Correct day isolation

### 🔴 Error Scenarios
1. Backend offline → "Failed to save task"
2. Invalid task ID → 404 response
3. Corrupted database → Graceful error
4. Browser console errors → Logged for debugging

---

**Last Updated:** November 11, 2025
