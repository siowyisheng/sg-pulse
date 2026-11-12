"use client";

import { CircleAlert } from "lucide-react";
import { startTransition, useActionState, type FormEvent } from "react";
import { Button } from "@/ui/buttons";
import { FeelingFields } from "@/ui/feeling-fields";
import { scheduleSeedFeelingAction } from "./actions";

/** Writes a Seed Feeling and schedules it for a Cycle. */
export function SeedForm({ firstCycle, defaultCycle }: { firstCycle: string; defaultCycle: string }) {
  const [state, send, busy] = useActionState(scheduleSeedFeelingAction, {});
  // Sent by hand, not as the form's own action: the browser would clear the fields after every try, even a refused one.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(() => send(form));
  }
  return (
    // The key clears the form after each Seed Feeling goes in.
    <form key={state.done ?? 0} onSubmit={submit} className="stack">
      <FeelingFields />
      <label className="field">
        Day it shows as the Feeling of the Day
        <input type="date" name="cycle" required min={firstCycle} defaultValue={defaultCycle} />
      </label>
      {state.message && (
        <p className="problem" role="alert">
          <CircleAlert aria-hidden="true" size={18} /> {state.message}
        </p>
      )}
      <Button variant="secondary" type="submit" disabled={busy}>
        Schedule
      </Button>
    </form>
  );
}
