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
  const weekKey = monday.toISOString().split('T')[0];
  const dayIndex = day === 0 ? 6 : day - 1;

  // create a task for today via API
  const days = { [String(dayIndex)]: [{ id: 'dom1', text: 'DOM test task', status: 'open' }] };
  await axios.post(`${base}/api/tasks/${weekKey}`, { days }, { headers: { Authorization: `Bearer ${token}` } });

  // Load the client script and a minimal DOM
  const scriptPath = path.join(process.cwd(), 'public', 'js', 'index-todo.js');
  const scriptSrc = fs.readFileSync(scriptPath, 'utf8');

  const html = `<section id="todo"><h2>To-Do List</h2><p>Manage your tasks efficiently with our to-do list feature.</p></section>`;
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: base });

  // make fetch available inside JSDOM to call our running server
  dom.window.fetch = global.fetch;

  // ensure fetch resolves relative URLs against our base URL
  dom.window.fetch = (u, opts) => global.fetch(new URL(u, base).toString(), opts);

  // set auth token in localStorage BEFORE evaluating so auto-run sees it
  dom.window.localStorage.setItem('authToken', token);

  // evaluate the client script inside the JSDOM window (it auto-runs on DOMContentLoaded)
  dom.window.eval(scriptSrc);

  // call the exposed helper to populate the DOM (in case auto-run didn't fire)
  const res = await dom.window.fetchTodosForToday();
  if (!res) throw new Error('fetchTodosForToday returned null or undefined');

  const list = dom.window.document.querySelector('#todo ul.todo-list');
  if (!list) throw new Error('todo list element not present');
  const items = Array.from(list.querySelectorAll('li')).map(li => li.textContent.trim());
  if (!items.some(t => t.includes('DOM test task'))) throw new Error('Expected task not found in list: ' + JSON.stringify(items));

  console.log('✅ DOM index-todo test passed — list contains:', items);
}

run().catch(err => { console.error('DOM index-todo test failed', err && err.message ? err.message : err); process.exit(1); });
