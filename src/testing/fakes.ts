import type { Clock, WebPush, WebPushPayload, WebPushSubscription } from "@/core/ports";

interface Duration {
  hours?: number;
  minutes?: number;
}

export class FakeClock implements Clock {
  private current: Date;

  constructor(start: string | Date) {
    this.current = new Date(start);
  }

  now() {
    return new Date(this.current);
  }

  /** Jump to a moment, e.g. "2026-12-04T19:30:00+08:00". */
  set(moment: string | Date) {
    this.current = new Date(moment);
  }

  advance({ hours = 0, minutes = 0 }: Duration) {
    this.current = new Date(this.current.getTime() + (hours * 60 + minutes) * 60_000);
  }
}

export class FakeWebPush implements WebPush {
  readonly sent: { subscription: WebPushSubscription; payload: WebPushPayload }[] = [];
  private outage: Error | undefined;

  /** Make every send fail with `error`, as if the push service were down. */
  failWith(error: Error | undefined) {
    this.outage = error;
  }

  async send(subscription: WebPushSubscription, payload: WebPushPayload) {
    if (this.outage) throw this.outage;
    this.sent.push({ subscription, payload });
  }
}
