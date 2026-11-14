"use client";

import { Frown, Smile } from "lucide-react";
import { useState } from "react";
import { MAX_HASHTAG_CHARACTERS, MAX_TEXT_CHARACTERS } from "@/core/feeling-rules";
import { Emoji, POLARITY_EMOJI } from "./emoji";

/** Characters as a person counts them, so an emoji is one. */
const characters = (text: string) => [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)].length;

/**
 * The three things every Feeling has: its text (with a count of what's left), a Good or Bad toggle,
 * and one Hashtag, which suggests the ones already in use so near-duplicates merge.
 */
export function FeelingFields({ hashtagsInUse = [] }: { hashtagsInUse?: string[] }) {
  // All three are kept here, so they survive a refusal: the browser clears a form's own values after each submission.
  const [text, setText] = useState("");
  const [polarity, setPolarity] = useState("");
  const [hashtag, setHashtag] = useState("");
  const left = MAX_TEXT_CHARACTERS - characters(text.trim());
  return (
    <>
      <label className="field">
        Your Feeling
        <textarea name="text" rows={3} required value={text} onChange={(event) => setText(event.target.value)} aria-describedby="text-left" />
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
    </>
  );
}
