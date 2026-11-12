import { describe, expect, it } from "vitest";
import { createTestApp } from "@/testing/harness";

const TAN = { subject: "s-tan", name: "TAN AH KOW", dateOfBirth: "1990-05-01", sex: "M" };
const LIM = { subject: "s-lim", name: "LIM MEI LING", dateOfBirth: "1985-07-09", sex: "F" };
const feeling = (text: string, hashtag = "weather", polarity: "good" | "bad" = "good") => ({ text, hashtag, polarity });

describe("the 21:00 cut-off", () => {
  it("makes a Feeling sent at 20:59 a Candidate of today, and one sent at 21:01 queued for tomorrow", async () => {
    const { signUp, clock } = await createTestApp({ now: "2026-11-12T20:59:00+08:00" });
    const tan = (await signUp(TAN)).me;
    const lim = (await signUp(LIM)).me;
    expect(await tan.submitFeeling(feeling("Just in time"))).toMatchObject({ cycle: "2026-11-12", state: "candidate" });

    clock.set("2026-11-12T21:01:00+08:00");
    expect(await lim.submission()).toEqual({ cycle: "2026-11-13", canSubmit: true, queued: true });
    expect(await lim.submitFeeling(feeling("Too late for today"))).toMatchObject({ cycle: "2026-11-13", state: "queued" });
  });

  it("queues at exactly 21:00", async () => {
    const { signUp } = await createTestApp({ now: "2026-11-12T21:00:00+08:00" });
    expect(await (await signUp(TAN)).me.submitFeeling(feeling("On the dot"))).toMatchObject({ cycle: "2026-11-13", state: "queued" });
  });

  it("keeps a queued Feeling hidden from others until its Cycle starts, when it becomes a Candidate", async () => {
    const { app, signUp, clock } = await createTestApp({ now: "2026-11-12T21:30:00+08:00" });
    const { me } = await signUp(TAN);
    await me.submitFeeling(feeling("Night thought", "supper"));
    expect(await app.hashtagsInUse()).toEqual([]);
    expect((await me.myFeelings())[0]?.state).toBe("queued");

    clock.set("2026-11-13T00:00:00+08:00");
    expect(await app.hashtagsInUse()).toEqual(["supper"]);
    expect((await me.myFeelings())[0]?.state).toBe("candidate");
  });
});

describe("one Feeling per User per Cycle", () => {
  it("refuses a second Feeling in the same Cycle, whatever its Polarity", async () => {
    const { signUp } = await createTestApp({ now: "2026-11-12T09:00:00+08:00" });
    const { me } = await signUp(TAN);
    await me.submitFeeling(feeling("First"));
    await expect(me.submitFeeling(feeling("Second", "weather", "bad"))).rejects.toMatchObject({ code: "ALREADY_SUBMITTED" });
    expect((await me.myFeelings()).map((f) => f.text)).toEqual(["First"]);
  });

  it("counts against the Cycle the Feeling competes in, across 21:00 and midnight", async () => {
    const { signUp, clock } = await createTestApp({ now: "2026-11-12T20:00:00+08:00" });
    const { me } = await signUp(TAN);
    await me.submitFeeling(feeling("For Thursday"));

    // After 21:00 the next Feeling competes on Friday, so it is allowed, once.
    clock.set("2026-11-12T21:30:00+08:00");
    await me.submitFeeling(feeling("For Friday"));
    await expect(me.submitFeeling(feeling("Friday again"))).rejects.toMatchObject({ code: "ALREADY_SUBMITTED" });

    // Friday morning: Friday's Feeling is already in, so no second one for Friday.
    clock.set("2026-11-13T08:00:00+08:00");
    expect(await me.submission()).toEqual({ cycle: "2026-11-13", canSubmit: false, queued: false });
    await expect(me.submitFeeling(feeling("Friday morning"))).rejects.toMatchObject({ code: "ALREADY_SUBMITTED" });

    // Friday after 21:00 is Saturday's Cycle.
    clock.set("2026-11-13T21:00:00+08:00");
    await me.submitFeeling(feeling("For Saturday"));
    expect((await me.myFeelings()).map((f) => `${f.cycle} ${f.state}`)).toEqual(["2026-11-14 queued", "2026-11-13 candidate", "2026-11-12 expired"]);
  });

  it("lets two Users submit in the same Cycle", async () => {
    const { signUp } = await createTestApp({ now: "2026-11-12T09:00:00+08:00" });
    await (await signUp(TAN)).me.submitFeeling(feeling("Mine"));
    await (await signUp(LIM)).me.submitFeeling(feeling("Hers"));
  });

  it("holds when the same User submits twice at the same moment", async () => {
    const { signUp } = await createTestApp({ now: "2026-11-12T09:00:00+08:00" });
    const { me } = await signUp(TAN);
    const results = await Promise.allSettled([me.submitFeeling(feeling("One")), me.submitFeeling(feeling("Two"))]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await me.myFeelings()).toHaveLength(1);
  });
});

describe("the profanity and slur filter", () => {
  it("refuses bad text without using up the Cycle's submission", async () => {
    const { signUp } = await createTestApp({ now: "2026-11-12T09:00:00+08:00" });
    const { me } = await signUp(TAN);
    await expect(me.submitFeeling(feeling("What the fuck is this weather"))).rejects.toMatchObject({ code: "REFUSED_BY_FILTER" });
    expect(await me.submission()).toMatchObject({ canSubmit: true });
    await me.submitFeeling(feeling("What is this weather"));
  });

  it.each(["F U C K this", "f.u.c.k this", "fuuuuck this", "sh1t day", "KNNBCCB lah", "chee bye weather", "what a c*nt"])("catches %j", async (text) => {
    const { signUp } = await createTestApp({ now: "2026-11-12T09:00:00+08:00" });
    await expect((await signUp(TAN)).me.submitFeeling(feeling(text))).rejects.toMatchObject({ code: "REFUSED_BY_FILTER" });
  });

  it("checks the Hashtag too", async () => {
    const { signUp } = await createTestApp({ now: "2026-11-12T09:00:00+08:00" });
    await expect((await signUp(TAN)).me.submitFeeling(feeling("Lovely day", "#shit"))).rejects.toMatchObject({ code: "REFUSED_BY_FILTER" });
  });

  it.each(["Class was great, passed my assessment", "Scunthorpe has a lovely grass field", "Went to Sembawang for a cocktail", "The analyst said hello", "Shiitake mushrooms for dinner"])(
    "lets through innocent text that only contains a bad word's letters: %j",
    async (text) => {
      const { signUp } = await createTestApp({ now: "2026-11-12T09:00:00+08:00" });
      await (await signUp(TAN)).me.submitFeeling(feeling(text));
    },
  );
});

describe("the rules of a Feeling", () => {
  it("takes plain text in any language, up to 100 characters", async () => {
    const { signUp } = await createTestApp({ now: "2026-11-12T09:00:00+08:00" });
    const { me } = await signUp(TAN);
    expect((await me.submitFeeling(feeling("今天的天气真好 😀", "天气"))).hashtag).toBe("天气");
    const lim = (await signUp(LIM)).me;
    await expect(lim.submitFeeling(feeling("a".repeat(101)))).rejects.toMatchObject({ code: "TEXT_TOO_LONG" });
    await expect(lim.submitFeeling(feeling(" "))).rejects.toMatchObject({ code: "TEXT_EMPTY" });
    await expect(lim.submitFeeling(feeling("Fine", "thirteenchars"))).rejects.toMatchObject({ code: "INVALID_HASHTAG" });
    await expect(lim.submitFeeling({ text: "Fine", hashtag: "ok", polarity: "meh" as "good" })).rejects.toMatchObject({ code: "INVALID_POLARITY" });
    await lim.submitFeeling(feeling("a".repeat(100)));
  });

  it.each(["Read this https://example.com", "see www.example.com now", "go to example.com/page"])("refuses a link: %j", async (text) => {
    const { signUp } = await createTestApp({ now: "2026-11-12T09:00:00+08:00" });
    await expect((await signUp(TAN)).me.submitFeeling(feeling(text))).rejects.toMatchObject({ code: "NO_LINKS" });
  });

  it("keeps line breaks and extra spaces out, so a Feeling is one line", async () => {
    const { signUp } = await createTestApp({ now: "2026-11-12T09:00:00+08:00" });
    expect((await (await signUp(TAN)).me.submitFeeling(feeling("So\n\nmany   spaces"))).text).toBe("So many spaces");
  });
});

describe("Hashtags in use today", () => {
  it("lists the Cycle's Hashtags, most used first, merging near-duplicates, and starts again each Cycle", async () => {
    const { app, signUp, clock } = await createTestApp({ now: "2026-11-12T09:00:00+08:00" });
    await (await signUp(TAN)).me.submitFeeling(feeling("One", "#LKY"));
    await (await signUp(LIM)).me.submitFeeling(feeling("Two", "lky", "bad"));
    await (await signUp({ ...TAN, subject: "s-3" })).me.submitFeeling(feeling("Three", "mrt"));
    expect(await app.hashtagsInUse()).toEqual(["lky", "mrt"]);
    clock.set("2026-11-13T09:00:00+08:00");
    expect(await app.hashtagsInUse()).toEqual([]);
  });
});

describe("the state of a Submitter's Feeling", () => {
  it("is expired once its Cycle has passed without it winning", async () => {
    const { signUp, clock } = await createTestApp({ now: "2026-11-12T09:00:00+08:00" });
    const { me } = await signUp(TAN);
    await me.submitFeeling(feeling("Thursday"));
    clock.set("2026-11-13T00:00:00+08:00");
    expect((await me.myFeelings())[0]?.state).toBe("expired");
  });

  it("is only ever shown to its own Submitter", async () => {
    const { signUp } = await createTestApp({ now: "2026-11-12T09:00:00+08:00" });
    await (await signUp(TAN)).me.submitFeeling(feeling("Mine"));
    expect(await (await signUp(LIM)).me.myFeelings()).toEqual([]);
  });
});
