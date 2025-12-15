import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();
const base = `http://localhost:${process.env.PORT || 4000}`;

async function run(){
  console.log('Starting smoke test for per-user week isolation');
  // unique emails per run
  const u1 = { email: `smoke1+${Date.now()}@example.com`, username: 'smoke1', password: 'abc1234' };
  const u2 = { email: `smoke2+${Date.now()}@example.com`, username: 'smoke2', password: 'abc1234' };

  const r1 = await axios.post(`${base}/signup`, u1).then(r => r.data).catch(e => { console.error('signup1 failed', e.response?.data || e.message); throw e; });
  const r2 = await axios.post(`${base}/signup`, u2).then(r => r.data).catch(e => { console.error('signup2 failed', e.response?.data || e.message); throw e; });

  const t1 = r1.token; const t2 = r2.token;
  const wk = '2099-01-01';

  await axios.post(`${base}/api/tasks/${wk}`, { days: { '0': [{ id: 'a', text: 'u1', status: 'open' }] } }, { headers: { Authorization: `Bearer ${t1}` } });
  await axios.post(`${base}/api/tasks/${wk}`, { days: { '0': [{ id: 'b', text: 'u2', status: 'open' }] } }, { headers: { Authorization: `Bearer ${t2}` } });

  const g1 = await axios.get(`${base}/api/tasks/${wk}`, { headers: { Authorization: `Bearer ${t1}` } }).then(r => r.data);
  const g2 = await axios.get(`${base}/api/tasks/${wk}`, { headers: { Authorization: `Bearer ${t2}` } }).then(r => r.data);

  console.log('user1 days:', JSON.stringify(g1));
  console.log('user2 days:', JSON.stringify(g2));

  if (g1['0']?.[0]?.text !== 'u1') throw new Error('user1 data mismatch');
  if (g2['0']?.[0]?.text !== 'u2') throw new Error('user2 data mismatch');

  console.log('✅ Smoke test passed: per-user week isolation verified');
}

run().catch(e => { console.error('Smoke test failed', e.message || e); process.exit(1); });
