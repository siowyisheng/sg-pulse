"use client";

import { CircleAlert, Lightbulb, TriangleAlert } from "lucide-react";
import { startTransition, useActionState, useState, type FormEvent } from "react";
import { FEEDBACK_MAX_CHARACTERS } from "@/core/feedback";
import { Button } from "@/ui/buttons";
import { sendFeedbackAction } from "./actions";
import { useAppName } from "@/ui/app-name";

/** Characters as a person counts them, so an emoji is one. */
const characters = (text: string) => [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)].length;

/** `page` is where the person was when they chose Feedback, so the owner knows what they were looking at. */
export function FeedbackForm({ page }: { page: string }) {
  const [state, send, busy] = useActionState(sendFeedbackAction, {});
  const name = useAppName();
  const [kind, setKind] = useState("");
  const [message, setMessage] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const left = FEEDBACK_MAX_CHARACTERS - characters(message.trim());
  // Sent by hand, not as the form's own action: the browser would clear the fields after every try, even a refused one.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(() => send(form));
  }
  if (state.done) {
    return (
      <div className="stack">
        <p role="status">Thanks, we got it.</p>
        <a href="/">Back to {name}</a>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="stack">
      <fieldset className="toggle">
        <legend>What is it?</legend>
        <label className="toggle-option toggle-neutral">
          <input type="radio" name="kind" value="problem" required checked={kind === "problem"} onChange={() => setKind("problem")} />
          <span>
            <TriangleAlert aria-hidden="true" size={20} /> Problem
          </span>
        </label>
        <label className="toggle-option toggle-neutral">
          <input type="radio" name="kind" value="suggestion" required checked={kind === "suggestion"} onChange={() => setKind("suggestion")} />
          <span>
            <Lightbulb aria-hidden="true" size={20} /> Suggestion
          </span>
        </label>
      </fieldset>
      <label className="field">
        Your message
        <textarea name="message" rows={5} required value={message} onChange={(event) => setMessage(event.target.value)} aria-describedby="message-left" />
        <span id="message-left" className={left < 0 ? "field-note over" : "field-note"} aria-live="polite">
          {left < 0 ? `${-left} over` : `${left} left`}
        </span>
      </label>
      <label className="field">
        Reply to (optional)
        <input name="replyTo" type="email" inputMode="email" autoComplete="email" maxLength={254} autoCapitalize="none" value={replyTo} onChange={(event) => setReplyTo(event.target.value)} />
        <span className="field-note">Only if you&apos;d like a reply. We use it to answer you and don&apos;t keep it.</span>
      </label>
      {/* A trap for bots: no person sees or tabs into it. */}
      <div className="trap" aria-hidden="true">
        <input name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <input type="hidden" name="page" value={page} />
      {state.message && (
        <p className="problem" role="alert">
          <CircleAlert aria-hidden="true" size={18} /> {state.message}
        </p>
      )}
      <Button variant="yah-lah" type="submit" disabled={busy}>
        Send
      </Button>
    </form>
  );
}
