"use server";

import { messageOf } from "@/web/forms";
import { currentMe } from "@/web/session";

/** Saves this browser's push subscription for the signed-in User. Hands back what to tell them if it didn't work. */
export async function subscribeToPushAction(subscription: { endpoint: string; p256dh: string; auth: string }): Promise<{ message?: string }> {
  const me = await currentMe();
  if (!me) return { message: "Please log in again." };
  const { endpoint, p256dh, auth } = subscription ?? {};
  if (typeof endpoint !== "string" || typeof p256dh !== "string" || typeof auth !== "string" || !endpoint.startsWith("https://")) {
    return { message: "This browser sent something we couldn't use." };
  }
  try {
    await me.subscribeToPush({ endpoint, p256dh, auth });
  } catch (error) {
    return { message: messageOf(error) };
  }
  return {};
}
