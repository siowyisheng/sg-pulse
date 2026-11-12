"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { messageOf } from "@/web/forms";
import { clearSessionCookie, currentMe } from "@/web/session";

/** Asks for one of the User's published winners to be removed. The page shows the request by loading again. */
export async function requestRemovalAction(feelingId: string): Promise<void> {
  const me = await currentMe();
  if (!me) redirect("/sign-in");
  try {
    await me.requestRemoval(feelingId);
  } catch (error) {
    messageOf(error);
  }
  revalidatePath("/me");
}

/** Deletes the account, and with it this browser's session. */
export async function deleteAccountAction(form: FormData): Promise<void> {
  const me = await currentMe();
  if (!me) redirect("/sign-in");
  await me.deleteAccount({ alsoRemoveWinners: form.get("alsoRemoveWinners") === "on" });
  await clearSessionCookie();
  redirect("/?deleted=1");
}
