import { getApp } from "@/composition";
import { isFromTheScheduler } from "@/web/cron";

export const dynamic = "force-dynamic";

/**
 * Run once a day by Vercel's scheduler, a few hours before midnight in Singapore (see vercel.json):
 * reminds the Admins when a Polarity still has no Approval. If it never runs, nothing breaks: the
 * Carry-over covers a missed Approval.
 */
export async function GET(request: Request) {
  if (!isFromTheScheduler(request)) return new Response("Unauthorized", { status: 401 });
  return Response.json(await (await getApp()).operator.sendApprovalReminder());
}
