import { FeelingError } from "./errors";

export const POLARITIES = ["good", "bad"] as const;
export type Polarity = (typeof POLARITIES)[number];

export const MAX_TEXT_CHARACTERS = 100;
export const MAX_HASHTAG_CHARACTERS = 12;

/** Characters as a person counts them, so an emoji or an accented letter is one. */
const characters = (text: string) => [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)].length;

/** A Feeling's text, trimmed; refused when empty or over 100 characters. Plain text in any language. */
export function validText(raw: string): string {
  // One line: line breaks and runs of spaces become a single space.
  const text = String(raw).replace(/\s+/gu, " ").trim();
  if (text === "") throw new FeelingError("TEXT_EMPTY", "Write something first.");
  if (characters(text) > MAX_TEXT_CHARACTERS) {
    throw new FeelingError("TEXT_TOO_LONG", `Keep it to ${MAX_TEXT_CHARACTERS} characters.`);
  }
  return text;
}

/** A Hashtag as stored: lowercased, trimmed, without the "#", so #LKY and #lky are the same. One word, at most 12 characters. */
export function normalisedHashtag(raw: string): string {
  const hashtag = String(raw).trim().replace(/^#+/, "").trim().toLowerCase();
  if (hashtag === "" || /[\s#]/.test(hashtag) || characters(hashtag) > MAX_HASHTAG_CHARACTERS) {
    throw new FeelingError("INVALID_HASHTAG", `A Hashtag is one word of up to ${MAX_HASHTAG_CHARACTERS} characters.`);
  }
  return hashtag;
}

export function validPolarity(raw: unknown): Polarity {
  if (raw !== "good" && raw !== "bad") throw new FeelingError("INVALID_POLARITY", "Choose Good or Bad.");
  return raw;
}

const LINK = /https?:\/\/|\bwww\.|\b[a-z0-9-]+\.(?:com|sg|net|org|io|co|me|ly|gg|app|xyz|info|biz|tv)\b/i;

/** A Feeling is plain text: no links. */
export function refuseLinks(text: string): void {
  if (LINK.test(text)) throw new FeelingError("NO_LINKS", "A Feeling is plain text, so leave out links.");
}
