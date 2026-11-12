"use client";

import { CircleAlert } from "lucide-react";
import { startTransition, useActionState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/ui/buttons";
import { FeelingFields } from "@/ui/feeling-fields";
import { submitFeelingAction } from "./actions";

/** `reminder` is the note on what becomes public, shown above the button at every submission. */
export function SubmitForm({ hashtagsInUse, reminder }: { hashtagsInUse: string[]; reminder: ReactNode }) {
  const [state, send, busy] = useActionState(submitFeelingAction, {});
  // Sent by hand, not as the form's own action: the browser would clear the fields after every try, even a refused one.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(() => send(form));
  }
  return (
    <form onSubmit={submit} className="stack">
      <FeelingFields hashtagsInUse={hashtagsInUse} />
      {state.message && (
        <p className="problem" role="alert">
          <CircleAlert aria-hidden="true" size={18} /> {state.message}
        </p>
      )}
      {reminder}
      <Button variant="yah-lah" type="submit" disabled={busy}>
        Submit
      </Button>
    </form>
  );
}
