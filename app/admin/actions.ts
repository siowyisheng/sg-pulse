"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Polarity } from "@/core/feeling-rules";
import { messageOf, type FormState } from "@/web/forms";
import { currentMe } from "@/web/session";

const NOT_ADMIN = { message: "This is for Admins only." };

export async function scheduleSeedFeelingAction(previous: FormState, form: FormData): Promise<FormState> {
  const me = await currentMe();
  if (!me?.isAdmin) return NOT_ADMIN;
  try {
    await me.asAdmin().scheduleSeedFeeling({
      cycle: String(form.get("cycle") ?? ""),
      polarity: String(form.get("polarity") ?? "") as Polarity,
      text: String(form.get("text") ?? ""),
      hashtag: String(form.get("hashtag") ?? ""),
    });
  } catch (error) {
    return { message: messageOf(error) };
  }
  revalidatePath("/admin");
  return { done: (previous.done ?? 0) + 1 };
}

export async function unscheduleSeedFeelingAction(cycle: string, polarity: Polarity): Promise<void> {
  const me = await currentMe();
  if (!me?.isAdmin) return;
  try {
    await me.asAdmin().unscheduleSeedFeeling({ cycle, polarity });
  } catch (error) {
    messageOf(error);
  }
  revalidatePath("/admin");
}

/** Approves one of the top three; a problem (it has dropped out of the three, say) shows on the page, `back`, after it reloads. */
export async function approveAction(feelingId: string, back: "/admin" | "/admin/approve" = "/admin"): Promise<void> {
  const me = await currentMe();
  if (!me?.isAdmin) return;
  let missed = false;
  try {
    await me.asAdmin().approve(feelingId);
  } catch (error) {
    messageOf(error);
    missed = true;
  }
  // Only a code goes in the address, never words.
  redirect(missed ? `${back}?problem=NOT_A_CHOICE` : back);
}

export async function withdrawApprovalAction(polarity: Polarity, back: "/admin" | "/admin/approve" = "/admin"): Promise<void> {
  const me = await currentMe();
  if (!me?.isAdmin) return;
  await me.asAdmin().withdrawApproval(polarity);
  revalidatePath("/admin");
  revalidatePath(back);
}

/** Clears a Report as innocent; `timeoutDays` 0 lets the reporter off. */
export async function clearReportAction(feelingId: string, timeoutDays: number): Promise<void> {
  const me = await currentMe();
  if (!me?.isAdmin) return;
  try {
    await me.asAdmin().clearReport(feelingId, { timeoutDays });
  } catch (error) {
    messageOf(error);
  }
  revalidatePath("/admin");
}

/** One click: the Feeling is gone, and what replaces it shows when the page reloads. */
export async function takeDownAction(feelingId: string): Promise<void> {
  const me = await currentMe();
  if (!me?.isAdmin) return;
  try {
    await me.asAdmin().takeDown(feelingId);
  } catch (error) {
    messageOf(error);
  }
  revalidatePath("/admin");
}

export async function setCorrectionNoticeAction(feelingId: string, _previous: FormState, form: FormData): Promise<FormState> {
  const me = await currentMe();
  if (!me?.isAdmin) return NOT_ADMIN;
  try {
    await me.asAdmin().setCorrectionNotice(feelingId, String(form.get("notice") ?? ""));
  } catch (error) {
    return { message: messageOf(error) };
  }
  revalidatePath("/admin");
  return { message: "Saved." };
}

/** Switches the front page look for everyone. */
export async function setFrontPageLookAction(look: string): Promise<void> {
  const me = await currentMe();
  if (!me?.isAdmin) return;
  try {
    await me.asAdmin().setFrontPageLook(look);
  } catch (error) {
    messageOf(error);
  }
  revalidatePath("/admin");
  revalidatePath("/");
}

/** Switches the Design of every front-facing screen for everyone. */
export async function setDesignAction(design: string): Promise<void> {
  const me = await currentMe();
  if (!me?.isAdmin) return;
  try {
    await me.asAdmin().setDesign(design);
  } catch (error) {
    messageOf(error);
  }
  revalidatePath("/", "layout");
}

/** Renames the site on its screens for everyone. */
export async function setAppNameAction(name: string): Promise<void> {
  const me = await currentMe();
  if (!me?.isAdmin) return;
  try {
    await me.asAdmin().setAppName(name);
  } catch (error) {
    messageOf(error);
  }
  revalidatePath("/", "layout");
}
