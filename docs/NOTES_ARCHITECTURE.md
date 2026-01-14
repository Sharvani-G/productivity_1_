# Notes Application - Complete Technical Documentation

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Browser)                        │
│                                                                   │
│  views/notes.ejs                                                │
│    ├─ HTML form (textarea, buttons)                             │
│    ├─ Edit modal                                                │
│    └─ Script imports: api.js, notes_app.js                     │
│                                                                   │
│  public/notes_app/js/api.js                                    │
│    ├─ NotesAPI wrapper class                                   │
│    ├─ fetch() calls to /api/notes endpoints                   │
│    ├─ JWT authorization header handling                        │
│    ├─ localStorage caching for offline                         │
│    └─ Error handling & fallback                                │
│                                                                   │
│  public/notes_app/js/notes_app.js                              │
│    ├─ Event listeners (add, edit, delete, pin)                │
│    ├─ render() function for UI updates                        │
│    ├─ Async functions with await                              │
│    ├─ Search & filter logic                                   │
│    └─ Theme switching                                          │
└─────────────────────────────────────────────────────────────────┘
              ↓ HTTP Requests (JSON)
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (Express)                          │
│                                                                   │
│  server.js - API Routes                                         │
│    GET    /api/notes              → getAllNotes()              │
│    POST   /api/notes              → createNote()               │
│    GET    /api/notes/:id          → getNote()                 │
│    PUT    /api/notes/:id          → updateNote()              │
│    DELETE /api/notes/:id          → deleteNote()              │
│                                                                   │
│  Middleware:                                                    │
│    requireAuth() - JWT verification                            │
│    User isolation - req.user.id filter                         │
│    Error handling & validation                                 │
└─────────────────────────────────────────────────────────────────┘
              ↓ Mongoose ODM
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE (MongoDB)                           │
│                                                                   │
│  collections:                                                   │
│    users - User accounts                                        │
│    notes - Note documents (NEW)                                │
│    weeks - Tasks (existing)                                    │
│                                                                   │
│  Note Document Structure:                                       │
│  {                                                              │
│    _id: ObjectId("..."),                                       │
│    user: ObjectId("user_id"),     // User relationship        │
│    text: "Note content",           // Required                 │
│    category: "Personal",           // Enum                     │
│    color: "#fecaca",               // Hex color              │
│    pinned: false,                  // Boolean                │
│    tags: [],                       // Array                  │
│    todos: [                        // Subtasks               │
│      { text: "...", done: false }                            │
│    ],                                                          │
│    createdAt: ISODate("..."),     // Timestamp              │
│    updatedAt: ISODate("...")      // Timestamp              │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Examples

### Creating a Note

**Step 1: User Interface**
```javascript
// User clicks "Add" button in notes.ejs
// notes_app.js: addNote()

const item = { 
  text: "Buy milk", 
  category: "Personal", 
  tags: [], 
  color: "#fecaca", 
  pinned: false, 
  todos: []
};
await NotesAPI.add(item);
```

**Step 2: API Client**
```javascript
// api.js: NotesAPI.add()

const response = await fetch('/api/notes', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer eyJhbGciOi...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    text: "Buy milk",
    category: "Personal",
    color: "#fecaca",
    ...
  })
});
```

**Step 3: Backend Processing**
```javascript
// server.js: POST /api/notes

app.post("/api/notes", requireAuth, async (req, res) => {
  const { text, category, color, ... } = req.body;
  
  // Create note with user reference
  const note = new Note({
    user: req.user.id,      // User ID from JWT token
    text: text.trim(),
    category: category || 'General',
    color: color,
    ...
  });
  
  await note.save();  // MongoDB insert
  res.json(note);     // Return saved note with _id
});
```

**Step 4: Database**
```javascript
// MongoDB: notes collection

db.notes.insertOne({
  user: ObjectId("507f1f77bcf86cd799439011"),
  text: "Buy milk",
  category: "Personal",
  color: "#fecaca",
  pinned: false,
  tags: [],
  todos: [],
  createdAt: ISODate("2025-01-14T10:30:00.000Z"),
  updatedAt: ISODate("2025-01-14T10:30:00.000Z")
})

// Returns with _id
// WriteResult({ "nInserted" : 1 })
```

**Step 5: Response Back to Frontend**
```javascript
// server.js returns note with _id

{
  "_id": ObjectId("..."),
  "user": ObjectId("..."),
  "text": "Buy milk",
  "category": "Personal",
  ...
}

// api.js receives response
// Saves to localStorage cache
// Calls loadNotes() to reload all notes
// notes_app.js renders updated UI
```

### Editing a Note

**User clicks ✏️ button**
```javascript
// notes_app.js: togglePin(noteId)

const note = allNotes.find(n => n._id === noteId);
const success = await NotesAPI.update(noteId, { 
  text: "Updated content" 
});
if(success) await loadNotes();
```

**API sends PUT request**
```javascript
// api.js: NotesAPI.update()

fetch(`/api/notes/${noteId}`, {
  method: 'PUT',
  headers: { 'Authorization': 'Bearer ...' },
  body: JSON.stringify({ text: "Updated content" })
})
```

**Server updates in MongoDB**
```javascript
// server.js: PUT /api/notes/:id

const note = await Note.findOneAndUpdate(
  { _id: req.params.id, user: req.user.id },  // Security!
  { $set: { text: "Updated content" } },
  { new: true }
);
res.json(note);
```

### Offline Scenario

**User has no internet connection**

```javascript
// api.js: NotesAPI.add() fails

try {
  const response = await fetch('/api/notes', {...});
  // Network error - fetch fails
} catch(e) {
  console.warn('Failed to fetch notes, using cached data');
  
  // Fallback to localStorage
  const cache = readOffline();
  cache.push({...item, _id: 'temp_' + timestamp});
  localStorage.setItem('notes_cache', JSON.stringify(cache));
  
  console.warn('Note saved locally. Will sync when online.');
  return false;
}
```

**When connection restored**

```javascript
// notes_app.js: periodically calls loadNotes()

// api.js: NotesAPI.read() succeeds
const response = await fetch('/api/notes', {
  headers: { 'Authorization': 'Bearer ...' }
});

// Gets fresh data from MongoDB
// Overwrites local cache
// Returns to online mode
```

## Authentication Flow

```
1. User logs in at /login
   ↓
2. POST /signup or POST /login
   ↓
3. Server creates JWT token
   ↓
4. Token = { id: userId, username: ... }
   ↓
5. Frontend stores in localStorage/sessionStorage
   ↓
6. Each API request includes:
   Authorization: Bearer <jwt_token>
   ↓
7. requireAuth middleware verifies JWT
   ↓
8. req.user.id available for user-scoped queries
```

## Security Features

| Feature | Implementation |
|---------|-----------------|
| User Isolation | All queries filter by `user: req.user.id` |
| Authentication | JWT tokens required for `/api/notes/*` |
| Authorization | User can only access own notes |
| Token Expiry | Tokens expire after 7 days |
| HTTPS | Required in production |
| Data Validation | Server validates all inputs |

## Performance Considerations

### Database Indexes
```javascript
// Automatic indexes created by Mongoose:

// Fast sorting by creation date
{ user: 1, createdAt: -1 }

// Fast filtering by category
{ user: 1, category: 1 }
```

### API Response Optimization
```javascript
// Use .lean() to skip Mongoose overhead
const notes = await Note.find({...}).lean();

// Pagination for large datasets
const notes = await Note.find({...})
  .skip((page - 1) * limit)
  .limit(limit);
```

### Caching Strategy
```
1. Server response → Cache in localStorage
2. Network fails → Use localStorage cache
3. Connection restored → Fetch fresh from server
4. Cache max-age: unlimited (on user action)
```

## Error Handling

### Frontend Error Messages

| Status | Message | Action |
|--------|---------|--------|
| 401 | "Not authenticated" | Redirect to login |
| 400 | "Invalid payload" | Show error alert |
| 404 | "Note not found" | Refresh list |
| 500 | "Server error" | Retry or offline mode |

### API Response Codes

```javascript
// Success
200 OK        - Request successful
201 Created   - Resource created

// Client Error
400 Bad Request     - Invalid input
401 Unauthorized    - Missing/invalid token
403 Forbidden       - No permission
404 Not Found       - Resource doesn't exist

// Server Error
500 Internal Server Error - Backend issue
```

## Testing the API

### Using curl

```bash
# Get authentication token (from signup/login)
TOKEN="eyJhbGciOiJIUzI1NiIs..."

# Get all notes
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/notes

# Create a note
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text":"Test","category":"Personal"}' \
  http://localhost:4000/api/notes

# Update a note
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text":"Updated"}' \
  http://localhost:4000/api/notes/NOTEID

# Delete a note
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/notes/NOTEID
```

### Using Postman

1. Set up collection with base URL: `http://localhost:4000`
2. Add Auth header: `Authorization: Bearer <token>`
3. Test each endpoint with sample data
4. Monitor response times and status codes

## Deployment Checklist

- [ ] MongoDB Atlas cluster set up
- [ ] MONGODB_URI in environment
- [ ] JWT_SECRET configured (strong)
- [ ] HTTPS enabled
- [ ] Rate limiting added
- [ ] Error logging configured
- [ ] Database backups scheduled
- [ ] Security headers verified
- [ ] Load tested with production data
- [ ] Monitoring/alerting set up

## Future Enhancements

1. **Sharing**: Allow users to share notes with others
2. **Collaboration**: Real-time collaborative editing
3. **Search**: Full-text search across all notes
4. **Versioning**: Track note history/versions
5. **Export**: PDF/Word export functionality
6. **Mobile**: Native mobile app using same API
7. **Notifications**: Real-time sync across devices
8. **Analytics**: Track note-taking patterns

---

**For detailed API reference:** See `docs/NOTES_DATABASE_GUIDE.md`  
**For quick start:** See `NOTES_DEPLOYMENT_GUIDE.md`
