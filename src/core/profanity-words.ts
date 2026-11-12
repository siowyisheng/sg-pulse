/**
 * What the automated filter refuses in a Feeling or its Hashtag. Deliberately a short list of words
 * that are vulgar or slurs in any context; the Admin's Approval and Reports catch what a list can't.
 * Words are matched whole (so "class" and "Scunthorpe" pass), after undoing spacing, punctuation,
 * stretched letters and digits standing in for letters. Phrases are written without spaces.
 */
export const REFUSED_WORDS: readonly string[] = [
  // English
  "fuck", "fucker", "motherfucker", "fck", "fuk", "shit", "bullshit", "bitch", "cunt", "asshole", "arsehole", "bastard", "dickhead", "pussy", "wanker", "twat", "slut", "whore",
  // Slurs
  "nigger", "nigga", "chink", "chingchong", "faggot", "fag", "retard", "tranny", "keling", "apunehneh", "appunehneh", "cinababi", "ahtiong",
  // Hokkien, Malay and Tamil vulgarities common in Singapore
  "knn", "knnb", "knnccb", "knnbccb", "ccb", "cheebye", "cheebai", "chibai", "chibye", "cibai", "kanina", "kannina", "kaninabu", "kanninabu", "lanjiao", "lanjiau", "lancheow", "lancau", "pukimak", "puki", "pundek", "pundeh", "punda", "pundai", "thevidiya",
];

/** Refused wherever they appear: scripts written without spaces have no whole words to match. */
export const REFUSED_ANYWHERE: readonly string[] = ["操你", "肏你", "干你娘", "幹你娘", "他妈的", "他媽的", "傻逼", "傻屄", "鸡巴", "雞巴", "婊子"];
