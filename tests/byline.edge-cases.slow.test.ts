import { describe, expect, it } from "vitest";
import { bylineText } from "@/core/byline";
import { createTestApp } from "@/testing/harness";

/** The Byline someone would get, joining on 12 Nov 2026. */
async function bylineOf(person: { name?: string; dateOfBirth?: string; sex?: string }) {
  const { signUp } = await createTestApp({ now: "2026-11-12T09:00:00+08:00" });
  const { me } = await signUp({ subject: "s-1", name: "TAN AH KOW", dateOfBirth: "1990-05-01", sex: "M", ...person });
  return me.byline;
}

describe("initials are the first letters of the first two words of the name", () => {
  it.each([
    ["TAN AH KOW", "TA"],
    ["Siow Yi Sheng", "SY"],
    ["MUHAMMAD BIN ABDULLAH", "MA"],
    ["SITI BINTE AHMAD", "SA"],
    ["NUR BINTI HASSAN", "NH"],
    ["RAJ S/O KUMAR", "RK"],
    ["PRIYA D/O SURESH", "PS"],
    ["BIN LADEN TAN", "BL"],
    ["TAN, AH KOW", "TA"],
    ["  o'brien   mary-jane ", "OM"],
    ["CHER", "C"],
    ["陈 伟明", "陈伟"],
  ])("%s is %s", async (name, initials) => {
    expect((await bylineOf({ name })).initials).toBe(initials);
  });
});

describe("the age band comes from the date of birth", () => {
  it.each([
    ["2006-11-12", "20s"], // 20 today
    ["2006-11-13", "<20"],
    ["2008-11-12", "<20"], // 18 today
    ["1996-11-13", "20s"], // 30 tomorrow
    ["1996-11-12", "30s"],
    ["1980-01-01", "40s"],
    ["1970-01-01", "50s"],
    ["1966-11-12", "60+"],
    ["1930-01-01", "60+"],
  ])("born %s is %s", async (dateOfBirth, ageBand) => {
    expect((await bylineOf({ dateOfBirth })).ageBand).toBe(ageBand);
  });
});

describe("what a Byline leaves out", () => {
  it("shows only sex and <18 for a User under 18, with no initials", async () => {
    const byline = await bylineOf({ dateOfBirth: "2008-11-13" }); // 18 tomorrow
    expect(byline).toEqual({ initials: null, sex: "M", ageBand: "<18" });
    expect(bylineText(byline)).toBe("M · <18");
  });

  it("gains its initials on the 18th birthday", async () => {
    const { signUp, app, clock } = await createTestApp({ now: "2026-11-12T23:59:00+08:00" });
    const { session } = await signUp({ subject: "s-1", name: "LIM MEI LING", dateOfBirth: "2008-11-13", sex: "F" });
    clock.advance({ minutes: 1 });
    expect((await app.authenticate(session.token))?.byline).toEqual({ initials: "LM", sex: "F", ageBand: "<20" });
  });

  it("leaves sex out when Myinfo records it as unknown", async () => {
    const byline = await bylineOf({ sex: "U" });
    expect(byline).toEqual({ initials: "TA", sex: null, ageBand: "30s" });
    expect(bylineText(byline)).toBe("TA · 30s");
  });

  it("reads as initials, sex and age band", async () => {
    expect(bylineText(await bylineOf({}))).toBe("TA · M · 30s");
  });
});
