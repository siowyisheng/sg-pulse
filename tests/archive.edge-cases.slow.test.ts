import { describe, expect, it } from "vitest";
import { createTestApp } from "@/testing/harness";

const ADMIN = { subject: "s-admin", name: "SIOW YI SHENG", dateOfBirth: "1988-02-03", sex: "M" };
const seed = (cycle: string, polarity: "good" | "bad", text: string) => ({ cycle, polarity, text, hashtag: "seed" });

/** Seed Feelings of the Day for the 10th to the 13th of November, with the clock on the 14th. */
async function fourDays() {
  const world = await createTestApp({ now: "2026-11-10T09:00:00+08:00" });
  for (const day of ["10", "11", "12", "13"]) {
    await world.app.operator.scheduleSeedFeeling(seed(`2026-11-${day}`, "good", `Good ${day}`));
    if (day !== "12") await world.app.operator.scheduleSeedFeeling(seed(`2026-11-${day}`, "bad", `Bad ${day}`));
  }
  world.clock.set("2026-11-14T09:00:00+08:00");
  return world;
}

describe("the archive", () => {
  it("lists each day newest first, Good before Bad, once each: a Carry-over day adds nothing, and today's are not in it yet", async () => {
    const world = await fourDays();
    await world.app.operator.scheduleSeedFeeling(seed("2026-11-14", "good", "Good today"));
    expect((await world.app.archive()).map((entry) => `${entry.cycle} ${entry.text}`)).toEqual([
      "2026-11-13 Good 13",
      "2026-11-13 Bad 13",
      "2026-11-12 Good 12",
      "2026-11-11 Good 11",
      "2026-11-11 Bad 11",
      "2026-11-10 Good 10",
      "2026-11-10 Bad 10",
    ]);
  });

  it("comes a page at a time, each page picking up before the last day of the one before", async () => {
    const world = await fourDays();
    const first = await world.app.archive({ days: 2 });
    expect(first.map((entry) => entry.text)).toEqual(["Good 13", "Bad 13", "Good 12"]);
    const second = await world.app.archive({ days: 2, before: first.at(-1)!.cycle });
    expect(second.map((entry) => entry.text)).toEqual(["Good 11", "Bad 11", "Good 10", "Bad 10"]);
    expect(await world.app.archive({ before: "2026-11-10" })).toEqual([]);
    expect(await world.app.archive({ before: "not a date" })).toEqual([]);
  });

  it("drops an entry that has been taken down", async () => {
    const world = await fourDays();
    const admin = (await world.signUpAdmin(ADMIN)).me.asAdmin();
    const gone = (await world.app.archive()).find((entry) => entry.text === "Good 11")!;
    await admin.takeDown(gone.id);
    expect((await world.app.archive()).map((entry) => entry.text)).not.toContain("Good 11");
    expect(await world.app.published("2026-11-11", "good")).toBeNull();
    expect(await world.app.sharePreview("2026-11-11", "good")).toBeNull();
    // The other days are as they were.
    expect((await world.app.archive()).map((entry) => entry.text)).toContain("Bad 11");
  });

  it("is empty before there is a past", async () => {
    const world = await createTestApp({ now: "2026-11-12T09:00:00+08:00" });
    await world.app.operator.scheduleSeedFeeling(seed("2026-11-12", "good", "Today"));
    expect(await world.app.archive()).toEqual([]);
  });
});

describe("sharing", () => {
  it("previews only the text, the Hashtag and the Polarity: never the Byline or the count", async () => {
    const world = await createTestApp({ now: "2026-11-12T09:00:00+08:00" });
    const writer = await world.signUp({ subject: "s-1", name: "TAN AH KOW", dateOfBirth: "1990-05-01", sex: "M" });
    await writer.me.submitFeeling({ text: "Got a seat", polarity: "good", hashtag: "mrt" });
    const [candidate] = await world.app.candidates({ polarity: "good", hashtag: "mrt" });
    await (await world.signUpAdmin(ADMIN)).me.asAdmin().approve(candidate!.id);
    world.clock.set("2026-11-13T00:00:00+08:00");
    const preview = await world.app.sharePreview("2026-11-13", "good");
    expect(Object.keys(preview!).sort()).toEqual(["hashtag", "polarity", "text"]);
    // The page the link opens does show the Byline, like the front page.
    expect(await world.app.published("2026-11-13", "good")).toMatchObject({ text: "Got a seat", byline: { initials: "TA" }, yahLahs: 0, cycle: "2026-11-13" });
  });

  it("works for today's Feeling of the Day, and for one being carried over under the day it was chosen", async () => {
    const world = await fourDays();
    expect((await world.app.feelingsOfTheDay()).good).toMatchObject({ text: "Good 13", cycle: "2026-11-13", carriedOver: true });
    expect(await world.app.sharePreview("2026-11-13", "good")).toMatchObject({ text: "Good 13" });
    expect(await world.app.sharePreview("2026-11-14", "good")).toBeNull();
  });

  it("is not possible for a Candidate, an Approval that has not gone live, or a day and Polarity that make no sense", async () => {
    const world = await createTestApp({ now: "2026-11-12T09:00:00+08:00" });
    await (await world.signUp({ subject: "s-1", name: "TAN AH KOW", dateOfBirth: "1990-05-01", sex: "M" })).me.submitFeeling({ text: "Candidate", polarity: "good", hashtag: "mrt" });
    const [candidate] = await world.app.candidates({ polarity: "good", hashtag: "mrt" });
    await (await world.signUpAdmin(ADMIN)).me.asAdmin().approve(candidate!.id);
    expect(await world.app.sharePreview("2026-11-12", "good")).toBeNull();
    expect(await world.app.sharePreview("2026-11-13", "good")).toBeNull();
    expect(await world.app.published("2026-11-13", "good")).toBeNull();
    expect(await world.app.sharePreview("yesterday", "good")).toBeNull();
    expect(await world.app.sharePreview("2026-11-12", "meh" as "good")).toBeNull();
    world.clock.set("2026-11-13T00:00:00+08:00");
    expect(await world.app.sharePreview("2026-11-13", "good")).toMatchObject({ text: "Candidate" });
  });
});
