import { getApp } from "@/composition";
import { isFromTheScheduler } from "@/web/cron";

export const dynamic = "force-dynamic";

/**
 * Run once a day by Vercel's scheduler at 07:00 in Singapore (see vercel.json): sends the daily
 * push, and removes what the record of submissions, Reports and Admin actions holds of over a year ago.
 * If it never runs, nothing breaks: the push is only a nudge, and running it twice does no harm.
 */
export async function GET(request: Request) {
  if (!isFromTheScheduler(request)) return new Response("Unauthorized", { status: 401 });
  const app = await getApp();
  const push = await app.operator.sendDailyPush();
  return Response.json({ push, logs: await app.operator.purgeOldLogs() });
}
