# My Notes App

A simple, user-friendly notes application with local storage persistence.

## Features

- 📝 **Create Notes** - Add notes with categories (General, Study, Work, Personal, Ideas, Todo)
- ✏️ **Edit Notes** - Click the edit button (✏️) to modify any note
- 📌 **Pin Notes** - Pin your favorite notes to appear at the top
- 🔍 **Search** - Search notes by text content
- 🎨 **Filter** - Filter notes by category
- ⬇️ **Download** - Export filtered notes as JSON
- 🌙 **Themes** - Toggle between Light, Dark, and Black themes

## How to Use

1. **Add a Note**: Type your note in the textarea, select a category, and click "Add"
2. **Edit a Note**: Click the ✏️ button on any note card to edit its content
3. **Pin a Note**: Click 📌/📍 to pin/unpin notes
4. **Download Notes**: Use "Download This" to download currently visible notes as JSON
5. **Search**: Type in the search box to filter notes by text
6. **Filter by Category**: Select a category from the dropdown to view specific notes

## Keyboard Shortcuts

- **Ctrl + Enter** - Save edited note
- **Escape** - Cancel editing

## Storage

Notes are stored locally in your browser's localStorage. This means:
- ✅ All notes persist when you close and reopen the browser
- ✅ Notes are specific to this browser/device
- ✅ Works offline
- ⚠️ Clearing browser cache will delete notes

## Browser Support

Works on all modern browsers that support:
- ES6+ JavaScript
- CSS Grid
- localStorage API

## Deployment

The app is fully client-side and requires no backend server. Simply serve the files statically:

```bash
# Using npm
npm install -g http-server
http-server public/notes_app

# Using Python
python -m http.server 8000
```

Then visit `http://localhost:8000`
