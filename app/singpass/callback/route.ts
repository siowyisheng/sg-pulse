import { NextResponse, type NextRequest } from "next/server";
import { getApp } from "@/composition";
import { setSessionCookie } from "@/web/session";
import { setSingpassProof, singpassProblemOf, takeSingpassState, type SingpassProblem } from "@/web/singpass";

export const dynamic = "force-dynamic";

/**
 * Singpass sends the browser back here with a code (or an error). The answer is checked, then a
 * User is signed in, and someone new goes to the consent screen with a one-use proof kept in a
 * cookie scripts can't read.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const to = (path: string) => NextResponse.redirect(new URL(path, request.url));
  // Only codes go in the URL, so nobody can make the page show words of their choosing.
  const back = (problem: SingpassProblem) => to(`/sign-in?problem=${problem}`);
  const browserState = await takeSingpassState();
  const state = params.get("state");
  const code = params.get("code");
  // Someone who cancels on Singpass's page comes back with an error and no code.
  if (!state || !code) return back("CANCELLED");
  try {
    const result = await (await getApp()).finishSingpass({ state, code, browserState });
    if (result.outcome === "signed-in") {
      await setSessionCookie(result.session);
      return to("/");
    }
    await setSingpassProof(result.proof);
    return to("/welcome");
  } catch (error) {
    return back(singpassProblemOf(error));
  }
}
