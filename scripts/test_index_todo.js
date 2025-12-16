import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();
const base = `http://localhost:${process.env.PORT || 4000}`;

function getWeekKeyAndDayIndex(date = new Date()){
  const day = date.getDay();
  const tosubtractdays = day === 0 ? -6 : 1 - day; // monday start
  const monday = new Date(date);
  monday.setDate(date.getDate() + tosubtractdays);
  const weekKey = monday.toISOString().split('T')[0];
  const dayIndex = day === 0 ? 6 : day - 1;
  return { weekKey, dayIndex };
}

async function run(){
  console.log('Starting index-todo test');
  const u = { email: `todo+${Date.now()}@example.com`, username: 'todo-test', password: 'abc1234' };
  const signup = await axios.post(`${base}/signup`, u).then(r => r.data).catch(e => { console.error('signup failed', e.response?.data || e.message); throw e; });
  const token = signup.token;

  const { weekKey, dayIndex } = getWeekKeyAndDayIndex();

  // create a task for today
  const days = { [String(dayIndex)]: [{ id: 'idx1', text: 'Index TODO test task', status: 'open' }] };
  await axios.post(`${base}/api/tasks/${weekKey}`, { days }, { headers: { Authorization: `Bearer ${token}` } }).catch(e => { console.error('post tasks failed', e.response?.data || e.message); throw e; });

  // fetch the week as the index script would
  const res = await axios.get(`${base}/api/tasks/${weekKey}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.data).catch(e => { console.error('get tasks failed', e.response?.data || e.message); throw e; });

  const todays = res && res[dayIndex] ? res[dayIndex] : [];
  if (!todays.length) throw new Error('No tasks returned for today');
  if (todays[0].text !== 'Index TODO test task') throw new Error('Task text mismatch');

  console.log('✅ index-todo test passed');
}

run().catch(e => { console.error('index-todo test failed', e.message || e); process.exit(1); });
