import type { Db } from "@/db";
import type { Clock } from "./ports";
import { UserFacingError } from "./errors";
import { createSiteSetting } from "./site-settings";

/**
 * The Front page look: how the first screen of the front page is laid out in the Classic Design.
 * The same Feelings and the same voting screen whichever is chosen; only their presentation
 * changes. An Admin picks one for everyone. The other Designs each bring their own first screen.
 */
export const FRONT_PAGE_LOOKS = ["original", "sunrise", "highlighter", "postcards"] as const;

export type FrontPageLook = (typeof FRONT_PAGE_LOOKS)[number];

/** What everyone sees until an Admin chooses otherwise. */
export const DEFAULT_FRONT_PAGE_LOOK: FrontPageLook = "original";

export const isFrontPageLook = (value: unknown): value is FrontPageLook => typeof value === "string" && (FRONT_PAGE_LOOKS as readonly string[]).includes(value);

export class LookError extends UserFacingError<"NO_SUCH_LOOK"> {}

export function createFrontPageLook(deps: { db: Db; clock: Clock }) {
  const setting = createSiteSetting(deps, "front-page-look", FRONT_PAGE_LOOKS, DEFAULT_FRONT_PAGE_LOOK);
  return {
    current: setting.current,
    async set(look: string): Promise<FrontPageLook> {
      if (!(await setting.set(look))) throw new LookError("NO_SUCH_LOOK", "That isn't one of the front page looks.");
      return look as FrontPageLook;
    },
  };
}
