import { REFUSED_ANYWHERE, REFUSED_WORDS } from "./profanity-words";

const WORDS = new Set(REFUSED_WORDS);
const LONGEST_WORD = Math.max(...REFUSED_WORDS.map((word) => word.length));
const LOOKALIKES: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", $: "s", "!": "i" };
const SUFFIXES = ["s", "es", "ed", "er", "ers", "ing", "in", "y"];

/** A word as the filter compares it: lowercase, accents and look-alike digits undone, only letters and "*" left. */
function plain(word: string): string {
  return word
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[013457@$!]/g, (character) => LOOKALIKES[character] ?? character)
    .replace(/[^\p{L}*]/gu, "");
}

/** Whether one run of letters is a refused word, allowing stretched letters ("fuuuck"), endings ("fucking") and a starred-out letter ("c*nt"). */
function isRefused(word: string): boolean {
  if (word.length < 2 || word.length > LONGEST_WORD + 3) return false;
  if (word.includes("*")) {
    if (word.replaceAll("*", "").length < 2) return false;
    const pattern = new RegExp(`^${word.replaceAll("*", ".")}$`);
    return REFUSED_WORDS.some((refused) => pattern.test(refused));
  }
  const spellings = new Set([word, word.replace(/(.)\1{2,}/g, "$1$1"), word.replace(/(.)\1{2,}/g, "$1"), word.replace(/(.)\1+/g, "$1")]);
  for (const spelling of spellings) {
    if (WORDS.has(spelling)) return true;
    if (SUFFIXES.some((suffix) => spelling.endsWith(suffix) && WORDS.has(spelling.slice(0, -suffix.length)))) return true;
  }
  return false;
}

/**
 * Whether the automated profanity and slur filter refuses this text. It looks at whole words, at
 * words spelled out letter by letter or split in two or three ("chee bye"), and for a few phrases
 * anywhere in the text.
 */
export function isProfane(text: string): boolean {
  if (REFUSED_ANYWHERE.some((phrase) => text.includes(phrase))) return true;
  const words = text.split(/\s+/).map(plain).filter(Boolean);
  for (let start = 0; start < words.length; start++) {
    let joined = "";
    // A word alone, then joined with the next ones: up to three words, or any run of single letters.
    for (let end = start; end < words.length; end++) {
      const word = words[end]!;
      const spelledOut = joined.length === end - start && word.length === 1;
      if (end - start >= 3 && !spelledOut) break;
      joined += word;
      if (joined.length > LONGEST_WORD + 3) break;
      if (isRefused(joined)) return true;
    }
  }
  return false;
}
