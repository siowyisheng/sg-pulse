import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { schema } from "@/db";
import type { Clock } from "./ports";

/**
 * One choice an Admin makes from the site for everyone, out of a fixed set, kept as a row of
 * `site_settings`. A missing row, or one naming a choice since retired, reads as the default.
 */
export function createSiteSetting<T extends string>({ db, clock }: { db: Db; clock: Clock }, name: string, choices: readonly T[], fallback: T) {
  const isChoice = (value: unknown): value is T => typeof value === "string" && (choices as readonly string[]).includes(value);
  return {
    isChoice,
    async current(): Promise<T> {
      const [row] = await db.select({ value: schema.siteSettings.value }).from(schema.siteSettings).where(eq(schema.siteSettings.name, name));
      return isChoice(row?.value) ? row.value : fallback;
    },
    /** False, changing nothing, when `value` isn't one of the choices. */
    async set(value: string): Promise<boolean> {
      if (!isChoice(value)) return false;
      const updatedAt = clock.now();
      await db
        .insert(schema.siteSettings)
        .values({ name, value, updatedAt })
        .onConflictDoUpdate({ target: schema.siteSettings.name, set: { value, updatedAt } });
      return true;
    },
  };
}
