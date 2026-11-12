import { cookies } from "next/headers";
import { cache } from "react";
import type { Me, Session } from "@/core/app";
import { getApp } from "@/composition";

const COOKIE = "yl_session";
/**
 * The session itself runs out 90 days after the last visit, which the application keeps track of.
 * The cookie only has to outlast that, so it is given the longest life browsers allow.
 */
const COOKIE_MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

/** Remembers the session in the browser: not readable by scripts, only sent over HTTPS and to our own site. */
export async function setSessionCookie(session: Session) {
  (await cookies()).set(COOKIE, session.token, {
    httpOnly: true,
    // Always on in production. Browsers also accept it on http://localhost.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(COOKIE);
}

export async function currentToken(): Promise<string | undefined> {
  return (await cookies()).get(COOKIE)?.value;
}

/** The signed-in User for this request, if there is one. Asked once per request, however many places need it. */
export const currentMe = cache(async (): Promise<Me | undefined> => {
  const token = await currentToken();
  return token ? (await getApp()).authenticate(token) : undefined;
});
