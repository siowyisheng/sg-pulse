"use client";

import { useState } from "react";
import type { DemoPersona } from "@/demo-personas";
import { Button } from "@/ui/buttons";
import { Card } from "@/ui/card";

/** Text as base64url, the way the fake Singpass reads its codes. */
function base64url(text: string): string {
  const binary = String.fromCharCode(...new TextEncoder().encode(text));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Sends the browser back to the callback with a code that carries the chosen person, like Singpass would. */
export function FakeSingpassForm({ state, personas }: { state: string; personas: DemoPersona[] }) {
  const [chosen, setChosen] = useState<DemoPersona>(personas[0]!);
  const set = (change: Partial<DemoPersona>) => setChosen((current) => ({ ...current, ...change }));
  const callback = `/auth/singpass/callback?state=${encodeURIComponent(state)}`;

  const agree = () => {
    const { subject, name, dateOfBirth, sex } = chosen;
    window.location.href = `${callback}&code=${encodeURIComponent(base64url(JSON.stringify({ subject, name, dateOfBirth, sex })))}`;
  };

  return (
    <Card className="stack">
      <label className="field">
        Log in as
        <select value={chosen.subject} onChange={(e) => setChosen(personas.find((p) => p.subject === e.target.value) ?? personas[0]!)}>
          {personas.map((p) => (
            <option key={p.subject} value={p.subject}>
              {p.name}
              {p.note ? ` (${p.note})` : ""}
            </option>
          ))}
        </select>
      </label>
      <h2>Shared with Yah Lah</h2>
      <label className="field">
        Name
        <input value={chosen.name} onChange={(e) => set({ name: e.target.value })} />
      </label>
      <label className="field">
        Date of birth
        <input type="date" value={chosen.dateOfBirth} onChange={(e) => set({ dateOfBirth: e.target.value })} />
      </label>
      <label className="field">
        Sex
        <select value={chosen.sex} onChange={(e) => set({ sex: e.target.value })}>
          <option value="F">F (female)</option>
          <option value="M">M (male)</option>
          <option value="U">U (unknown)</option>
        </select>
      </label>
      <label className="field">
        Identity (a made-up Singpass ID; change it to be someone new)
        <input value={chosen.subject} onChange={(e) => set({ subject: e.target.value })} />
      </label>
      <div className="actions">
        <Button variant="secondary" onClick={agree}>
          I agree to share these details
        </Button>
        {/* Like Singpass, a cancel comes back to the callback with an error and no code. */}
        <Button variant="ghost" onClick={() => (window.location.href = `${callback}&error=access_denied`)}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}
