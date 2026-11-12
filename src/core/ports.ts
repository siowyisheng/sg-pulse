/** External systems the application depends on. Everything here is faked in tests. */

export interface Clock {
  now(): Date;
}

/** A roll of the dice: a number from 0 up to, but not including, 1. Tests bring their own, so a jumble can be repeated. */
export type Random = () => number;

/** What Singpass (Myinfo) tells Yah Lah about a person, with their consent. Never the NRIC or FIN. */
export interface SingpassPerson {
  /** Singpass's identifier for the person (a UUID). */
  subject: string;
  /** Full name as Myinfo records it. Used once to form the Byline's initials, and never stored. */
  name: string;
  /** YYYY-MM-DD. */
  dateOfBirth: string;
  /** Myinfo's sex code: "M", "F" or "U" (unknown). */
  sex: string;
}

/**
 * Singpass login with Myinfo. A login is a round trip: send the browser to `authorize`'s URL, and
 * Singpass sends it back to our callback with a code that `exchange` turns into the person's details.
 * Any error from `exchange` means Singpass didn't vouch for anyone; a NoMyinfoProfileError says the
 * person is real but Singpass holds no Myinfo details for them.
 */
export interface Singpass {
  /**
   * Where to send the browser. `adapterState` is anything the adapter needs back in `exchange` for this
   * login (the real one keeps its one-login proof-of-possession key there).
   */
  authorize(request: { state: string; nonce: string; codeVerifier: string }): Promise<{ url: string; adapterState?: string }>;
  exchange(request: { code: string; nonce: string; codeVerifier: string; adapterState?: string }): Promise<SingpassPerson>;
}

/** A browser's web push subscription, as it hands it over. */
export interface WebPushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface WebPushPayload {
  title: string;
  body: string;
  link?: string;
}

/** Sends a web push to one browser. Any error it throws is a fault; the caller never lets it undo anything. */
export interface WebPush {
  send(subscription: WebPushSubscription, payload: WebPushPayload): Promise<void>;
}

/** Singpass knows the person, but has no Myinfo profile to share: trying again won't help them. */
export class NoMyinfoProfileError extends Error {
  override name = "NoMyinfoProfileError";
}
