import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

(async ()=>{
  try{
    const base = `http://localhost:${process.env.PORT || 4000}`;
    const u = { email: `report+${Date.now()}@example.com`, username: 'report-user', password: 'abc1234' };
    const signup = await axios.post(`${base}/signup`, u).then(r => r.data);
    console.log('signup', signup.username);
    const token = signup.token;

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
    days[String(dayIndex)] = [
      { id: 'r1', text: 'done task', status: 'completed' },
      { id: 'r2', text: 'in progress task', status: 'In Process' },
      { id: 'r3', text: 'abandoned task', status: 'Abandoned' },
      { id: 'r4', text: 'open task', status: 'open' }
    ];

    await axios.post(`${base}/api/tasks/${weekKey}`, { days }, { headers: { Authorization: `Bearer ${token}` } });
    console.log('posted report tasks');

    const stats = await axios.get(`${base}/api/stats/summary`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.data);
    console.log('stats', stats.stats);

    if (stats.stats.done !== 1 || stats.stats.active !== 1 || stats.stats.lost !== 1) {
      console.error('Unexpected counts:', stats.stats);
      process.exit(1);
    }

    console.log('✅ Report stats smoke test passed');
  } catch (e) {
    console.error('ERR', e.response?.data || e.message);
    process.exit(1);
  }
})();
