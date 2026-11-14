import type { Db } from "@/db";
import type { Clock } from "./ports";
import { UserFacingError } from "./errors";
import { createSiteSetting } from "./site-settings";

/**
 * The Design: the whole look of every screen a Visitor or User sees (colours, type, shapes and
 * emojis) chosen by an Admin for everyone. The screens, words and journeys are the same in each;
 * only their presentation changes. Classic is the site as first built, with its Front page look.
 */
export const DESIGNS = ["classic", "kopitiam", "hawker", "pasar-malam", "peranakan", "mrt", "void-deck", "garden-city"] as const;

export type Design = (typeof DESIGNS)[number];

export const DEFAULT_DESIGN: Design = "classic";

export const isDesign = (value: unknown): value is Design => typeof value === "string" && (DESIGNS as readonly string[]).includes(value);

export class DesignError extends UserFacingError<"NO_SUCH_DESIGN"> {}

export function createDesign(deps: { db: Db; clock: Clock }) {
  const setting = createSiteSetting(deps, "design", DESIGNS, DEFAULT_DESIGN);
  return {
    current: setting.current,
    async set(design: string): Promise<Design> {
      if (!(await setting.set(design))) throw new DesignError("NO_SUCH_DESIGN", "That isn't one of the Designs.");
      return design as Design;
    },
  };
}
