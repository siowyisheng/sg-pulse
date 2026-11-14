import { cache } from "react";
import type { AppName } from "@/core/app";
import { getApp } from "@/composition";

/** How each App name is written on the screens. */
export const APP_NAME_TEXT: Record<AppName, string> = {
  "yah-lah": "Yah Lah",
  "sg-pulse": "SG Pulse",
  "how-is-singapore": "How Is Singapore",
  "sg-feels": "SG Feels",
  "shiok-or-not": "Shiok or Not",
  "today-in-sg": "Today in SG",
};

/** What the site calls itself for this request, as words. Asked once per request. */
export const currentAppName = cache(async (): Promise<string> => APP_NAME_TEXT[await (await getApp()).appName()]);
