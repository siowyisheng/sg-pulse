import { getApp } from "@/composition";
import { isFromTheScheduler } from "@/web/cron";

export const dynamic = "force-dynamic";

/**
 * Run once a day by Vercel's scheduler at 07:00 in Singapore (see vercel.json): sends the daily
 * push. If it never runs, nothing breaks: the push is only a nudge, and running it twice sends once.
 */
export async function GET(request: Request) {
  if (!isFromTheScheduler(request)) return new Response("Unauthorized", { status: 401 });
  const app = await getApp();
  return Response.json({ push: await app.operator.sendDailyPush() });
}
