#!/usr/bin/env node
import axios from 'axios';
import dotenv from 'dotenv';
import puppeteer from 'puppeteer';
dotenv.config();

const base = `http://localhost:${process.env.PORT || 4000}`;

function getWeekKeyAndDayIndex(date = new Date()){
  const day = date.getDay();
  const tosubtractdays = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + tosubtractdays);
  const weekKey = monday.toISOString().split('T')[0];
  const dayIndex = day === 0 ? 6 : day - 1;
  return { weekKey, dayIndex };
}

async function run(){
  console.log('Starting manual check using Puppeteer');
  const user = { email: `pupp+${Date.now()}@example.com`, username: 'pupp', password: 'abc1234' };
  const signup = await axios.post(`${base}/signup`, user).then(r => r.data).catch(e => { console.error('signup failed', e.response?.data || e.message); throw e; });
  const token = signup.token;

  const { weekKey, dayIndex } = getWeekKeyAndDayIndex();
  const days = { [String(dayIndex)]: [{ id: 'pupp1', text: 'Puppeteer task', status: 'open' }] };
  await axios.post(`${base}/api/tasks/${weekKey}`, { days }, { headers: { Authorization: `Bearer ${token}` } }).catch(e => { console.error('post tasks failed', e.response?.data || e.message); throw e; });

  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();

  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push(text);
    console.log('PAGE LOG:', text);
  });

  // set auth before any script runs
  await page.evaluateOnNewDocument(token => {
    localStorage.setItem('authToken', token);
  }, token);

  await page.goto(base + '/', { waitUntil: 'networkidle0' });

  // give some time for the widget to fetch and render
  await page.waitForTimeout(500);

  const todoHtml = await page.$eval('#todo', el => el.innerHTML);

  console.log('\n--- #todo innerHTML ---\n', todoHtml);
  console.log('\n--- Console logs captured ---\n', logs.join('\n'));

  await browser.close();
}

run().catch(err => { console.error('Manual check failed', err && err.message ? err.message : err); process.exit(1); });
