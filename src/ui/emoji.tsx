/**
 * An emoji beside words that already say the same thing, for quick reading at a glance. It is drawn
 * by the stylesheet from `data-emoji`, so it is not part of the text that is read out or copied,
 * and it shows only in the Designs: Classic keeps its icons.
 */
export function Emoji({ char, className }: { char: string | null | undefined; className?: string }) {
  if (!char) return null;
  return <span className={className ? `emoji ${className}` : "emoji"} data-emoji={char} aria-hidden="true" />;
}

export const POLARITY_EMOJI = { good: "😊", bad: "😣" } as const;

/** Common Hashtags and the emoji that reads as each. Any other Hashtag goes without. */
const HASHTAG_EMOJI: Record<string, string> = {
  mrt: "🚇", lrt: "🚈", train: "🚆", bus: "🚌", traffic: "🚗", taxi: "🚕", grab: "🚕", erp: "🚗", cycling: "🚲",
  kopi: "☕", coffee: "☕", teh: "🍵", bubbletea: "🧋", milo: "🥤",
  hawker: "🍜", food: "🍜", lunch: "🍱", dinner: "🍽️", breakfast: "🍳", supper: "🌙", chickenrice: "🍗", laksa: "🍜", prata: "🫓", satay: "🍢", durian: "😵",
  weather: "🌦️", rain: "🌧️", hot: "🥵", heat: "🥵", haze: "😷", sunny: "☀️", flood: "🌊",
  weekend: "🎉", holiday: "🏖️", travel: "✈️", beach: "🏖️", park: "🌳",
  work: "💼", jobs: "💼", office: "🏢", wfh: "🏠", school: "🏫", exams: "📝", psle: "📝", uni: "🎓",
  prices: "💸", cost: "💸", gst: "💸", money: "💰", cpf: "🏦", rent: "🏠",
  housing: "🏠", hdb: "🏢", bto: "🏗️", condo: "🏙️", neighbours: "🏘️",
  election: "🗳️", ge: "🗳️", ndp: "🇸🇬", sg: "🇸🇬", singapore: "🇸🇬", lky: "🇸🇬",
  family: "👨‍👩‍👧", kids: "🧒", baby: "👶", parents: "👪", love: "❤️", friends: "🫂", wedding: "💒",
  health: "🩺", clinic: "🩺", covid: "😷", gym: "🏋️", running: "🏃",
  football: "⚽", sports: "🏅", music: "🎵", concert: "🎤", movies: "🎬", games: "🎮",
  shopping: "🛍️", cats: "🐈", dogs: "🐕", pets: "🐾",
  cny: "🧧", hariraya: "🌙", deepavali: "🪔", christmas: "🎄", ramadan: "🌙",
};

export const hashtagEmoji = (hashtag: string): string | undefined => HASHTAG_EMOJI[hashtag.replace(/^#+/, "").toLowerCase()];

/** `#hashtag` with its emoji, when it has one. */
export function HashtagLabel({ hashtag }: { hashtag: string }) {
  return (
    <>
      <Emoji char={hashtagEmoji(hashtag)} />#{hashtag}
    </>
  );
}
