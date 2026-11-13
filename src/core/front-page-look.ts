import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { schema } from "@/db";
import type { Clock } from "./ports";
import { UserFacingError } from "./errors";

/**
 * The Front page look: how the first screen of the front page is laid out. The same Feelings and
 * the same voting screen whichever is chosen; only their presentation changes. An Admin picks one
 * for everyone.
 */
export const FRONT_PAGE_LOOKS = ["original", "sunrise", "highlighter", "postcards"] as const;

export type FrontPageLook = (typeof FRONT_PAGE_LOOKS)[number];

/** What everyone sees until an Admin chooses otherwise. */
export const DEFAULT_FRONT_PAGE_LOOK: FrontPageLook = "original";

export const isFrontPageLook = (value: unknown): value is FrontPageLook => typeof value === "string" && (FRONT_PAGE_LOOKS as readonly string[]).includes(value);

export class LookError extends UserFacingError<"NO_SUCH_LOOK"> {}

const SETTING = "front-page-look";

export function createFrontPageLook({ db, clock }: { db: Db; clock: Clock }) {
  return {
    async current(): Promise<FrontPageLook> {
      const [row] = await db.select({ value: schema.siteSettings.value }).from(schema.siteSettings).where(eq(schema.siteSettings.name, SETTING));
      // A look that has since been retired falls back to the default rather than breaking the page.
      return isFrontPageLook(row?.value) ? row.value : DEFAULT_FRONT_PAGE_LOOK;
    },
    async set(look: string): Promise<FrontPageLook> {
      if (!isFrontPageLook(look)) throw new LookError("NO_SUCH_LOOK", "That isn't one of the front page looks.");
      const updatedAt = clock.now();
      await db
        .insert(schema.siteSettings)
        .values({ name: SETTING, value: look, updatedAt })
        .onConflictDoUpdate({ target: schema.siteSettings.name, set: { value: look, updatedAt } });
      return look;
    },
  };
}
