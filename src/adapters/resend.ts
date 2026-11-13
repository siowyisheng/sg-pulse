import type { Email, Mailer } from "@/core/ports";

/** Sends email through Resend's HTTP API. The message is plain text, so nothing a person wrote is ever read as markup. */
export function createResendMailer({ apiKey, from }: { apiKey: string; from: string }, fetchIt: typeof fetch = fetch): Mailer {
  return {
    async send(email: Email) {
      const response = await fetchIt("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({ from, to: [email.to], subject: email.subject, text: email.text, ...(email.replyTo ? { reply_to: email.replyTo } : {}) }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error(`Resend refused the email: ${response.status} ${(await response.text()).slice(0, 200)}`);
    },
  };
}
