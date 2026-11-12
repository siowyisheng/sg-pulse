"use server";

import { revalidatePath } from "next/cache";
import { messageOf } from "@/web/forms";
import { currentMe } from "@/web/session";

/** What an Upvote action hands back: nothing when it worked, or what to tell the person. */
type Outcome = { message?: string };

export async function upvoteAction(feelingId: string): Promise<Outcome> {
  const me = await currentMe();
  if (!me) return { message: "Please log in again." };
  try {
    await me.upvote(feelingId);
  } catch (error) {
    return { message: messageOf(error) };
  }
  return {};
}

export async function undoUpvoteAction(): Promise<Outcome> {
  const me = await currentMe();
  if (!me) return { message: "Please log in again." };
  try {
    await me.undoUpvote();
  } catch (error) {
    return { message: messageOf(error) };
  }
  return {};
}

/** The same, from the My Feelings page, which shows the result by loading again. */
export async function undoUpvoteFromMyFeelingsAction(): Promise<void> {
  await undoUpvoteAction();
  revalidatePath("/me");
}
