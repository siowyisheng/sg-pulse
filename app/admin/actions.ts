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

/** Approves one of the top three; a problem (it has dropped out of the three, say) shows on the page after it reloads. */
export async function approveAction(feelingId: string): Promise<void> {
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
  redirect(missed ? "/admin?problem=NOT_A_CHOICE" : "/admin");
}

export async function withdrawApprovalAction(polarity: Polarity): Promise<void> {
  const me = await currentMe();
  if (!me?.isAdmin) return;
  await me.asAdmin().withdrawApproval(polarity);
  revalidatePath("/admin");
}
