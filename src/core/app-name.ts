import type { Db } from "@/db";
import type { Clock } from "./ports";
import { UserFacingError } from "./errors";
import { createSiteSetting } from "./site-settings";

/**
 * The App name: what the site calls itself on its screens and in browser tabs, chosen by an Admin
 * for everyone. The Upvote keeps its "Yah Lah" label whatever the App name is.
 */
export const APP_NAMES = ["yah-lah", "sg-pulse", "how-is-singapore", "sg-feels", "shiok-or-not", "today-in-sg"] as const;

export type AppName = (typeof APP_NAMES)[number];

export const DEFAULT_APP_NAME: AppName = "yah-lah";

export const isAppName = (value: unknown): value is AppName => typeof value === "string" && (APP_NAMES as readonly string[]).includes(value);

export class AppNameError extends UserFacingError<"NO_SUCH_APP_NAME"> {}

export function createAppName(deps: { db: Db; clock: Clock }) {
  const setting = createSiteSetting(deps, "app-name", APP_NAMES, DEFAULT_APP_NAME);
  return {
    current: setting.current,
    async set(name: string): Promise<AppName> {
      if (!(await setting.set(name))) throw new AppNameError("NO_SUCH_APP_NAME", "That isn't one of the App names.");
      return name as AppName;
    },
  };
}
