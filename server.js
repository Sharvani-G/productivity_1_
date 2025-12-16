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
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.disable("x-powered-by");

// When running behind proxies (e.g., in some container hosts), the X-Forwarded-For
// header may be set. Enable Express 'trust proxy' so middleware (rate limit)
// can correctly interpret client IPs and avoid validation errors.
app.set('trust proxy', true);

// Disable helmet's built-in CSP so we can provide a nonce-based CSP per request
app.use(helmet({ contentSecurityPolicy: false }));
// Per-request CSP nonce + header. This allows us to keep a strict CSP while
// permitting necessary inline scripts by adding a nonce attribute to them.
app.use((req, res, next) => {
  try {
    const nonce = crypto.randomBytes(16).toString("base64");
    // expose to EJS templates as `cspNonce`
    res.locals.cspNonce = nonce;

    const directives = [
      "default-src 'self'",
      // allow scripts from self, CDN, and inline scripts carrying the nonce
      `script-src 'self' 'nonce-${nonce}' https://cdn.jsdelivr.net`,
      // styles: allow self, CDN, Google Fonts and allow inline styles for small in-template styles
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
      "img-src 'self' data:",
      "connect-src 'self' https://cdn.jsdelivr.net",
      "font-src 'self'",
    ];

    res.setHeader('Content-Security-Policy', directives.join('; '));
  } catch (e) {
    // if nonce generation fails, continue without setting CSP (safer to fail open here)
    console.error('CSP nonce generation failed', e);
  }
  next();
});
app.use(compression());
// app.use(mongoSanitize());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300 }));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Simple auth middleware: validate Bearer token and attach `req.user`
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

// Protect API routes for tasks - ensure requests include a valid token
app.use('/api/tasks', requireAuth);

// connect to db 
const MONGODB_URI = process.env.MONGODB_URI || "";
if (!MONGODB_URI) {
  console.warn("⚠️  MONGODB_URI is not set. Set it in .env");
}
mongoose
  .connect(MONGODB_URI, { dbName: process.env.MONGODB_DB || undefined })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// After connecting, ensure old single-field unique index on weekKey is removed
// so we can enforce per-user uniqueness (compound index user+weekKey).
mongoose.connection.once('open', async () => {
  try {
    const coll = mongoose.connection.db.collection('weeks');
    const indexes = await coll.indexes();
    const hasWeekKeyUnique = indexes.some(ix => ix.name === 'weekKey_1');
    if (hasWeekKeyUnique) {
      console.log('ℹ️ Dropping legacy unique index weekKey_1 to enable per-user weeks');
      await coll.dropIndex('weekKey_1');
      console.log('✅ Dropped legacy weekKey_1 index');
    }
    // If there's an existing user+weekKey index that enforces uniqueness on null users
    // (i.e., it lacks a partialFilterExpression), drop it and recreate it with
    // partialFilterExpression: { user: { $exists: true } } so that only docs with
    // a user will be constrained to uniqueness.
    const uwIndex = indexes.find(ix => {
      const kp = ix.key || ix.keyPattern || {};
      // match either 'user' or legacy 'userId'
      const hasUserKey = Object.keys(kp).some(k => k === 'user' || k === 'userId');
      return hasUserKey && kp.weekKey === 1;
    });
    if (uwIndex && !uwIndex.partialFilterExpression) {
      console.log('ℹ️ Found non-partial user+weekKey index, replacing with partial index');
      try {
        await coll.dropIndex(uwIndex.name);
      } catch (e) { console.warn('dropIndex failed', e.message || e); }
      // create a proper partial unique index on `user` + `weekKey`
      await coll.createIndex({ user: 1, weekKey: 1 }, { unique: true, partialFilterExpression: { user: { $exists: true } }, name: 'user_week_partial' });
      console.log('✅ Recreated user-week partial unique index as user_week_partial');
    }
    // Some older deployments used 'userId' in index names (e.g. userId_1_weekKey_1)
    // or left behind single-field userId indexes. Drop any such legacy indexes
    // to avoid uniqueness conflicts caused by documents with null users.
    for (const ix of indexes) {
      if (!ix.name) continue;
      if (ix.name.includes('userId')) {
        try {
          console.log(`ℹ️ Dropping legacy index ${ix.name}`);
          await coll.dropIndex(ix.name);
          console.log(`✅ Dropped legacy index ${ix.name}`);
        } catch (e) {
          console.warn(`Failed to drop legacy index ${ix.name}`, e.message || e);
        }
      }
    }
  } catch (e) {
    // non-fatal: log and continue
    console.warn('Index cleanup warning:', e.message || e);
  }
});

// API
app.get("/api/tasks/:weekKey", async (req, res, next) => {
  try {
    // user-specific fetch
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const doc = await Week.findOne({ weekKey: req.params.weekKey, user: userId }).lean();
    res.json(doc?.days || {});
  } catch (e) { next(e); }
});

//first updation of day task inside particular weekkey

app.post("/api/tasks/:weekKey", async (req, res, next) => {
  try {
    const { weekKey } = req.params;
    const { days } = req.body;
    if (typeof days !== "object" || Array.isArray(days)) {
      return res.status(400).json({ error: "Invalid payload: 'days' must be an object" });
    }
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // upsert only for this user + weekKey
    const updated = await Week.findOneAndUpdate(
      { weekKey, user: userId }, // filter
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
    //check if doc exists and dayIndex exists
    if (!doc || !doc.days[dayIndex]) {
      return res.status(404).json({ error: "Week or day not found" });
    }
 //filters all tasks and separates all tasks from the to be deleted one
    doc.days[dayIndex] = doc.days[dayIndex].filter(t => t.id !== taskId);
  // markModified so Mongoose knows to persist changes to the mixed 'days' field
  //doc i mongoose document, markModified is mongoose method we are checking if that method exists
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
    
    if (!doc || !doc.days[dayIndex]) {
      return res.status(404).json({ error: "Week or day not found" });
    }

    const taskIndex = doc.days[dayIndex].findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      return res.status(404).json({ error: "Task not found" });
    }

  doc.days[dayIndex][taskIndex] = { id: taskId, text, status };
  // markModified so Mongoose persists updates to the mixed 'days' field
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

// Pages (render existing ejs files if present)
import axios from "axios"; // make sure this is at the top with other imports

app.get("/", async (req, res) => {
  try {
    const response = await axios.get("https://api.api-ninjas.com/v1/quotes", {
      headers: { "X-Api-Key": process.env.API },
    });

    const data = response.data[0]; // API returns array with one quote
    res.render("index.ejs", { content: data });
  } 
  catch (error) {
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

// Auth endpoints: POST /signup and POST /login
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-this";

// Signup: create user and return token
app.post('/signup', async (req, res, next) => {
  try {
    const { email, username, password } = req.body || {};
    if (!email || !username || !password) return res.status(400).json({ success: false, message: 'Missing fields' });

    // password policy: 6+ chars, at least one letter and one number
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

// Login: validate and return token
app.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ success: false, message: 'Missing fields' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const ok = await user.validatePassword(password);
    if (!ok) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, username: user.username, email: user.email });
  } catch (e) { next(e); }
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: "Internal Server Error" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
