import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();
const MONGODB_URI = process.env.MONGODB_URI;

async function run(){
  await mongoose.connect(MONGODB_URI, {dbName: process.env.MONGODB_DB || undefined});
  const coll = mongoose.connection.db.collection('weeks');
  const indexes = await coll.indexes();
  console.log('Existing indexes:', indexes.map(i => i.name));

  // Drop weekKey_1 if exists
  if (indexes.some(ix => ix.name === 'weekKey_1')){
    console.log('Dropping weekKey_1');
    try { await coll.dropIndex('weekKey_1'); console.log('Dropped weekKey_1'); } catch (e){ console.error('Failed to drop weekKey_1', e.message); }
  }
  // Drop any legacy userId-based indexes
  if (indexes.some(ix => ix.name && ix.name.includes('userId'))){
    for(const ix of indexes.filter(ix => ix.name && ix.name.includes('userId'))){
      console.log('Dropping', ix.name);
      try { await coll.dropIndex(ix.name); console.log('Dropped', ix.name); } catch (e){ console.error('Failed to drop', ix.name, e.message); }
    }
  }

  // Ensure partial unique index on user+weekKey exists
  const hasPartial = indexes.some(ix => ix.name === 'user_week_partial');
  if (!hasPartial) {
    console.log('Creating partial unique index user_week_partial');
    try {
      await coll.createIndex({ user: 1, weekKey: 1 }, { unique: true, partialFilterExpression: { user: { $exists: true } }, name: 'user_week_partial' });
      console.log('Created user_week_partial');
    } catch (e){ console.error('Failed to create user_week_partial', e.message); }
  } else {
    console.log('user_week_partial already exists');
  }

  const final = await coll.indexes();
  console.log('Final indexes:', final.map(i => ({ name: i.name, key: i.key, unique: i.unique || false, partial: !!i.partialFilterExpression })));
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
