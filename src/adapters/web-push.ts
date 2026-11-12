import webpush from "web-push";
import { PushSubscriptionGoneError, type WebPush, type WebPushPayload, type WebPushSubscription } from "@/core/ports";

export interface Vapid {
  /** A mailto: or https: address the push services can reach the operator on. */
  subject: string;
  publicKey: string;
  privateKey: string;
}

/** Self-hosted Web Push, signed with the operator's VAPID keys. No third party sees anything but the encrypted message. */
export function createWebPush(vapid: Vapid): WebPush {
  return {
    async send(subscription: WebPushSubscription, payload: WebPushPayload) {
      try {
        await webpush.sendNotification(
          { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
          JSON.stringify(payload),
          { vapidDetails: vapid, TTL: 6 * 60 * 60, urgency: "normal" },
        );
      } catch (error) {
        // 404 and 410 are the push service's way of saying the browser has unsubscribed.
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) throw new PushSubscriptionGoneError(`The push service says ${subscription.endpoint} is gone`);
        throw error;
      }
    },
  };
}
