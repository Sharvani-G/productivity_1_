import { execSync } from 'child_process';

try {
  // search for the exact pattern that causes UTC date shifting
  const out = execSync("git grep -n " + "'toISOString().split(\'T\')[0]' || true", { encoding: 'utf8' });
  if (out && out.trim()) {
    console.error('Found forbidden UTC weekKey usage:');
    console.error(out);
    process.exit(1);
  }
  console.log('✅ No forbidden toISOString().split("T")[0] usages found');
  process.exit(0);
} catch (e) {
  // execSync throws if command fails; treat as failure
  console.error('Error running grep', e.message);
  process.exit(1);
}
