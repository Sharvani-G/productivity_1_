import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

(async ()=>{
  try{
    const base = `http://localhost:${process.env.PORT || 4000}`;
    const u = { email: `smoke+${Date.now()}@example.com`, username: 'smoke-user', password: 'abc1234' };
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

    const tasks = [
      { id: 's1', text: 'task1', status: 'open' },
      { id: 's2', text: 'task2', status: 'open' },
      { id: 's3', text: 'task3', status: 'open' },
      { id: 's4', text: 'task4', status: 'open' }
    ];

    const days = {};
    days[String(dayIndex)] = tasks;

    await axios.post(`${base}/api/tasks/${weekKey}`, { days }, { headers: { Authorization: `Bearer ${token}` } });
    console.log('posted tasks');

    const res = await axios.get(`${base}/api/tasks/${weekKey}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.data);
    console.log('get tasks day', res[String(dayIndex)]);

    const stats = await axios.get(`${base}/api/stats/summary`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.data);
    console.log('stats', stats.stats);

    console.log('Smoke API steps passed');
  } catch (e) {
    console.error('ERR', e.response?.data || e.message);
    process.exit(1);
  }
})();
