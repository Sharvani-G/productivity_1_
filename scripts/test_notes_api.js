import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

(async () => {
  try {
    const base = `http://localhost:${process.env.PORT || 4000}`;
    
    // 1. Sign up
    const testEmail = `notes-test-${Date.now()}@example.com`;
    const signup = await axios.post(`${base}/signup`, {
      email: testEmail,
      username: `notes-user-${Date.now()}`,
      password: 'testpass123'
    }).then(r => r.data);
    
    const token = signup.token;
    console.log('✅ Signup successful:', signup.username);
    
    const headers = { Authorization: `Bearer ${token}` };
    
    // 2. Create a note
    const noteData = {
      text: 'Test note content',
      category: 'General',
      color: '#3498db',
      pinned: false,
      tags: ['test'],
      todos: []
    };
    
    const createRes = await axios.post(`${base}/api/notes`, noteData, { headers });
    const noteId = createRes.data._id;
    console.log('✅ Note created:', noteId);
    console.log('   Text:', createRes.data.text);
    
    // 3. Get all notes
    const getAllRes = await axios.get(`${base}/api/notes`, { headers });
    console.log('✅ Retrieved notes:', getAllRes.data.length, 'note(s)');
    
    // 4. Get specific note
    const getOneRes = await axios.get(`${base}/api/notes/${noteId}`, { headers });
    console.log('✅ Retrieved specific note:', getOneRes.data.text);
    
    // 5. Update the note
    const updateRes = await axios.put(`${base}/api/notes/${noteId}`, {
      text: 'Updated note content'
    }, { headers });
    console.log('✅ Note updated:', updateRes.data.text);
    
    // 6. Verify update
    const verifyRes = await axios.get(`${base}/api/notes/${noteId}`, { headers });
    if (verifyRes.data.text === 'Updated note content') {
      console.log('✅ Update verified successfully');
    }
    
    // 7. Delete the note
    const deleteRes = await axios.delete(`${base}/api/notes/${noteId}`, { headers });
    console.log('✅ Note deleted');
    
    // 8. Verify deletion
    try {
      await axios.get(`${base}/api/notes/${noteId}`, { headers });
      console.error('❌ Note still exists after deletion');
      process.exit(1);
    } catch (e) {
      if (e.response?.status === 404) {
        console.log('✅ Deletion verified - note not found');
      } else {
        throw e;
      }
    }
    
    console.log('\n✅ All notes API tests passed!');
    
  } catch (e) {
    console.error('❌ Test failed:', e.response?.data || e.message);
    process.exit(1);
  }
})();
