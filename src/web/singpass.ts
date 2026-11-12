import { cookies } from "next/headers";
import { SINGPASS_MESSAGES, type SingpassErrorCode } from "@/core/errors";
import { isDemoMode } from "@/demo-flag";

const PROOF_COOKIE = "yl_singpass";
const STATE_COOKIE = "yl_singpass_state";
/** As long as a Singpass login lasts. */
const MAX_AGE_SECONDS = 15 * 60;

const options = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};

/**
 * Whether logging in can work here. Only the demo's fake Singpass exists so far; the real one
 * arrives with its own ticket, and until then the site offers no way to log in.
 */
export const isSingpassConnected = () => isDemoMode();

/** The login's state, kept by the browser that started it: only that browser can finish it. */
export async function setSingpassState(state: string) {
  (await cookies()).set(STATE_COOKIE, state, options);
}

/** The state this browser kept, used up as it is read. */
export async function takeSingpassState(): Promise<string | undefined> {
  const jar = await cookies();
  const state = jar.get(STATE_COOKIE)?.value;
  jar.delete(STATE_COOKIE);
  return state;
}

/** Keeps a new person's one-use proof while they read the consent screen; scripts can't read it. */
export async function setSingpassProof(proof: string) {
  (await cookies()).set(PROOF_COOKIE, proof, options);
}

export async function singpassProof(): Promise<string | undefined> {
  return (await cookies()).get(PROOF_COOKIE)?.value;
}

export async function clearSingpassProof() {
  (await cookies()).delete(PROOF_COOKIE);
}

/** Problems shown on the log-in page, by code: the URL never carries the words. */
const PROBLEMS: Record<string, string> = {
  ...SINGPASS_MESSAGES,
  CANCELLED: "You didn't finish logging in with Singpass.",
};

export type SingpassProblem = SingpassErrorCode | "CANCELLED";

/** The code to show for an error from a Singpass login; anything unexpected is logged and shown generically. */
export function singpassProblemOf(error: unknown): SingpassProblem {
  if (error instanceof Error && "code" in error && typeof error.code === "string" && Object.hasOwn(SINGPASS_MESSAGES, error.code)) {
    return error.code as SingpassErrorCode;
  }
  console.error(error);
  return "SINGPASS_FAILED";
}

/** What went wrong on the trip to Singpass, from the page's `problem` search parameter; unknown codes show nothing. */
export function singpassProblem(param: string | string[] | undefined): string | undefined {
  return typeof param === "string" && Object.hasOwn(PROBLEMS, param) ? PROBLEMS[param] : undefined;
}
