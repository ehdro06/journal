const PROFANITY_LIST = ["fuck", "shit", "bitch", "asshole"];

const URL_REGEX = /https?:\/\/\S+/gi;
const REPEATED_CHAR_REGEX = /(.)\1{12,}/;

export const containsProfanity = (text: string): boolean => {
  const normalized = text.toLowerCase();
  return PROFANITY_LIST.some((word) => normalized.includes(word));
};

export const looksLikeSpam = (text: string): boolean => {
  const linkCount = text.match(URL_REGEX)?.length ?? 0;
  if (linkCount >= 3) {
    return true;
  }

  if (REPEATED_CHAR_REGEX.test(text)) {
    return true;
  }

  return false;
};
