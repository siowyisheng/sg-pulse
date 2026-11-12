import type { Singpass, SingpassPerson } from "@/core/ports";

/**
 * A stand-in for Singpass, for tests and the demo. Its login page is ours; the "code" it hands back
 * simply carries the chosen person, so the same callback and checks run as with the real Singpass.
 */
export function createFakeSingpass(loginPage = "/demo/singpass"): Singpass {
  return {
    async authorize({ state }) {
      return { url: `${loginPage}?state=${encodeURIComponent(state)}` };
    },
    async exchange({ code }) {
      let person: unknown;
      try {
        person = JSON.parse(Buffer.from(code, "base64url").toString("utf8"));
      } catch {
        throw new Error("The fake Singpass code is not a person");
      }
      if (!isPerson(person)) throw new Error("The fake Singpass code is not a person");
      return person;
    },
  };
}

/** The code the fake Singpass hands back for this person. */
export const codeFor = (person: SingpassPerson): string => Buffer.from(JSON.stringify(person)).toString("base64url");

function isPerson(value: unknown): value is SingpassPerson {
  if (typeof value !== "object" || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.subject === "string" &&
    p.subject !== "" &&
    typeof p.name === "string" &&
    typeof p.dateOfBirth === "string" &&
    typeof p.sex === "string"
  );
}
