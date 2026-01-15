import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";

import helmet from "helmet";
import crypto from "crypto";
import compression from "compression";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import xss from "xss-clean";

import Week from "./models/Week.js";
import User from "./models/User.js";
import Note from "./models/Note.js"; // Added from secondary version
import cron from "node-cron";
import nodemailer from "nodemailer";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import axios from "axios"; 

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.disable("x-powered-by");

app.set('trust proxy', 1);

// Security: Helmet + Custom CSP with Nonce
app.use(helmet({ contentSecurityPolicy: false }));
app.use((req, res, next) => {
  try {
    const nonce = crypto.randomBytes(16).toString("base64");
    res.locals.cspNonce = nonce;

    const directives = [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' https://cdn.jsdelivr.net`,
      "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
      "img-src 'self' data:",
      "connect-src 'self' https://cdn.jsdelivr.net",
      "font-src 'self'",
    ];

    res.setHeader('Content-Security-Policy', directives.join('; '));
  } catch (e) {
    console.error('CSP nonce generation failed', e);
  }
  next();
});

app.use(compression());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300 }));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-this";

// Simple auth middleware
function requireAuth(req, res, next) {
  const auth = req.get('authorization') || req.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

function formatDateLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
} 

// Protect API routes
app.use('/api/tasks', requireAuth);

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || "";
if (!MONGODB_URI) {
  console.warn("⚠️  MONGODB_URI is not set. Set it in .env");
}
mongoose
  .connect(MONGODB_URI, { dbName: process.env.MONGODB_DB || undefined })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// MongoDB Index Management (from Main Version)
mongoose.connection.once('open', async () => {
  try {
    const coll = mongoose.connection.db.collection('weeks');
    const indexes = await coll.indexes();
    const hasWeekKeyUnique = indexes.some(ix => ix.name === 'weekKey_1');
    if (hasWeekKeyUnique) {
      console.log('ℹ️ Dropping legacy unique index weekKey_1');
      await coll.dropIndex('weekKey_1');
    }
    const uwIndex = indexes.find(ix => {
      const kp = ix.key || ix.keyPattern || {};
      const hasUserKey = Object.keys(kp).some(k => k === 'user' || k === 'userId');
      return hasUserKey && kp.weekKey === 1;
    });
    if (uwIndex && !uwIndex.partialFilterExpression) {
      console.log('ℹ️ Found non-partial user+weekKey index, replacing...');
      try {
        await coll.dropIndex(uwIndex.name);
      } catch (e) { console.warn('dropIndex failed', e.message); }
      await coll.createIndex({ user: 1, weekKey: 1 }, { unique: true, partialFilterExpression: { user: { $exists: true } }, name: 'user_week_partial' });
      console.log('✅ Recreated user-week partial unique index');
    }
    for (const ix of indexes) {
      if (ix.name && ix.name.includes('userId')) {
        try {
          await coll.dropIndex(ix.name);
          console.log(`✅ Dropped legacy index ${ix.name}`);
        } catch (e) { console.warn(`Failed to drop legacy index ${ix.name}`, e.message); }
      }
    }
  } catch (e) {
    console.warn('Index cleanup warning:', e.message);
  }
});

// --- TASK API ---
app.get("/api/tasks/:weekKey", async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const doc = await Week.findOne({ weekKey: req.params.weekKey, user: userId }).lean();
    res.json(doc?.days || {});
  } catch (e) { next(e); }
});

app.post("/api/tasks/:weekKey", async (req, res, next) => {
  try {
    const { weekKey } = req.params;
    const { days } = req.body;
    if (typeof days !== "object" || Array.isArray(days)) {
      return res.status(400).json({ error: "Invalid payload" });
    }
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const updated = await Week.findOneAndUpdate(
      { weekKey, user: userId },
      { $set: { days, updatedAt: new Date() }, $setOnInsert: { user: userId } },
      { upsert: true, new: true }
    ).lean();

    res.json({ success: true, weekKey, days: updated.days });
  } catch (e) { next(e); }
});

app.delete("/api/tasks/:weekKey/:dayIndex/:taskId", async (req, res, next) => {
  try {
    const { weekKey, dayIndex, taskId } = req.params;
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const doc = await Week.findOne({ weekKey, user: userId });
    if (!doc || !doc.days[dayIndex]) return res.status(404).json({ error: "Not found" });
    
    doc.days[dayIndex] = doc.days[dayIndex].filter(t => t.id !== taskId);
    if (typeof doc.markModified === 'function') doc.markModified('days');
    await doc.save();
    res.json({ success: true, days: doc.days });
  } catch (e) { next(e); }
});

app.put("/api/tasks/:weekKey/:dayIndex/:taskId", async (req, res, next) => {
  try {
    const { weekKey, dayIndex, taskId } = req.params;
    const { text, status } = req.body;
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const doc = await Week.findOne({ weekKey, user: userId });
    if (!doc || !doc.days[dayIndex]) return res.status(404).json({ error: "Not found" });

    const taskIndex = doc.days[dayIndex].findIndex(t => t.id === taskId);
    if (taskIndex === -1) return res.status(404).json({ error: "Task not found" });

    doc.days[dayIndex][taskIndex] = { id: taskId, text, status };
    if (typeof doc.markModified === 'function') doc.markModified('days');
    await doc.save();

    res.json({ success: true, task: doc.days[dayIndex][taskIndex] });
  } catch (e) { next(e); }
});

app.delete("/api/tasks/:weekKey", async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    await Week.deleteOne({ weekKey: req.params.weekKey, user: userId });
    res.json({ cleared: true });
  } catch (e) { next(e); }
});

// --- NOTES API (Merged from Secondary Version) ---
app.get("/api/notes", requireAuth, async (req, res, next) => {
  try {
    const notes = await Note.find({ user: req.user.id }).sort({ createdAt: -1 }).lean();
    res.json(notes);
  } catch (e) { next(e); }
});

app.post("/api/notes", requireAuth, async (req, res, next) => {
  try {
    const { text, category, tags, color, todos } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Note text is required' });
    }
    const note = new Note({
      user: req.user.id,
      text: text.trim(),
      category: category || 'General',
      tags: tags || [],
      color: color || '#2563eb',
      todos: todos || [],
      pinned: false
    });
    await note.save();
    res.json(note);
  } catch (e) { next(e); }
});

app.get("/api/notes/:id", requireAuth, async (req, res, next) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, user: req.user.id }).lean();
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json(note);
  } catch (e) { next(e); }
});

app.put("/api/notes/:id", requireAuth, async (req, res, next) => {
  try {
    const { text, category, tags, color, pinned, todos } = req.body;
    const updateData = {};
    if (text !== undefined) updateData.text = text.trim();
    if (category !== undefined) updateData.category = category;
    if (tags !== undefined) updateData.tags = tags;
    if (color !== undefined) updateData.color = color;
    if (pinned !== undefined) updateData.pinned = pinned;
    if (todos !== undefined) updateData.todos = todos;

    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { $set: updateData },
      { new: true }
    ).lean();
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json(note);
  } catch (e) { next(e); }
});

app.delete("/api/notes/:id", requireAuth, async (req, res, next) => {
  try {
    const result = await Note.deleteOne({ _id: req.params.id, user: req.user.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Note not found' });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// --- PAGES ---
app.get("/", async (req, res) => {
  try {
    const response = await axios.get("https://api.api-ninjas.com/v1/quotes", {
      headers: { "X-Api-Key": process.env.API },
    });
    const data = response.data[0];
    res.render("index.ejs", { content: data });
  } catch (error) {
    console.error(error);
    res.render("index.ejs", {
      content: { quote: "Failed to load quote 😢", author: "Unknown" },
    });
  }
});

app.get("/weekly", (req, res) => res.render("weekly"));
app.get("/login", (req, res) => res.render("login"));
app.get("/signup", (req, res) => res.render("signup"));
app.get("/report", (req, res) => res.render("report"));
app.get("/notes", (req, res) => res.render("notes"));
app.get("/pomodoro", (req, res) => res.render("pomodoro"));

// --- AUTH ENDPOINTS ---
app.post('/signup', async (req, res, next) => {
  try {
    const { email, username, password } = req.body || {};
    if (!email || !username || !password) return res.status(400).json({ success: false, message: 'Missing fields' });

    const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{6,}$/;
    if (!passwordPattern.test(password)) {
      return res.status(400).json({ success: false, message: 'Password does not meet requirements' });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ success: false, message: 'Email already registered' });

    const user = new User({ email, username });
    await user.setPassword(password);
    await user.save();

    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, username: user.username, email: user.email });
  } catch (e) { next(e); }
});

app.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ success: false, message: 'Missing fields' });

    const user = await User.findOne({ email });
    if (!user || !(await user.validatePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, username: user.username, email: user.email });
  } catch (e) { next(e); }
});

// --- STATS SUMMARY ---
app.get("/api/stats/summary", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    const currentWeekKey = formatDateLocal(monday);

    const currentWeek = await Week.findOne({ weekKey: currentWeekKey, user: userId }).lean();
    const days = currentWeek?.days || {};

    let done = 0, active = 0, lost = 0;
    const weeklyCounts = { completed: [0,0,0,0,0,0,0], inprocess: [0,0,0,0,0,0,0], abandoned: [0,0,0,0,0,0,0] };
    const dailyTotalTasks = [0,0,0,0,0,0,0];

    for (let i = 0; i < 7; i++) {
      const dayTasks = days[String(i)] || [];
      dayTasks.forEach(task => {
        const status = (task.status || '').toLowerCase().trim().replace(/\s+/g, '-');
        dailyTotalTasks[i]++;
        if (status === 'completed') { done++; weeklyCounts.completed[i]++; }
        else if (status === 'in-process') { active++; weeklyCounts.inprocess[i]++; }
        else if (status === 'abandoned') { lost++; weeklyCounts.abandoned[i]++; }
      });
    }

    const total = done + active + lost;
    const efficiency = total > 0 ? Math.round((done / total) * 100) : 0;
    const allWeeks = await Week.find({ user: userId }).select('weekKey days').lean();

    res.json({
      stats: { done, active, lost, eff: `${efficiency}%` },
      weeklyData: weeklyCounts,
      dailyTotalTasks,
      heatmapData: allWeeks
    });
  } catch (e) { next(e); }
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: "Internal Server Error" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));

// --- NOTIFICATIONS & CRON ---
const emailEnabled = !!process.env.EMAIL_USER && !!process.env.EMAIL_PASS;
let transporter = emailEnabled ? nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
}) : null;

async function sendDailyNotifications() {
  console.log('--- Starting Daily Notification Process ---');
  if (!transporter) return;

  try {
    const users = await User.find({});
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const jsDay = yesterday.getDay();
    const dayIndex = jsDay === 0 ? 6 : jsDay - 1;

    const tempDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    const dDiff = tempDate.getDate() - tempDate.getDay() + (tempDate.getDay() === 0 ? -6 : 1);
    const monday = new Date(tempDate.setDate(dDiff));
    const weekKey = formatDateLocal(monday);

    for (const user of users) {
      const weekDoc = await Week.findOne({ weekKey, user: user._id });
      const tasks = (weekDoc && weekDoc.days && weekDoc.days[String(dayIndex)]) || [];
      if (!tasks.length) continue;

      const taskHtml = tasks.map(t => `<li style="margin-bottom:8px;"><strong style="color: ${t.status === 'Completed' ? '#22c55e' : '#ef4444'}">${t.text}</strong> - Status: ${t.status || 'No Status'}</li>`).join('');

      try {
        await transporter.sendMail({
          from: '"FocusPanel" <no-reply@focuspanel.com>',
          to: user.email,
          subject: `Your Tasks Summary for Yesterday (${yesterday.toDateString()})`,
          html: `<h3>Hello ${user.username},</h3><p>Here is how you did yesterday:</p><ul>${taskHtml}</ul><p>Log in to <a href="https://your-app-url.com">FocusPanel</a> to stay productive today!</p>`
        });
      } catch (err) { console.error(`sendMail failed for ${user.email}:`, err); }
    }
    console.log('--- All Notifications Sent ---');
  } catch (err) { console.error('Notification Job Failed:', err); }
}

if (emailEnabled) {
cron.schedule('0 9 * * *', sendDailyNotifications, { timezone: "Asia/Kolkata" });}

if (process.env.ENABLE_TEST_EMAIL_ROUTE === 'true') {
  app.get("/test-email", async (req, res) => {
    await sendDailyNotifications();
    res.send("Notification job triggered.");
  });
}

export { sendDailyNotifications };

if (process.env.SEND_NOTIFICATIONS_ON_START === 'true' && emailEnabled) {
  if (!global._notificationsStarted) {
    global._notificationsStarted = true;
    setTimeout(() => {
      sendDailyNotifications().catch(err => console.error('Startup notification failed:', err));
    }, 1000);
  }
}