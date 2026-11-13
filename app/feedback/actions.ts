"use server";

import { headers } from "next/headers";
import type { FeedbackKind } from "@/core/feedback";
import { messageOf, type FormState } from "@/web/forms";
import { currentMe } from "@/web/session";

export async function sendFeedbackAction(_previous: FormState, form: FormData): Promise<FormState> {
  const me = await currentMe();
  if (!me) return { message: "Please log in again." };
  try {
    await me.sendFeedback({
      kind: String(form.get("kind") ?? "") as FeedbackKind,
      message: String(form.get("message") ?? ""),
      replyTo: String(form.get("replyTo") ?? ""),
      website: String(form.get("website") ?? ""),
      page: String(form.get("page") ?? ""),
      browser: (await headers()).get("user-agent") ?? "",
    });
  } catch (error) {
    return { message: messageOf(error) };
  }
  return { done: Date.now() };
}
