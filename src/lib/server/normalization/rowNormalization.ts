import { NormalizedDuplicateKey } from "@/lib/contracts/normalization";
import { CreateRowInput } from "@/lib/contracts/row";
export { transliterateMarathiToEnglish } from "@/lib/normalization/marathiTransliteration";

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
