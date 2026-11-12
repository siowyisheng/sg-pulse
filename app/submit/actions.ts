"use server";

import { redirect } from "next/navigation";
import type { Polarity } from "@/core/feeling-rules";
import { messageOf, type FormState } from "@/web/forms";
import { currentMe } from "@/web/session";

export async function submitFeelingAction(_previous: FormState, form: FormData): Promise<FormState> {
  const me = await currentMe();
  if (!me) return { message: "Please log in again." };
  try {
    await me.submitFeeling({
      text: String(form.get("text") ?? ""),
      polarity: String(form.get("polarity") ?? "") as Polarity,
      hashtag: String(form.get("hashtag") ?? ""),
    });
  } catch (error) {
    return { message: messageOf(error) };
  }
  redirect("/me");
}
