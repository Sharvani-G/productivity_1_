import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();
const base = `http://localhost:${process.env.PORT || 4000}`;

async function run(){
  console.log('Starting task flow test');
  const user = { email: `flow+${Date.now()}@example.com`, username: 'flow', password: 'abc1234' };
  const r = await axios.post(`${base}/signup`, user).then(r => r.data);
  const token = r.token;
  const wk = '2099-02-02';

  // create week with a task
  await axios.post(`${base}/api/tasks/${wk}`, { days: { '0': [{ id: 't-upd', text: 'before', status: 'open' }] } }, { headers: { Authorization: `Bearer ${token}` } });
  let g = await axios.get(`${base}/api/tasks/${wk}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.data);
  console.log('After create:', JSON.stringify(g));

  // update the task
  await axios.put(`${base}/api/tasks/${wk}/0/t-upd`, { text: 'after', status: 'done' }, { headers: { Authorization: `Bearer ${token}` } });
  g = await axios.get(`${base}/api/tasks/${wk}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.data);
  console.log('After update:', JSON.stringify(g));

  // delete the task
  await axios.delete(`${base}/api/tasks/${wk}/0/t-upd`, { headers: { Authorization: `Bearer ${token}` } });
  g = await axios.get(`${base}/api/tasks/${wk}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.data);
  console.log('After delete:', JSON.stringify(g));

  if ((g['0'] || []).length !== 0) throw new Error('Task deletion failed');
  console.log('✅ Task flow test passed');
}

run().catch(err => { console.error('Task flow test failed', err.response?.data || err.message || err); process.exit(1); });
