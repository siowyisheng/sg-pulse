import type { Polarity } from "@/core/feeling-rules";

/**
 * The prompt in the empty "Your Feeling" box, to help with the blank page. Written by the team; none
 * names a real person. It is only a placeholder: never submitted, never counted.
 */
const PROMPTS: Record<Polarity | "neutral", readonly string[]> = {
  neutral: ["How's today going for you?", "What's on your mind today?", "How are you feeling about today?"],
  good: ["What made you smile today?", "What went right today?", "What was shiok today?", "What made your day better?", "Any small win today?"],
  bad: ["What's bugging you today?", "What went wrong today?", "What made you sian today?", "What got on your nerves today?", "What do you wish was different today?"],
};

/** The prompt for a Polarity (or none chosen yet) on a day: the same for everyone that day, a different one the next. */
export function writingPrompt(polarity: Polarity | null, day: string): string {
  const prompts = PROMPTS[polarity ?? "neutral"];
  const dayNumber = Math.floor(Date.parse(`${day}T00:00:00Z`) / 86_400_000);
  return prompts[((dayNumber % prompts.length) + prompts.length) % prompts.length]!;
}
