import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

(async ()=>{
  try{
    const base = `http://localhost:${process.env.PORT || 4000}`;
    const email = `persist+${Date.now()}@example.com`;
    const u = { email, username: 'persist', password: 'abc1234' };
    const signup = await axios.post(`${base}/signup`, u).then(r => r.data);
    const token1 = signup.token;

    const now = new Date();
    const day = now.getDay();
    const tosubtractdays = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + tosubtractdays);
    const y = monday.getFullYear();
    const m = String(monday.getMonth() + 1).padStart(2, '0');
    const d = String(monday.getDate()).padStart(2, '0');
    const weekKey = `${y}-${m}-${d}`;
    const dayIndex = day === 0 ? 6 : day - 1;

    const days = {};
    days[String(dayIndex)] = [{ id: 'p1', text: 'persist task', status: 'open' }];
    await axios.post(`${base}/api/tasks/${weekKey}`, { days }, { headers: { Authorization: `Bearer ${token1}` } });
    console.log('posted task');

    // simulate logout by forgetting token, then login again
    const loginRes = await axios.post(`${base}/login`, { email, password: 'abc1234' }).then(r => r.data);
    const token2 = loginRes.token;

    const fetched = await axios.get(`${base}/api/tasks/${weekKey}`, { headers: { Authorization: `Bearer ${token2}` } }).then(r => r.data);
    const tasks = fetched[String(dayIndex)];
    if (!tasks || !tasks.some(t => t.text === 'persist task')) { console.error('Task not persisted across login'); process.exit(1); }

    console.log('✅ Persistence smoke test passed');
  } catch (e) {
    console.error('ERR', e.response?.data || e.message);
    process.exit(1);
  }
})();