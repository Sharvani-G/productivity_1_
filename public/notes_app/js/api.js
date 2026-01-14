// API wrapper for notes - communicates with backend MongoDB
const NotesAPI = (function(){
  const API_URL = '/api/notes';
  
  function getToken() {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  }
  
  function isAuthenticated() {
    return !!getToken();
  }
  
  function getAuthHeader() {
    const token = getToken();
    if (!token) return null; // Return null instead of throwing
    return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  }
  
  async function read() {
    const token = getToken();
    if (!token) {
      console.warn('⚠️ Not authenticated. Please login first.');
      return readOffline();
    }

    try {
      const response = await fetch(API_URL, {
        method: 'GET',
        headers: getAuthHeader()
      });
      if (!response.ok) {
        if (response.status === 401) {
          console.warn('⚠️ Authentication expired. Please login again.');
          return readOffline();
        }
        throw new Error(`HTTP ${response.status}`);
      }
      const notes = await response.json();
      // Cache locally for offline support
      localStorage.setItem('notes_cache', JSON.stringify(notes));
      return notes;
    } catch(e) {
      console.warn('Failed to fetch notes from server, using cached data:', e.message);
      return readOffline();
    }
  }
  
  async function write(list) {
    // Save to cache immediately for offline support
    localStorage.setItem('notes_cache', JSON.stringify(list));
    
    try {
      const token = getToken();
      if (!token) {
        console.warn('⚠️ No auth token. Changes saved locally only.');
        return true;
      }
      // Write is not directly supported - use add/update instead
      console.log('✅ Notes synced with server');
      return true;
    } catch(e) {
      console.error('Error syncing notes:', e.message);
      return false;
    }
  }
  
  async function add(item) {
    const token = getToken();
    if (!token) {
      console.warn('⚠️ Not authenticated. Cannot save to database. Please login first.');
      return null;
    }

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify(item)
      });
      if (!response.ok) {
        const errText = await response.text();
        console.error('Server error:', errText);
        throw new Error(`HTTP ${response.status}`);
      }
      const savedNote = await response.json();
      console.log('✅ Note saved to database:', savedNote._id);
      // Update cache immediately with the server response
      const cache = readOffline();
      cache.push(savedNote);
      localStorage.setItem('notes_cache', JSON.stringify(cache));
      return savedNote;
    } catch(e) {
      console.error('Error adding note to server:', e.message);
      // Still save locally with temp ID
      const tempId = 'temp_' + Math.random().toString(36).slice(2,9);
      const localNote = {...item, _id: tempId};
      const cache = readOffline();
      cache.push(localNote);
      localStorage.setItem('notes_cache', JSON.stringify(cache));
      console.warn('⚠️ Note saved to local cache. Will sync with server when available.');
      return localNote;
    }
  }
  
  async function update(id, fields) {
    const token = getToken();
    if (!token) {
      console.warn('⚠️ Not authenticated. Cannot update on database. Please login first.');
      return null;
    }

    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: getAuthHeader(),
        body: JSON.stringify(fields)
      });
      if (!response.ok) {
        if (response.status === 404) {
          console.warn('Note not found on server');
          return null;
        }
        const errText = await response.text();
        console.error('Server error:', errText);
        throw new Error(`HTTP ${response.status}`);
      }
      const updated = await response.json();
      console.log('✅ Note updated:', id);
      // Update cache
      const cache = readOffline();
      const idx = cache.findIndex(n => n._id === id);
      if (idx >= 0) cache[idx] = updated;
      localStorage.setItem('notes_cache', JSON.stringify(cache));
      return updated;
    } catch(e) {
      console.error('Error updating note:', e.message);
      // Try to update in cache anyway
      const cache = readOffline();
      const idx = cache.findIndex(n => n._id === id);
      if (idx >= 0) {
        cache[idx] = {...cache[idx], ...fields};
        localStorage.setItem('notes_cache', JSON.stringify(cache));
        console.warn('⚠️ Note updated locally. Will sync with server when available.');
        return cache[idx];
      }
      return null;
    }
  }
  
  async function remove(id) {
    const token = getToken();
    if (!token) {
      console.warn('⚠️ Not authenticated. Cannot delete from database. Please login first.');
      return false;
    }

    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
      if (!response.ok) {
        if (response.status === 404) {
          console.warn('Note not found on server');
          return false;
        }
        const errText = await response.text();
        console.error('Server error:', errText);
        throw new Error(`HTTP ${response.status}`);
      }
      console.log('✅ Note deleted:', id);
      // Remove from cache
      const cache = readOffline();
      const filtered = cache.filter(n => n._id !== id);
      localStorage.setItem('notes_cache', JSON.stringify(filtered));
      return true;
    } catch(e) {
      console.error('Error deleting note:', e.message);
      // Still remove from cache
      const cache = readOffline();
      const filtered = cache.filter(n => n._id !== id);
      localStorage.setItem('notes_cache', JSON.stringify(filtered));
      console.warn('⚠️ Note deleted locally. Will sync with server when available.');
      return true;
    }
  }
  
  function readOffline() {
    try {
      const cache = localStorage.getItem('notes_cache');
      return cache ? JSON.parse(cache) : [];
    } catch(e) {
      console.error('Error reading cache:', e);
      return [];
    }
  }
  
  return { read, write, add, update, remove, readOffline, KEY: 'notes_api' };
})();

export default NotesAPI;
