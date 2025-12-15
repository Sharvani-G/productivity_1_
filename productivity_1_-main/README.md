# Productivity Tracker 📅

A full-stack weekly planner application with task management, persistence, and real-time sync.

## ✨ Features

- ✅ **Create & Manage Tasks** — Add tasks to each day of the week
- ✅ **Edit Tasks** — Modify existing tasks with status tracking
- ✅ **Delete Tasks** — Remove tasks with confirmation
- ✅ **Task Status** — Mark tasks as Completed, In Process, or Abandoned
- ✅ **Persistent Storage** — All tasks saved to MongoDB
- ✅ **Auto-Load** — Tasks automatically load on page refresh
- ✅ **Real-time Sync** — Changes sync instantly with backend
- ✅ **Responsive UI** — Works on desktop and mobile

## 🚀 Quick Start

### Prerequisites
- Node.js (v14+)
- MongoDB (local or Atlas)

### Setup

```bash
# Clone and enter the project
cd producti-master/producti-master

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Fill in MONGODB_URI in .env
# Example: MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/productivity

# Start development server
npm run dev
```

Server runs at **http://localhost:4000**

Visit `/weekly` for the weekly planner.

## 📚 Documentation

All documentation is in the `docs/` folder:

| File | Purpose |
|------|---------|
| [QUICKSTART.md](docs/QUICKSTART.md) | Step-by-step setup guide |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design & component overview |
| [DEVELOPER_REFERENCE.md](docs/DEVELOPER_REFERENCE.md) | API endpoints & code reference |
| [IMPLEMENTATION_SUMMARY.md](docs/IMPLEMENTATION_SUMMARY.md) | What was implemented |
| [CHANGELOG.md](docs/CHANGELOG.md) | Version history & changes |
| [VERIFICATION_CHECKLIST.md](docs/VERIFICATION_CHECKLIST.md) | Testing checklist |
| [BEFORE_AFTER.md](docs/BEFORE_AFTER.md) | Comparison of changes |
| [AT_A_GLANCE.md](docs/AT_A_GLANCE.md) | High-level overview |
| [ACTION_PLAN.md](docs/ACTION_PLAN.md) | Implementation plan |
| [COMPLETE_REPORT.md](docs/COMPLETE_REPORT.md) | Detailed technical report |
| [SUMMARY.md](docs/SUMMARY.md) | Executive summary |
| [INDEX.md](docs/INDEX.md) | Full documentation index |

## 🛠️ Tech Stack

**Backend:**
- Node.js + Express
- MongoDB + Mongoose
- Security: Helmet, Rate Limiting, XSS Protection

**Frontend:**
- Vanilla JavaScript (ES Modules)
- EJS Templates
- CSS Grid for responsive layout

## 📁 Project Structure

```
producti-master/
├── server.js              # Express server & API endpoints
├── models/
│   └── Week.js           # MongoDB schema for weeks & tasks
├── public/
│   ├── main.js           # App initialization & page load logic
│   ├── storage.js        # Backend API wrappers
│   ├── ui.js             # UI rendering & task card creation
│   ├── index.css         # Styling
│   └── planner.js        # (legacy)
├── views/
│   ├── weekly.ejs        # Weekly planner page
│   └── ...other pages
├── docs/                 # Documentation (this folder!)
├── package.json
└── .env                  # Environment config (not in git)
```

## 🔌 API Endpoints

### Get Tasks for a Week
```
GET /api/tasks/:weekKey
```
Returns tasks for the given week (weekKey = YYYY-MM-DD of Monday).

### Save/Create Tasks
```
POST /api/tasks/:weekKey
Body: { "days": { "0": [...tasks], "1": [...tasks], ... } }
```
Upserts entire week's tasks.

### Update Single Task
```
PUT /api/tasks/:weekKey/:dayIndex/:taskId
Body: { "text": "...", "status": "..." }
```
Updates a specific task.

### Delete Single Task
```
DELETE /api/tasks/:weekKey/:dayIndex/:taskId
```
Deletes a task.

### Clear Week
```
DELETE /api/tasks/:weekKey
```
Deletes all tasks for a week.

## 💾 Environment Variables

Create `.env` file:

```env
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/productivity
MONGODB_DB=productivity
PORT=4000
API=your-api-ninjas-key-here
```

## 🧪 Testing

1. **Add a task** — Type text, select status, click Save
2. **Edit a task** — Click Edit, change text/status, click Save
3. **Delete a task** — Click Delete, confirm
4. **Reload page** — Tasks should persist ✅
5. **Navigate weeks** — Use arrow buttons to move between weeks

## 🐛 Troubleshooting

**Tasks not appearing after reload?**
- Check MongoDB connection in server logs
- Verify MONGODB_URI in .env
- Open DevTools → Network tab → check /api/tasks/:weekKey response

**Can't save tasks?**
- Check server console for errors
- Ensure MongoDB is running
- Verify API endpoint paths

**Port already in use?**
- Change PORT in .env
- Or kill process: `lsof -i :4000 | kill -9 $(lsof -ti :4000)`

## 📝 License

MIT

---

**For detailed documentation, see the [docs/](docs/) folder!**
