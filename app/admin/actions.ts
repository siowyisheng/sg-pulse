"use server";

import { revalidatePath } from "next/cache";
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
