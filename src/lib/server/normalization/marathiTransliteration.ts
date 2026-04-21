import { transliterateMarathiToEnglish } from "@/lib/server/normalization/rowNormalization";
import { normalizeMarathiText, normalizeWhitespace } from "@/lib/server/normalization/marathiText";

const DEVANAGARI_RE = /[\u0900-\u097F]/;
const TOKEN_RE = /[\u0900-\u097F]+|[A-Za-z]+|\d+|[^\w\s]+/g;

const cleanupRomanToken = (value: string): string => {
  const normalized = value
    .replace(/ii/g, "i")
    .replace(/uu/g, "u")
    .replace(/aa/g, "a")
    .replace(/md/g, "nd")
    .replace(/mt/g, "nt")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "";
  }

  return normalized
    .split(" ")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1).toLowerCase() : part))
    .join(" ");
};

export interface TransliterationResult {
  transliteratedText: string;
  overrideApplied: boolean;
}

export const bestEffortTransliterateMr = (
  value: string,
  overrides: Record<string, string> = {}
): TransliterationResult => {
  const cleaned = normalizeMarathiText(value);
  if (!cleaned) {
    return { transliteratedText: "", overrideApplied: false };
  }

  const tokens = cleaned.match(TOKEN_RE) ?? [];
  const pieces: string[] = [];
  let overrideApplied = false;

  for (const token of tokens) {
    const override = overrides[token];
    if (override) {
      pieces.push(normalizeWhitespace(override));
      overrideApplied = true;
      continue;
    }

    if (DEVANAGARI_RE.test(token)) {
      pieces.push(cleanupRomanToken(transliterateMarathiToEnglish(token)));
      continue;
    }

    pieces.push(token);
  }

  return {
    transliteratedText: normalizeWhitespace(pieces.join(" ").replace(/\s+([,.;:!?])/g, "$1")),
    overrideApplied
  };
};
