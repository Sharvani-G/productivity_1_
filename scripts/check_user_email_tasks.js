import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Week from '../models/Week.js';

dotenv.config();

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/check_user_email_tasks.js <email>');
  process.exit(1);
}

async function main() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error('MONGODB_URI not set in .env');
    process.exit(1);
  }
  await mongoose.connect(MONGODB_URI, { dbName: process.env.MONGODB_DB || undefined });

  const user = await User.findOne({ email }).lean();
  if (!user) {
    console.log(`No user found with email ${email}`);
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log('Found user:', { id: user._id.toString(), username: user.username, email: user.email });

  // compute yesterday's weekKey and dayIndex consistent with server.js
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const jsDay = yesterday.getDay();
  const dayIndex = jsDay === 0 ? 6 : jsDay - 1;

  const tempDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
  const dayOfYesterday = tempDate.getDay();
  const diff = tempDate.getDate() - dayOfYesterday + (dayOfYesterday === 0 ? -6 : 1);
  const monday = new Date(tempDate.setDate(diff));
  const weekKey = `${monday.getFullYear()}-${String(monday.getMonth()+1).padStart(2,'0')}-${String(monday.getDate()).padStart(2,'0')}`;

  console.log('Checking weekKey:', weekKey, 'dayIndex:', dayIndex);

  const weekDoc = await Week.findOne({ weekKey, user: user._id }).lean();
  if (!weekDoc) {
    console.log('No week document found for that weekKey/user.');
    await mongoose.disconnect();
    process.exit(0);
  }

  const tasks = (weekDoc.days && weekDoc.days[String(dayIndex)]) || [];
  console.log(`Found ${tasks.length} tasks for yesterday:`);
  tasks.forEach((t, i) => console.log(i + 1, t));

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});