# Notes App - Database Integration Guide

## Overview

The Notes application now uses **MongoDB** for persistent storage with full user authentication. This makes it ready for production deployment.

## Architecture

```
Frontend (notes.ejs) → API Client (api.js) → Backend API (server.js) → MongoDB
                                                    ↓
                                           User Authentication
```

## Data Flow

### Adding a Note
1. User enters note text and selects category
2. Frontend calls `NotesAPI.add(noteObject)`
3. API wrapper sends `POST /api/notes` with authentication
4. Server saves to MongoDB with user ID
5. Frontend reloads notes from server
6. UI updates with new note

### Editing a Note
1. User clicks edit button (✏️)
2. Modal opens with note text
3. User saves changes
4. Frontend calls `NotesAPI.update(noteId, {text: ...})`
5. API sends `PUT /api/notes/{id}` with authentication
6. Server updates MongoDB document
7. Frontend reloads and renders

### Authentication

Notes API requires authentication token in header:
```
Authorization: Bearer <jwt_token>
```

Tokens are obtained from login endpoint and stored in:
- `localStorage.authToken` (persistent)
- `sessionStorage.authToken` (session-only)

## API Endpoints

### GET /api/notes
Retrieve all notes for authenticated user.

**Request:**
```
Headers: Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "_id": "123abc",
    "text": "Buy groceries",
    "category": "Personal",
    "color": "#fecaca",
    "pinned": false,
    "tags": [],
    "todos": [],
    "createdAt": "2025-01-14T10:30:00Z",
    "user": "user_id"
  }
]
```

### POST /api/notes
Create a new note.

**Request:**
```json
{
  "text": "Buy groceries",
  "category": "Personal",
  "tags": [],
  "color": "#fecaca",
  "todos": []
}
```

**Response:** Returns the created note object with `_id`

### PUT /api/notes/:id
Update an existing note.

**Request:**
```json
{
  "text": "Updated text",
  "category": "Work",
  "pinned": true,
  "color": "#fed7aa"
}
```

**Response:** Returns updated note object

### DELETE /api/notes/:id
Delete a note.

**Response:**
```json
{ "success": true }
```

## Offline Support

The app includes offline fallback:

1. **Online**: Notes sync with MongoDB
2. **Offline**: Changes saved to `notes_cache` in localStorage
3. **Reconnect**: Full sync when connection restored

Console messages indicate status:
- ✅ "Note saved to database" - successfully synced
- ⚠️ "Note saved locally" - offline mode, will sync later

## Deployment Checklist

### Environment Variables
```env
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/dbname
MONGODB_DB=productivity
JWT_SECRET=your-secret-key-change-this
PORT=4000
```

### Database Setup
1. MongoDB Atlas cluster created
2. Database named `productivity`
3. Collections auto-created by Mongoose:
   - `users` - user accounts
   - `notes` - note documents
   - `weeks` - tasks (existing)

### Indexes
Automatically created by server.js:
- `notes` collection: `{ user: 1, createdAt: -1 }`
- `notes` collection: `{ user: 1, category: 1 }`

### Security
- ✅ JWT authentication required for notes API
- ✅ User-scoped queries (user._id filter)
- ✅ No cross-user data leakage
- ✅ HTTPS recommended for production
- ✅ Helmet.js security headers

## Troubleshooting

### Notes not appearing
1. Check authentication token is valid
2. Verify MongoDB connection: `console.log(mongoose.connection.readyState)`
3. Check browser console for API errors
4. Verify user has notes in MongoDB:
   ```bash
   db.notes.find({ user: ObjectId("...") })
   ```

### Changes not saving
1. Check network tab for failed requests
2. Verify JWT token not expired
3. Check server logs for validation errors
4. Ensure MONGODB_URI is correct

### Offline mode staying active
1. Clear browser cache
2. Check if server is reachable
3. Verify `/api/notes` returns 200 status

## Database Queries for Debugging

```javascript
// Find user's notes
db.notes.find({ user: ObjectId("userId") })

// Count notes by category
db.notes.aggregate([
  { $match: { user: ObjectId("userId") } },
  { $group: { _id: "$category", count: { $sum: 1 } } }
])

// Find pinned notes
db.notes.find({ user: ObjectId("userId"), pinned: true })

// Delete all test notes
db.notes.deleteMany({ user: ObjectId("userId"), text: /^test/ })
```

## Performance Optimization

- Notes sorted by `createdAt` descending (newest first)
- Category index for fast filtering
- `.lean()` queries in production (no Mongoose overhead)
- Pagination can be added:

```javascript
app.get("/api/notes", requireAuth, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const skip = (page - 1) * limit;
  
  const notes = await Note.find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  
  res.json(notes);
});
```

## Future Enhancements

- [ ] Sharing notes with other users
- [ ] Note collaboration/comments
- [ ] Full-text search across all notes
- [ ] Note versioning/history
- [ ] Export to PDF/Word
- [ ] Mobile app sync via API
