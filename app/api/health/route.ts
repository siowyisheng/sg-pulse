export const dynamic = "force-dynamic";

/** Liveness check for the deploy pipeline. */
export function GET() {
  return Response.json({ ok: true });
}
