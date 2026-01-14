import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import User from '../models/User.js';
import Week from '../models/Week.js';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const email = 'sharvanigbhaskar@gmail.com';
  const user = await User.findOne({ email }).lean();
  if (!user) {
    console.error('User not found');
    process.exit(1);
  }

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

  console.log('Adding test task for', email, 'weekKey', weekKey, 'dayIndex', dayIndex);

  const task = { id: `test-${Date.now()}`, text: 'Test: Yesterday task for email', status: 'Completed' };

  const updated = await Week.findOneAndUpdate(
    { weekKey, user: user._id },
    { $setOnInsert: { user: user._id }, $push: { [`days.${dayIndex}`]: task } },
    { upsert: true, new: true }
  );

  console.log('Updated days keys:', Object.keys(updated.days || {}));
  console.log('Tasks at index:', (updated.days && updated.days[String(dayIndex)]) || []);

  await mongoose.disconnect();
}

main().catch(e=>{ console.error(e); process.exit(1); });
