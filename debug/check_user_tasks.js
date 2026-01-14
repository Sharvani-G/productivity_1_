import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import User from '../models/User.js';
import Week from '../models/Week.js';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const email = 'sharvanigbhaskar@gmail.com';
  const user = await User.findOne({ email }).lean();
  console.log('USER:', !!user, user ? { id: user._id.toString(), email: user.email, username: user.username } : null);

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const jsDay = yesterday.getDay();
  const dayIndex = jsDay === 0 ? 6 : jsDay - 1;

  const tempDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
  const dayOfYesterday = tempDate.getDay();
  const diff = tempDate.getDate() - dayOfYesterday + (dayOfYesterday === 0 ? -6 : 1);
  const monday = new Date(tempDate.setDate(diff));
  const weekKey = (() => {
    const d = monday;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${da}`;
  })();

  console.log('YESTERDAY:', yesterday.toDateString(), 'dayIndex:', dayIndex, 'weekKey:', weekKey);

  if (user) {
    const week = await Week.findOne({ weekKey, user: user._id }).lean();
    console.log('WEEK FOUND:', !!week);
    console.log('DAYS KEYS:', Object.keys(week?.days || {}));
    console.log('TASKS AT INDEX:', (week?.days?.[String(dayIndex)]) || []);
  }

  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
