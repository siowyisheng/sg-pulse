"use client";

import { Frown, Smile } from "lucide-react";
import { useState } from "react";
import type { Cycle } from "@/core/cycle";
import { MAX_HASHTAG_CHARACTERS, MAX_TEXT_CHARACTERS } from "@/core/feeling-rules";
import { writingPrompt } from "@/web/writing-prompts";
import { Emoji, HashtagLabel, POLARITY_EMOJI } from "./emoji";

/** How many of the Hashtags in use show as buttons to tap: the most used. */
const HASHTAG_CHIPS = 8;

/** Characters as a person counts them, so an emoji is one. */
const characters = (text: string) => [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)].length;

/**
 * The three things every Feeling has: its text (with a count of what's left), a Good or Bad toggle,
 * and one Hashtag, which suggests the ones already in use so near-duplicates merge.
 */
export function FeelingFields({ hashtagsInUse = [], promptDay }: { hashtagsInUse?: string[]; /** The Cycle the Feeling is for, which picks the day's prompt; none, no prompt. */ promptDay?: Cycle }) {
  // All three are kept here, so they survive a refusal: the browser clears a form's own values after each submission.
  const [text, setText] = useState("");
  const [polarity, setPolarity] = useState("");
  const [hashtag, setHashtag] = useState("");
  const left = MAX_TEXT_CHARACTERS - characters(text.trim());
  /** The Hashtag typed so far, as it would be stored, to mark the chip it matches. */
  const typedHashtag = hashtag.trim().replace(/^#+/, "").toLowerCase();
  return (
    <>
      <label className="field">
        Your Feeling
        <textarea
          name="text"
          rows={3}
          required
          value={text}
          onChange={(event) => setText(event.target.value)}
          aria-describedby="text-left"
          placeholder={promptDay ? writingPrompt(polarity === "good" || polarity === "bad" ? polarity : null, promptDay) : undefined}
        />
        <span id="text-left" className={left < 0 ? "field-note over" : "field-note"} aria-live="polite">
          {left < 0 ? `${-left} over` : `${left} left`}
        </span>
      </label>
      <fieldset className="toggle">
        <legend>Is it Good or Bad?</legend>
        <label className="toggle-option toggle-good">
          <input type="radio" name="polarity" value="good" required checked={polarity === "good"} onChange={() => setPolarity("good")} />
          <span className="has-emoji">
            <Smile aria-hidden="true" size={20} />
            <Emoji char={POLARITY_EMOJI.good} /> Good
          </span>
        </label>
        <label className="toggle-option toggle-bad">
          <input type="radio" name="polarity" value="bad" required checked={polarity === "bad"} onChange={() => setPolarity("bad")} />
          <span className="has-emoji">
            <Frown aria-hidden="true" size={20} />
            <Emoji char={POLARITY_EMOJI.bad} /> Bad
          </span>
        </label>
      </fieldset>
      <label className="field">
        Hashtag
        <input
          name="hashtag"
          required
          maxLength={MAX_HASHTAG_CHARACTERS + 1}
          list="hashtags-in-use"
          placeholder="#weather"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={hashtag}
          onChange={(event) => setHashtag(event.target.value)}
        />
        <span className="field-note">One word, up to {MAX_HASHTAG_CHARACTERS} characters.</span>
        <datalist id="hashtags-in-use">
          {hashtagsInUse.map((hashtag) => (
            <option key={hashtag} value={`#${hashtag}`} />
          ))}
        </datalist>
      </label>
      {hashtagsInUse.length > 0 && (
        // Outside the label, so tapping one doesn't also focus the field and bring up the keyboard.
        <div className="hashtag-chips" role="group" aria-label="Hashtags in use today">
          {hashtagsInUse.slice(0, HASHTAG_CHIPS).map((inUse) => (
            <button key={inUse} type="button" className={`chip hashtag-chip${typedHashtag === inUse ? " chosen" : ""}`} aria-pressed={typedHashtag === inUse} onClick={() => setHashtag(`#${inUse}`)}>
              <HashtagLabel hashtag={inUse} />
            </button>
          ))}
        </div>
      )}
    </>
  );
}
