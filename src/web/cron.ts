import { timingSafeEqual } from "node:crypto";

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Whether a call to a scheduled job came from Vercel's scheduler, which sends CRON_SECRET with it. Nobody else can run one. */
export function isFromTheScheduler(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && same(request.headers.get("authorization") ?? "", `Bearer ${secret}`);
}
