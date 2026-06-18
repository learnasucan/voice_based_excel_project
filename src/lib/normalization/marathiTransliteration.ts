const HALANT = "\u094D";
const KSHA_CLUSTER = "\u0915\u094D\u0937";
const GYA_CLUSTER = "\u091C\u094D\u091E";
const ANUSVARA = "\u0902";
const CHANDRABINDU = "\u0901";
const VISARGA = "\u0903";

const VOWELS: Record<string, string> = {
  "\u0905": "a",
  "\u0906": "aa",
  "\u0907": "i",
  "\u0908": "ii",
  "\u0909": "u",
  "\u090A": "uu",
  "\u090F": "e",
  "\u0910": "ai",
  "\u0913": "o",
  "\u0914": "au",
  "\u090B": "ri"
};

const CONSONANTS: Record<string, string> = {
  "\u0915": "k",
  "\u0916": "kh",
  "\u0917": "g",
  "\u0918": "gh",
  "\u0919": "ng",
  "\u091A": "ch",
  "\u091B": "chh",
  "\u091C": "j",
  "\u091D": "jh",
  "\u091E": "ny",
  "\u091F": "t",
  "\u0920": "th",
  "\u0921": "d",
  "\u0922": "dh",
  "\u0923": "n",
  "\u0924": "t",
  "\u0925": "th",
  "\u0926": "d",
  "\u0927": "dh",
  "\u0928": "n",
  "\u092A": "p",
  "\u092B": "ph",
  "\u092C": "b",
  "\u092D": "bh",
  "\u092E": "m",
  "\u092F": "y",
  "\u0930": "r",
  "\u0932": "l",
  "\u0935": "v",
  "\u0936": "sh",
  "\u0937": "sh",
  "\u0938": "s",
  "\u0939": "h",
  "\u0933": "l"
};

const VOWEL_SIGNS: Record<string, string> = {
  "\u093E": "aa",
  "\u093F": "i",
  "\u0940": "ii",
  "\u0941": "u",
  "\u0942": "uu",
  "\u0947": "e",
  "\u0948": "ai",
  "\u094B": "o",
  "\u094C": "au",
  "\u0943": "ri",
  [VISARGA]: "h"
};

const LABIALS = new Set(["\u092A", "\u092B", "\u092C", "\u092D", "\u092E"]);

export const normalizeTransliterationSpaces = (value: string): string =>
  value.replace(/\s+/g, " ").trim();

const cleanTranscriptText = (value: string): string =>
  normalizeTransliterationSpaces(value.replace(/[\u200c\u200d]/g, " ").replace(/[|]/g, " "));

const capitalizeWords = (value: string): string =>
  value
    .split(" ")
    .map((token) => (token ? token[0].toUpperCase() + token.slice(1) : token))
    .join(" ");

const transliterateAnusvara = (nextChar: string | undefined): string => {
  if (!nextChar) {
    return "n";
  }

  return LABIALS.has(nextChar) ? "m" : "n";
};

const dropTerminalSchwa = (value: string): string =>
  value
    .split(" ")
    .map((token) => {
      if (token.length < 5 || !token.endsWith("a") || token.endsWith("ya")) {
        return token;
      }

      if (/(aa|ia|ua|ea|oa)$/.test(token)) {
        return token;
      }

      return token.slice(0, -1);
    })
    .join(" ");

export const transliterateMarathiToEnglish = (input: string): string => {
  const source = cleanTranscriptText(input);
  if (!source) {
    return "";
  }

  let result = "";

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];

    if (char === " ") {
      result += " ";
      continue;
    }

    if (source.startsWith(KSHA_CLUSTER, i)) {
      result += "ksha";
      i += KSHA_CLUSTER.length - 1;
      continue;
    }

    if (source.startsWith(GYA_CLUSTER, i)) {
      result += "gya";
      i += GYA_CLUSTER.length - 1;
      continue;
    }

    const vowel = VOWELS[char];
    if (vowel !== undefined) {
      result += vowel;
      continue;
    }

    const consonant = CONSONANTS[char];
    if (consonant !== undefined) {
      const next = source[i + 1];

      if (next === HALANT) {
        result += consonant;
        i += 1;
        continue;
      }

      const nextVowelSign = next ? VOWEL_SIGNS[next] : undefined;
      if (nextVowelSign !== undefined) {
        result += consonant + nextVowelSign;
        i += 1;
        continue;
      }

      if (next === ANUSVARA || next === CHANDRABINDU) {
        result += `${consonant}a${transliterateAnusvara(source[i + 2])}`;
        i += 1;
        continue;
      }

      result += `${consonant}a`;
      continue;
    }

    if (char === ANUSVARA || char === CHANDRABINDU) {
      result += transliterateAnusvara(source[i + 1]);
      continue;
    }

    const vowelSign = VOWEL_SIGNS[char];
    if (vowelSign !== undefined) {
      result += vowelSign;
      continue;
    }

    result += char;
  }

  return normalizeTransliterationSpaces(
    capitalizeWords(
      dropTerminalSchwa(result.replace(/aa/g, "a").replace(/ii/g, "i").replace(/uu/g, "u"))
    )
  );
};
