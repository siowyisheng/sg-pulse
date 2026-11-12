"use server";

import { redirect } from "next/navigation";
import { getApp } from "@/composition";
import { isDemoMode } from "@/demo-flag";
import { currentMe } from "@/web/session";

/** Demo mode only: stands in for the operator's `npm run admin -- grant`. */
export async function becomeAdminInDemoAction(): Promise<void> {
  if (!isDemoMode()) return;
  const me = await currentMe();
  if (me) await (await getApp()).operator.makeAdmin(me.userId);
  redirect("/admin");
}
