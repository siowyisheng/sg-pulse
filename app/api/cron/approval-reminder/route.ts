import { timingSafeEqual } from "node:crypto";
import { getApp } from "@/composition";

export const dynamic = "force-dynamic";

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/**
 * Run once a day by Vercel's scheduler, a few hours before midnight in Singapore (see vercel.json):
 * reminds the Admins when a Polarity still has no Approval. Vercel sends CRON_SECRET with the call;
 * nobody else can trigger it. If it never runs, nothing breaks: the Carry-over covers a missed Approval.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !same(request.headers.get("authorization") ?? "", `Bearer ${secret}`)) {
    return new Response("Unauthorized", { status: 401 });
  }
  return Response.json(await (await getApp()).operator.sendApprovalReminder());
}
