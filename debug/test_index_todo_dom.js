#!/usr/bin/env node
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const base = `http://localhost:${process.env.PORT || 4000}`;

async function run(){
  console.log('Starting DOM-based index-todo test');

  // create a test user and token
  const u = { email: `dom+${Date.now()}@example.com`, username: 'dom-test', password: 'abc1234' };
  const signup = await axios.post(`${base}/signup`, u).then(r => r.data).catch(e => { console.error('signup failed', e.response?.data || e.message); throw e; });
  const token = signup.token;

  // compute weekKey/dayIndex (same logic as client)
  const today = new Date();
  const day = today.getDay();
  const tosubtractdays = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + tosubtractdays);
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, '0');
  const dayOfMonth = String(monday.getDate()).padStart(2, '0');
  const weekKey = `${y}-${m}-${dayOfMonth}`;
  const dayIndex = day === 0 ? 6 : day - 1; 

  // create a task for today via API
  const days = { [String(dayIndex)]: [{ id: 'dom1', text: 'DOM test task', status: 'open' }] };
  await axios.post(`${base}/api/tasks/${weekKey}`, { days }, { headers: { Authorization: `Bearer ${token}` } });

  // Load the client script and a minimal DOM
  const scriptPath = path.join(process.cwd(), 'public', 'js', 'index-todo.js');
  const scriptSrc = fs.readFileSync(scriptPath, 'utf8');

  const html = `<section id="todo"><h2>To-Do List</h2><div id="current-day-tasks"></div></section>`;
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: base });

  // make fetch available inside JSDOM to call our running server and resolve relative URLs
  dom.window.fetch = (u, opts) => global.fetch(new URL(u, base).toString(), opts);

  // set auth token in localStorage BEFORE evaluating so auto-run sees it (index-todo uses key 'token')
  dom.window.localStorage.setItem('token', token);

  // evaluate the client script inside the JSDOM window (it listens for DOMContentLoaded)
  dom.window.eval(scriptSrc);

  // Manually dispatch DOMContentLoaded so the script's loadToday runs in JSDOM
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));

  // give the script a short time to fetch and render
  await new Promise((r) => setTimeout(r, 250));

  // verify the tasks were rendered into the container
  const container = dom.window.document.getElementById('current-day-tasks');
  if (!container) throw new Error('current-day-tasks container not found');
  const items = container.querySelectorAll('li');
  if (!items.length) throw new Error('No tasks rendered for today');
  const texts = Array.from(items).map(n => n.textContent.trim());
  if (!texts.some(t => t.includes('DOM test task'))) throw new Error('Expected task not found: ' + JSON.stringify(texts));
  console.log('✅ DOM index-todo test passed — list contains:', texts);


}

run().catch(err => { console.error('DOM index-todo test failed', err && err.message ? err.message : err); process.exit(1); });
