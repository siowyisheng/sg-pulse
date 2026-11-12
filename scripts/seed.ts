// Adds a Seed Feeling as a Cycle's Feeling of the Day, until the Admin area exists.
//   npm run seed -- 2026-11-13 good kopi "Kopi with the neighbours before work"
import { getApp } from "@/composition";
import { isUserFacing } from "@/core/errors";
import { POLARITIES, type Polarity } from "@/core/feeling-rules";

const [cycle, polarity, hashtag, text] = process.argv.slice(2);
if (!cycle || !hashtag || !text || !POLARITIES.includes(polarity as Polarity)) {
  console.error('Usage: npm run seed -- <YYYY-MM-DD> <good|bad> <hashtag> "<text>"');
  process.exit(1);
}

try {
  const app = await getApp();
  await app.addSeedFeelingOfTheDay({ cycle, polarity: polarity as Polarity, hashtag, text });
  console.log(`Added the ${polarity} Feeling of the Day for ${cycle}.`);
} catch (error) {
  if (!isUserFacing(error)) throw error;
  console.error(error.message);
  process.exit(1);
}
