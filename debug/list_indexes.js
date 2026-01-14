import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
const MONGODB_URI = process.env.MONGODB_URI;

async function run(){
  await mongoose.connect(MONGODB_URI, {dbName: process.env.MONGODB_DB || undefined});
  const coll = mongoose.connection.db.collection('weeks');
  const indexes = await coll.indexes();
  console.log(JSON.stringify(indexes, null, 2));
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
