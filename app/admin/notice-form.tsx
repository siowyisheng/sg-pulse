"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import { Button } from "@/ui/buttons";
import { setCorrectionNoticeAction } from "./actions";

/** Adds, changes or (when left empty) lifts the correction notice on a published Feeling. */
export function NoticeForm({ feelingId, notice }: { feelingId: string; notice: string | null }) {
  const [state, send, busy] = useActionState(setCorrectionNoticeAction.bind(null, feelingId), {});
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(() => send(form));
  }
  return (
    <form onSubmit={submit} className="stack">
      <label className="field">
        Correction notice (shown on the Feeling everywhere; leave empty to lift it)
        <textarea name="notice" rows={3} maxLength={500} defaultValue={notice ?? ""} />
      </label>
      <div className="feeling-meta">
        <Button variant="ghost" type="submit" disabled={busy}>
          Save notice
        </Button>
        {state.message && (
          <span className="caption muted" role="status">
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}
