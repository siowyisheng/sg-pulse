import { describe, expect, it } from "vitest";
import { createTestApp } from "@/testing/harness";

const person = (n: number) => ({ subject: `s-${n}`, name: "TAN AH KOW", dateOfBirth: "1990-05-01", sex: "M" });

/** A world on Thursday morning with these Candidates under #tag, written a minute apart. */
async function worldWith(texts: string[]) {
  const world = await createTestApp({ now: "2026-11-12T08:00:00+08:00" });
  let people = 0;
  for (const text of texts) {
    await (await world.signUp(person(++people))).me.submitFeeling({ text, polarity: "good", hashtag: "tag" });
    world.clock.advance({ minutes: 1 });
  }
  const all = new Map<string, string>();
  // Fewer than 10 at a time would be easier, but the screen only shows 10: gather the ids over a few jumbles.
  for (let seed = 1; all.size < texts.length && seed < 200; seed++) {
    world.random.seed(seed);
    for (const c of await world.app.candidates({ polarity: "good", hashtag: "tag" })) all.set(c.text, c.id);
  }
  /** Each Upvote needs its own voter. */
  const vote = async (text: string, times: number) => {
    for (let i = 0; i < times; i++) await (await world.signUp(person(++people))).me.upvote(all.get(text)!);
  };
  const shown = async (seed: number) => {
    world.random.seed(seed);
    return (await world.app.candidates({ polarity: "good", hashtag: "tag" })).map((c) => c.text);
  };
  return { ...world, vote, shown, ids: all };
}

const named = (prefix: string, count: number) => Array.from({ length: count }, (_, i) => `${prefix}${i + 1}`);
const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];

describe("the 10 Candidates shown when a Hashtag has more", () => {
  it("mix the 5 with the most Upvotes, 3 Rising and 2 New, leaving out ones that are merely middling", async () => {
    const top = named("Top", 5);
    const stale = named("Stale", 4);
    const rising = named("Rising", 3);
    const fresh = named("Fresh", 8);
    const world = await worldWith([...top, ...stale, ...rising, ...fresh]);
    // Morning: the leaders and the also-rans get their Upvotes.
    world.clock.set("2026-11-12T09:00:00+08:00");
    for (const text of top) await world.vote(text, 6);
    for (const text of stale) await world.vote(text, 4);
    // Late afternoon: three Candidates get all theirs in a burst. Fewer than the also-rans, but recent.
    world.clock.set("2026-11-12T17:00:00+08:00");
    for (const text of rising) await world.vote(text, 3);
    world.clock.set("2026-11-12T17:05:00+08:00");

    const picks = new Set<string>();
    for (const seed of SEEDS) {
      const shown = await world.shown(seed);
      expect(shown).toHaveLength(10);
      expect(shown.filter((text) => text.startsWith("Top")).sort()).toEqual(top);
      expect(shown.filter((text) => text.startsWith("Rising")).sort()).toEqual(rising);
      expect(shown.filter((text) => text.startsWith("Stale"))).toEqual([]);
      const newOnes = shown.filter((text) => text.startsWith("Fresh"));
      expect(newOnes).toHaveLength(2);
      newOnes.forEach((text) => picks.add(text));
    }
    // A Feeling written this morning with no Upvotes gets its turn: the two New places go round.
    expect(picks.size).toBeGreaterThan(2);
  });

  it("stop being Rising once the burst is hours old, and the place goes to someone else", async () => {
    const world = await worldWith([...named("Top", 5), ...named("Stale", 4), ...named("Burst", 3)]);
    world.clock.set("2026-11-12T09:00:00+08:00");
    for (const text of named("Top", 5)) await world.vote(text, 6);
    for (const text of named("Stale", 4)) await world.vote(text, 4);
    for (const text of named("Burst", 3)) await world.vote(text, 3);

    // Straight after, everything with Upvotes is fresh; by the evening none of it is, and only totals count.
    world.clock.set("2026-11-12T20:00:00+08:00");
    for (const seed of SEEDS) {
      const shown = await world.shown(seed);
      expect(shown.filter((text) => text.startsWith("Stale")).sort()).toEqual(named("Stale", 4));
      expect(shown.filter((text) => text.startsWith("Burst"))).toHaveLength(1);
    }
  });

  it("fill the places of a group that is short from the others", async () => {
    // Nobody is Rising and nobody is New: twelve Candidates with old Upvotes, 13 down to 2.
    const texts = named("C", 12);
    const world = await worldWith(texts);
    world.clock.set("2026-11-12T09:00:00+08:00");
    for (const [index, text] of texts.entries()) await world.vote(text, 13 - index);
    world.clock.set("2026-11-12T20:00:00+08:00");
    for (const seed of SEEDS) expect((await world.shown(seed)).sort()).toEqual(named("C", 10).sort());
  });

  it("fill from New when there are not five with Upvotes", async () => {
    const world = await worldWith([...named("Voted", 2), ...named("Fresh", 12)]);
    await world.vote("Voted1", 2);
    await world.vote("Voted2", 2);
    world.clock.set("2026-11-12T20:00:00+08:00");
    for (const seed of SEEDS) {
      const shown = await world.shown(seed);
      expect(shown).toHaveLength(10);
      expect(shown.filter((text) => text.startsWith("Voted")).sort()).toEqual(["Voted1", "Voted2"]);
    }
  });

  it("give nothing away: always jumbled, with no hint of why a Candidate is there", async () => {
    const world = await worldWith([...named("Top", 5), ...named("Fresh", 9)]);
    for (const text of named("Top", 5)) await world.vote(text, 3);
    world.clock.set("2026-11-12T20:00:00+08:00");
    const first = await world.shown(1);
    const second = await world.shown(2);
    expect(first).not.toEqual(second);
    // The leaders are not bunched at the front.
    const positions = SEEDS.map(async (seed) => (await world.shown(seed)).indexOf("Top1"));
    expect(new Set(await Promise.all(positions)).size).toBeGreaterThan(2);
    world.random.seed(1);
    const [candidate] = await world.app.candidates({ polarity: "good", hashtag: "tag" });
    expect(Object.keys(candidate!).sort()).toEqual(["byline", "hashtag", "id", "polarity", "text"]);
  });

  it("do not count a second Yah Lah from the same User on the same Candidate as a fresh one", async () => {
    const world = await worldWith([...named("Top", 5), ...named("Stale", 5), "Honest", "Pumped"]);
    world.clock.set("2026-11-12T09:00:00+08:00");
    for (const text of named("Top", 5)) await world.vote(text, 6);
    for (const text of named("Stale", 5)) await world.vote(text, 5);
    await world.vote("Honest", 3);
    await world.vote("Pumped", 3);
    // Evening: one fan taps Yah Lah on "Pumped" again and again. After the first it is already theirs, so nothing changes.
    world.clock.set("2026-11-12T20:00:00+08:00");
    const fan = (await world.signUp(person(9000))).me;
    for (let i = 0; i < 8; i++) await fan.upvote(world.ids.get("Pumped")!);
    expect(await world.tally()).toMatchObject({ Pumped: 4 });
    // One late Upvote out of four doesn't make it Rising, so it stays behind the ten with more.
    for (const seed of SEEDS) expect(await world.shown(seed)).not.toContain("Pumped");
  });
});
