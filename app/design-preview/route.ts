import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { isDesign } from "@/core/app";
import { mayPreviewDesigns, PREVIEW_COOKIE } from "@/web/design";

/**
 * `/design-preview?design=mrt` shows this browser the whole site in that Design, for an Admin to
 * look through before switching everyone; `/design-preview?stop` ends it. To anyone else it does
 * nothing but send them to the front page.
 */
export async function GET(request: NextRequest) {
  const asked = request.nextUrl.searchParams.get("design");
  const jar = await cookies();
  if (request.nextUrl.searchParams.has("stop")) jar.delete(PREVIEW_COOKIE);
  else if (isDesign(asked) && (await mayPreviewDesigns())) jar.set(PREVIEW_COOKIE, asked, { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" });
  return NextResponse.redirect(new URL("/", request.url));
}
