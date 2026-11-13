import { PushSubscriptionGoneError, type Clock, type Email, type Mailer, type WebPush, type WebPushPayload, type WebPushSubscription } from "@/core/ports";

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
  private gone = new Set<string>();

  /** Make every send fail with `error`, as if the push service were down. */
  failWith(error: Error | undefined) {
    this.outage = error;
  }

  /** The push service now reports this endpoint as gone. */
  expire(endpoint: string) {
    this.gone.add(endpoint);
  }

  async send(subscription: WebPushSubscription, payload: WebPushPayload) {
    if (this.gone.has(subscription.endpoint)) throw new PushSubscriptionGoneError("gone");
    if (this.outage) throw this.outage;
    this.sent.push({ subscription, payload });
  }
}

export class FakeMailer implements Mailer {
  readonly sent: Email[] = [];
  private outage: Error | undefined;

  /** Make every send fail with `error`, as if the mail provider were down. */
  failWith(error: Error | undefined) {
    this.outage = error;
  }

  async send(email: Email) {
    if (this.outage) throw this.outage;
    this.sent.push(email);
  }
}

/** Dice that roll the same way every time for the same seed, so a jumble can be repeated in a test. */
export class FakeRandom {
  private state = 1;

  seed(seed: number) {
    this.state = seed;
  }

  /** Mulberry32. */
  next = (): number => {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
