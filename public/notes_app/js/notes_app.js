import NotesAPI from './api.js';

(async function(){
  const qs = s => document.querySelector(s);
  const noteInput = qs('#noteInput');
  const addBtn = qs('#addBtn');
  const notesList = qs('#notesList');
  const insertTop = qs('#insertTop');
  const downloadBtn = qs('#downloadBtn');
  const search = qs('#search');
  const filterCategory = qs('#filterCategory');
  const themeToggle = qs('#themeToggle');
  const categorySelect = qs('#categorySelect');
  const editModal = qs('#editModal');
  const editInput = qs('#editInput');
  const saveEdit = qs('#saveEdit');
  const cancelEdit = qs('#cancelEdit');

  const COLORS = ['#fecaca', '#fed7aa', '#fef3c7', '#c6f6d5', '#a5f3fc', '#c7d2fe', '#e9d5ff'];
  
  let allNotes = [];
  let currentEditId = null;
  let isLoading = false;

  // Load initial notes from server/cache
  async function loadNotes(){
    isLoading = true;
    try {
      allNotes = await NotesAPI.read();
      console.log(`✅ Loaded ${allNotes.length} notes`);
    } catch(e) {
      console.error('Failed to load notes:', e);
      allNotes = [];
    }
    isLoading = false;
    render();
  }

  function openEditModal(noteId){
    const note = allNotes.find(n => n._id === noteId);
    if(!note) return;
    currentEditId = noteId;
    editInput.value = note.text;
    editModal.style.display = 'flex';
    editInput.focus();
  }

  function closeEditModal(){
    editModal.style.display = 'none';
    currentEditId = null;
    editInput.value = '';
  }

  async function saveEditedNote(){
    if(!currentEditId) return;
    const newText = editInput.value.trim();
    if(!newText) { alert('Note cannot be empty'); return; }
    
    isLoading = true;
    const updated = await NotesAPI.update(currentEditId, { text: newText });
    if(updated) {
      closeEditModal();
      await loadNotes();
    } else {
      alert('Failed to save. Check console for details.');
    }
    isLoading = false;
  }

  function render(){
    notesList.innerHTML = '';
    if(isLoading) {
      notesList.innerHTML = '<div style="padding:20px; text-align:center;">Loading notes...</div>';
      return;
    }

    const q = search.value.trim().toLowerCase();
    const catFilter = filterCategory.value;

    const sorted = [...allNotes].sort((a,b)=>(b.pinned?1:0)-(a.pinned?1:0));
    const filtered = sorted.filter(n=>{
      if(catFilter && n.category !== catFilter) return false;
      if(q && !n.text.toLowerCase().includes(q)) return false;
      return true;
    });

    if(filtered.length === 0) {
      notesList.innerHTML = '<div style="padding:20px; text-align:center; color:var(--muted);">No notes found</div>';
      return;
    }

    filtered.forEach((n)=>{
      const card = document.createElement('article');
      card.className = 'note-card';
      card.style.borderLeft = `4px solid ${n.color || '#2563eb'}`;

      const left = document.createElement('div'); left.className='note-left';
      
      const text = document.createElement('div'); text.className='note-text'; text.textContent=n.text;
      const createdDate = new Date(n.createdAt).toLocaleString();
      const meta = document.createElement('div'); meta.className='note-meta'; meta.innerHTML = `${createdDate} • <span class="category-badge">${n.category || 'General'}</span>`;
      
      const tagsWrap = document.createElement('div'); tagsWrap.className='tags-wrap';
      (n.tags||[]).forEach(t=>{ const el=document.createElement('span'); el.className='tag'; el.textContent=t; tagsWrap.appendChild(el) });

      // Todos section
      const todosWrap = document.createElement('div'); todosWrap.className='todos-wrap';
      if(n.todos && n.todos.length){
        const todosTitle = document.createElement('div'); todosTitle.style.fontSize='12px'; todosTitle.style.fontWeight='600'; todosTitle.textContent='Tasks:';
        todosWrap.appendChild(todosTitle);
        const todoList = document.createElement('ul'); todoList.style.margin='4px 0'; todoList.style.paddingLeft='18px';
        n.todos.forEach((todo)=>{
          const li = document.createElement('li');
          li.style.fontSize='12px';
          li.textContent = `${todo.done ? '✓' : '○'} ${todo.text}`;
          todoList.appendChild(li);
        });
        todosWrap.appendChild(todoList);
      }

      left.appendChild(text);
      if(tagsWrap.children.length) left.appendChild(tagsWrap);
      if(todosWrap.children.length) left.appendChild(todosWrap);
      left.appendChild(meta);

      const actions = document.createElement('div'); actions.className='note-actions';
      const edit = document.createElement('button'); edit.textContent='✏️'; edit.style.border='none'; edit.style.background='transparent'; edit.style.cursor='pointer'; edit.style.fontSize='16px'; edit.addEventListener('click', ()=>{ openEditModal(n._id) });
      const pin = document.createElement('button'); pin.textContent = n.pinned ? '📌' : '📍'; pin.style.border='none'; pin.style.background='transparent'; pin.style.cursor='pointer'; pin.style.fontSize='16px'; pin.addEventListener('click', async ()=>{ await togglePin(n._id) });
      const exp = document.createElement('button'); exp.textContent='⬇️'; exp.style.border='none'; exp.style.background='transparent'; exp.style.cursor='pointer'; exp.style.fontSize='16px'; exp.addEventListener('click', ()=>{ exportSingle(n) });
      const del = document.createElement('button'); del.textContent='🗑️'; del.style.border='none'; del.style.background='transparent'; del.style.cursor='pointer'; del.style.fontSize='16px'; del.addEventListener('click', async ()=>{ await deleteNote(n._id) });

      actions.appendChild(edit); actions.appendChild(pin); actions.appendChild(exp); actions.appendChild(del);
      card.appendChild(left); card.appendChild(actions);
      notesList.appendChild(card);
    });
  }

  async function addNote(){
    const text = noteInput.value.trim(); 
    if(!text) return;
    
    const cat = categorySelect.value || 'General';
    const item = { 
      text, 
      category: cat, 
      tags: [], 
      color: COLORS[Math.floor(Math.random()*COLORS.length)], 
      pinned: false, 
      todos: []
    };
    
    isLoading = true;
    const result = await NotesAPI.add(item);
    if(result) {
      noteInput.value=''; 
      await loadNotes();
    } else {
      alert('Failed to save note. Check console for details.');
    }
    isLoading = false;
  }

  async function deleteNote(id){ 
    if(!confirm('Delete this note?')) return;
    isLoading = true;
    const success = await NotesAPI.remove(id);
    if(success) {
      await loadNotes();
    } else {
      alert('Failed to delete note. Check console for details.');
    }
    isLoading = false;
  }

  async function togglePin(id){ 
    const note = allNotes.find(n=>n._id===id); 
    if(!note) return;
    isLoading = true;
    const success = await NotesAPI.update(id, { pinned: !note.pinned });
    if(success) {
      await loadNotes();
    } else {
      alert('Failed to update note. Check console.');
    }
    isLoading = false;
  }

  function exportSingle(n){ 
    const blob=new Blob([JSON.stringify(n, null, 2)], {type:'application/json'}); 
    const url=URL.createObjectURL(blob); 
    const a=document.createElement('a'); 
    a.href=url; 
    a.download = `note-${n._id}.json`; 
    document.body.appendChild(a); 
    a.click(); 
    a.remove(); 
    URL.revokeObjectURL(url); 
  }

  function downloadAll(){ 
    const q = search.value.trim().toLowerCase();
    const catFilter = filterCategory.value;
    
    const filtered = allNotes.filter(n=>{
      if(catFilter && n.category !== catFilter) return false;
      if(q && !n.text.toLowerCase().includes(q)) return false;
      return true;
    });
    
    const blob = new Blob([JSON.stringify(filtered, null, 2)], {type:'application/json'}); 
    const url = URL.createObjectURL(blob); 
    const a = document.createElement('a'); 
    a.href = url; 
    a.download = `notes-${new Date().toISOString().slice(0,10)}.json`; 
    document.body.appendChild(a); 
    a.click(); 
    a.remove(); 
    URL.revokeObjectURL(url); 
  }

  // Event listeners
  addBtn.addEventListener('click', addNote);
  downloadBtn.addEventListener('click', downloadAll);
  search.addEventListener('input', render);
  filterCategory.addEventListener('change', render);
  categorySelect.addEventListener('change', render);
  saveEdit.addEventListener('click', saveEditedNote);
  cancelEdit.addEventListener('click', closeEditModal);
  editInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter' && e.ctrlKey) saveEditedNote(); if(e.key==='Escape') closeEditModal(); });
  editModal.addEventListener('click', (e)=>{ if(e.target===editModal) closeEditModal(); });

  themeToggle.addEventListener('click', ()=>{
    const body = document.body; 
    if(body.classList.contains('theme-default')){ 
      body.classList.remove('theme-default'); 
      body.classList.add('theme-dark'); 
    } else if(body.classList.contains('theme-dark')){ 
      body.classList.remove('theme-dark'); 
      body.classList.add('theme-black'); 
    } else { 
      body.classList.remove('theme-black'); 
      body.classList.add('theme-default'); 
    }
  });

  // Initialize
  if(!document.body.classList.length) document.body.classList.add('theme-default');
  
  // Check authentication
  function getToken() {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  }

  function showAuthMessage() {
    notesList.innerHTML = `
      <div style="padding:30px; text-align:center; background:#fff3cd; border:1px solid #ddd; border-radius:4px;">
        <h3>🔐 Authentication Required</h3>
        <p>You need to log in to access your notes.</p>
        <a href="/login" style="display:inline-block; padding:10px 20px; background:#007bff; color:white; text-decoration:none; border-radius:4px; margin:10px 5px;">Login</a>
        <a href="/signup" style="display:inline-block; padding:10px 20px; background:#28a745; color:white; text-decoration:none; border-radius:4px; margin:10px 5px;">Sign Up</a>
      </div>
    `;
    // Disable inputs
    noteInput.disabled = true;
    addBtn.disabled = true;
    search.disabled = true;
    filterCategory.disabled = true;
  }

  if (!getToken()) {
    showAuthMessage();
  } else {
    // Load notes from MongoDB via API
    await loadNotes();
  }
})();
