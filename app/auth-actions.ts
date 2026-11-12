"use server";

import { redirect } from "next/navigation";
import { getApp } from "@/composition";
import { clearSessionCookie, currentToken, setSessionCookie } from "@/web/session";
import { clearSingpassProof, isSingpassConnected, setSingpassState, singpassProblemOf, singpassProof } from "@/web/singpass";

/** Sends the browser to Singpass to log in; a problem is shown back on the log-in page. */
export async function startSingpassAction(): Promise<void> {
  if (!isSingpassConnected()) redirect("/");
  let url: string;
  try {
    const login = await (await getApp()).startSingpass();
    await setSingpassState(login.state);
    url = login.url;
  } catch (error) {
    url = `/sign-in?problem=${singpassProblemOf(error)}`;
  }
  redirect(url);
}

/** The person agrees on the consent screen: they become a User and are signed in. */
export async function confirmConsentAction(): Promise<void> {
  const proof = await singpassProof();
  if (!proof) redirect("/sign-in?problem=SINGPASS_EXPIRED");
  let problem: string | undefined;
  try {
    await setSessionCookie(await (await getApp()).confirmConsent(proof));
    await clearSingpassProof();
  } catch (error) {
    problem = singpassProblemOf(error);
  }
  // Right after joining is when to offer the daily notification, if the site has it switched on.
  redirect(problem ? `/sign-in?problem=${problem}` : process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? "/notifications" : "/");
}

/** The person decides not to join: nothing is kept. */
export async function declineConsentAction(): Promise<void> {
  await clearSingpassProof();
  redirect("/");
}

export async function signOutAction(): Promise<void> {
  const token = await currentToken();
  if (token) await (await getApp()).signOut(token);
  await clearSessionCookie();
  redirect("/");
}
