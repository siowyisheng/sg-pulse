import { cookies } from "next/headers";
import { cache } from "react";
import { isDesign, type Design } from "@/core/app";
import { getApp } from "@/composition";
import { isDemoMode } from "@/demo-flag";
import { currentMe } from "./session";

/** An Admin trying a Design out before switching everyone to it. Only that browser sees it. */
export const PREVIEW_COOKIE = "yl_design_preview";

/** Who may preview: an Admin, or anyone in the local demo. */
export async function mayPreviewDesigns(): Promise<boolean> {
  return isDemoMode() || ((await currentMe())?.isAdmin ?? false);
}

/** The Design this request is shown in: the one an Admin chose, or the one they are previewing. Asked once per request. */
export const currentDesign = cache(async (): Promise<{ design: Design; previewing: boolean }> => {
  const chosen = await (await getApp()).design();
  const asked = (await cookies()).get(PREVIEW_COOKIE)?.value;
  if (isDesign(asked) && asked !== chosen && (await mayPreviewDesigns())) return { design: asked, previewing: true };
  return { design: chosen, previewing: false };
});
