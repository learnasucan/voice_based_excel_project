import { NormalizedDuplicateKey } from "@/lib/contracts/normalization";
import { CreateRowInput } from "@/lib/contracts/row";

const DEVANAGARI_TO_ASCII = new Map<string, string>([
  ["\u0966", "0"],
  ["\u0967", "1"],
  ["\u0968", "2"],
  ["\u0969", "3"],
  ["\u096A", "4"],
  ["\u096B", "5"],
  ["\u096C", "6"],
  ["\u096D", "7"],
  ["\u096E", "8"],
  ["\u096F", "9"]
]);

const HALANT = "\u094D";
const KSHA_CLUSTER = "\u0915\u094D\u0937";
const GYA_CLUSTER = "\u091C\u094D\u091E";

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
  "\u0902": "m",
  "\u0903": "h",
  "\u0901": "n"
};

export const normalizeSpaces = (value: string): string => value.replace(/\s+/g, " ").trim();

export const normalizeTextKey = (value: string): string => normalizeSpaces(value).toLowerCase();

export const convertDevanagariDigits = (value: string): string =>
  value
    .split("")
    .map((char) => DEVANAGARI_TO_ASCII.get(char) ?? char)
    .join("");

export const cleanTranscriptText = (value: string): string =>
  normalizeSpaces(value.replace(/[\u200c\u200d]/g, " ").replace(/[|]/g, " "));

export const normalizeAmountInput = (value: string | number): number | null => {
  const raw = typeof value === "number" ? String(value) : value;
  const canonical = convertDevanagariDigits(raw)
    .replace(/\u20B9/g, "")
    .replace(/INR/gi, "")
    .replace(/Rs\.?/gi, "")
    .replace(/[OoD]/g, "0")
    .replace(/[Ss]/g, "5")
    .replace(/[xX]/g, "")
    .replace(/[\s,]/g, "");

  const digits = canonical.match(/\d+/g)?.join("") ?? "";
  if (!digits) {
    return null;
  }

  let normalized = Number.parseInt(digits, 10);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    return null;
  }

  if (normalized >= 100 && normalized % 50 !== 0) {
    normalized = Math.round(normalized / 50) * 50;
  }

  while (normalized > 5000 && normalized % 10 === 0) {
    normalized = Math.floor(normalized / 10);
  }

  if (normalized > 5000 && digits.length >= 4) {
    const withoutLeading = Number.parseInt(digits.slice(1), 10);
    if (Number.isFinite(withoutLeading) && withoutLeading > 0 && withoutLeading <= 5000) {
      normalized = withoutLeading;
    }
  }

  if (normalized > 5000) {
    return null;
  }

  return normalized;
};

export const buildNormalizedDuplicateKey = (
  payload: Pick<CreateRowInput, "nameMr" | "placeMr" | "contributionAmount">
): NormalizedDuplicateKey => ({
  nameMrKey: normalizeTextKey(payload.nameMr),
  contributionAmount: payload.contributionAmount,
  placeMrKey: normalizeTextKey(payload.placeMr)
});

const capitalizeWords = (value: string): string =>
  value
    .split(" ")
    .map((token) => (token ? token[0].toUpperCase() + token.slice(1) : token))
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

      result += `${consonant}a`;
      continue;
    }

    const vowelSign = VOWEL_SIGNS[char];
    if (vowelSign !== undefined) {
      result += vowelSign;
      continue;
    }

    result += char;
  }

  return normalizeSpaces(
    capitalizeWords(result.replace(/aa/g, "a").replace(/ii/g, "i").replace(/uu/g, "u"))
  );
};
