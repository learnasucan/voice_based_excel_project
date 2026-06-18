import { EntryType } from "@/lib/contracts/row";
import { transliterateMarathiToEnglish } from "@/lib/normalization/marathiTransliteration";

export type ParsedEntryDraft = {
  serialNumber: number;
  nameMr: string;
  nameEn: string;
  entryType: EntryType;
  contributionAmount: string;
  giftNameMr: string;
  giftNameEn: string;
  placeMr: string;
  placeEn: string;
  requiresConfirmation: boolean;
};

export type ParseSuggestion = {
  label: string;
  draft: Partial<ParsedEntryDraft>;
};

export type ParseResult = {
  draft: Partial<ParsedEntryDraft>;
  confidence: number;
  warnings: string[];
  suggestions: ParseSuggestion[];
};

const DEVANAGARI_DIGITS: Record<string, string> = {
  "०": "0",
  "१": "1",
  "२": "2",
  "३": "3",
  "४": "4",
  "५": "5",
  "६": "6",
  "७": "7",
  "८": "8",
  "९": "9"
};

const TRANSLITERATION_CACHE: Record<string, string> = {
  "नेवाळे": "Nevale",
  "नेवाले": "Nevale",
  "पळस्पे": "Palaspe",
  "बारामती": "Baramati",
  "इंदापूर": "Indapur",
  "सासवड": "Saswad",
  "लोणंद": "Lonand",
  "कर्जत": "Karjat",
  "कृष्णा": "Krishna",
  "रावळे": "Ravale",
  "रावले": "Ravale",
  "सतीश": "Satish",
  "सर्वेश": "Sarvesh",
  "पाटील": "Patil",
  "फळे": "Phale",
  "घड्याळ": "Ghadyal",
  "पनवेल": "Panvel"
};

const AMOUNT_WORDS: Record<string, number> = {
  "एक": 1,
  "दोन": 2,
  "तीन": 3,
  "चार": 4,
  "पाच": 5,
  "दहा": 10,
  "वीस": 20,
  "पन्नास": 50,
  "शंभर": 100,
  "दोनशे": 200,
  "तीनशे": 300,
  "चारशे": 400,
  "पाचशे": 500,
  "हजार": 1000,
  "एक हजार": 1000,
  "दोन हजार": 2000,
  "पाच हजार": 5000,
  "one": 1,
  "two": 2,
  "three": 3,
  "four": 4,
  "five": 5,
  "ten": 10,
  "twenty": 20,
  "fifty": 50,
  "hundred": 100,
  "one hundred": 100,
  "two hundred": 200,
  "three hundred": 300,
  "four hundred": 400,
  "five hundred": 500,
  "one thousand": 1000,
  "two thousand": 2000,
  "five thousand": 5000
};

const CASH_MARKERS = new Set(["रुपया", "रुपये", "रु", "rs", "rupees", "rupee", "inr", "₹"]);
const CASH_CONNECTORS = new Set(["रुपया", "रुपये", "रु", "rs", "rupees", "rupee", "inr", "₹", "आणि", "and"]);
const NAME_SEPARATORS = new Set(["name", "नाव"]);
const GIFT_SEPARATORS = new Set(["gift", "गिफ्ट", "भेट", "आहेर", "वस्तू", "item", "सामान"]);
const PLACE_SEPARATORS = new Set([
  "place",
  "प्लेस",
  "ठिकाण",
  "गाव",
  "गांव",
  "village",
  "city",
  "शहर",
  "पत्ता",
  "address",
  "from",
  "फ्रॉम",
  "राहणार",
  "मुक्काम",
  "location"
]);
const AMOUNT_SEPARATORS = new Set([
  "amount",
  "अमाउंट",
  "रक्कम",
  "पैसे",
  "रुपये",
  "रुपया",
  "rs",
  "rupees",
  "₹"
]);
const GIFT_KEYWORDS = new Set([
  "भेट",
  "गिफ्ट",
  "आहेर",
  "वस्तू",
  "सामान",
  "नारळ",
  "फळे",
  "कपडे",
  "साडी",
  "भांडी",
  "box",
  "gift"
]);

type AmountMatch = {
  amount: number;
  start: number;
  end: number;
  hasCashMarker: boolean;
  isWordAmount: boolean;
};

type SeparatorKind = "name" | "gift" | "place" | "amount";

type SeparatorMatch = {
  kind: SeparatorKind;
  index: number;
};

export const createInitialEntryDraft = (serialNumber: number): ParsedEntryDraft => ({
  serialNumber,
  nameMr: "",
  nameEn: "",
  entryType: "cash",
  contributionAmount: "",
  giftNameMr: "",
  giftNameEn: "",
  placeMr: "",
  placeEn: "",
  requiresConfirmation: false
});

export const normalizeEntrySpaces = (value: string): string => value.replace(/\s+/g, " ").trim();

const toAsciiDigits = (value: string): string =>
  Array.from(value)
    .map((char) => DEVANAGARI_DIGITS[char] ?? char)
    .join("");

const titleCase = (value: string): string =>
  normalizeEntrySpaces(value)
    .split(" ")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1).toLowerCase() : part))
    .join(" ");

export const transliterateCached = (value: string): string =>
  normalizeEntrySpaces(value)
    .split(" ")
    .map((token) => TRANSLITERATION_CACHE[token] ?? transliterateMarathiToEnglish(token))
    .join(" ");

const parseAmountPhrase = (value: string): { amount: number; isWordAmount: boolean } | null => {
  const normalized = normalizeEntrySpaces(toAsciiDigits(value).replace(/[₹,]/g, " ₹ "));
  const compactNumeric = normalized.replace(/\s+/g, "");

  if (/^(?:rs|inr)?\d+$/i.test(compactNumeric)) {
    const parsed = Number.parseInt(compactNumeric.replace(/^(?:rs|inr)/i, ""), 10);
    return Number.isFinite(parsed) && parsed > 0 ? { amount: parsed, isWordAmount: false } : null;
  }

  const lower = normalized.toLowerCase();
  const amount = AMOUNT_WORDS[lower];
  return amount ? { amount, isWordAmount: true } : null;
};

const normalizeSeparatorToken = (value: string): string =>
  toAsciiDigits(value)
    .toLowerCase()
    .replace(/^[,.;:()"'`]+|[,.;:()"'`]+$/g, "");

const getSeparatorKind = (token: string): SeparatorKind | null => {
  const normalized = normalizeSeparatorToken(token);
  if (NAME_SEPARATORS.has(normalized)) return "name";
  if (GIFT_SEPARATORS.has(normalized)) return "gift";
  if (PLACE_SEPARATORS.has(normalized)) return "place";
  if (AMOUNT_SEPARATORS.has(normalized)) return "amount";
  return null;
};

const findAmount = (tokens: string[]): AmountMatch | null => {
  for (let start = 0; start < tokens.length; start += 1) {
    for (let length = Math.min(2, tokens.length - start); length >= 1; length -= 1) {
      const end = start + length - 1;
      const parsed = parseAmountPhrase(tokens.slice(start, end + 1).join(" "));
      if (!parsed) continue;

      const nextToken = tokens[end + 1]?.toLowerCase();
      return {
        amount: parsed.amount,
        start,
        end,
        hasCashMarker: Boolean(nextToken && CASH_MARKERS.has(nextToken)),
        isWordAmount: parsed.isWordAmount
      };
    }
  }

  return null;
};

const findGiftIndex = (tokens: string[], start = 0): number =>
  tokens.findIndex((token, index) => index >= start && GIFT_KEYWORDS.has(token.toLowerCase()));

const trimCashConnectors = (tokens: string[]): string[] => {
  let start = 0;
  while (start < tokens.length && CASH_CONNECTORS.has(tokens[start].toLowerCase())) {
    start += 1;
  }
  return tokens.slice(start);
};

const buildDraft = (
  serialNumber: number,
  draft: Partial<ParsedEntryDraft>
): Partial<ParsedEntryDraft> => {
  const nameMr = normalizeEntrySpaces(draft.nameMr ?? "");
  const giftNameMr = normalizeEntrySpaces(draft.giftNameMr ?? "");
  const placeMr = normalizeEntrySpaces(draft.placeMr ?? "");

  return {
    serialNumber,
    ...draft,
    nameMr,
    nameEn: draft.nameEn ?? titleCase(transliterateCached(nameMr)),
    giftNameMr,
    giftNameEn: draft.giftNameEn ?? (giftNameMr ? titleCase(transliterateCached(giftNameMr)) : ""),
    placeMr,
    placeEn: draft.placeEn ?? (placeMr ? titleCase(transliterateCached(placeMr)) : "")
  };
};

const parseWithSeparators = (tokens: string[], serialNumber: number): ParseResult | null => {
  const separators = tokens
    .map<SeparatorMatch | null>((token, index) => {
      const kind = getSeparatorKind(token);
      return kind ? { kind, index } : null;
    })
    .filter((separator): separator is SeparatorMatch => Boolean(separator));

  if (!separators.some((separator) => separator.kind === "gift" || separator.kind === "place" || separator.kind === "amount")) {
    return null;
  }

  const sections: Partial<Record<SeparatorKind, string[]>> = {};
  separators.forEach((separator, position) => {
    const nextSeparator = separators[position + 1];
    sections[separator.kind] = tokens.slice(
      separator.index + 1,
      nextSeparator ? nextSeparator.index : tokens.length
    );
  });

  const firstSeparator = separators[0];
  const amountMatch = findAmount(tokens);
  let nameTokens = tokens.slice(0, firstSeparator.index);

  if (firstSeparator.kind === "name") {
    const nextSeparator = separators[1];
    nameTokens = tokens.slice(firstSeparator.index + 1, nextSeparator ? nextSeparator.index : tokens.length);
  } else if (amountMatch && amountMatch.start < firstSeparator.index) {
    nameTokens = tokens.slice(0, amountMatch.start);
  }

  const amountFromSection = sections.amount ? findAmount(sections.amount) : null;
  const amount = amountFromSection?.amount ?? amountMatch?.amount ?? null;
  const giftNameMr = normalizeEntrySpaces((sections.gift ?? []).join(" "));
  const placeMr = normalizeEntrySpaces((sections.place ?? []).join(" "));
  const hasGiftSeparator = separators.some((separator) => separator.kind === "gift");
  const hasPlaceSeparator = separators.some((separator) => separator.kind === "place");
  const hasAmountSeparator = separators.some((separator) => separator.kind === "amount");

  let entryType: EntryType = "unknown";
  const warnings: string[] = [];

  if (amount && hasGiftSeparator) {
    entryType = "cash_and_gift";
  } else if (hasGiftSeparator) {
    entryType = "gift";
  } else if (amount) {
    entryType = "cash";
  }

  if (hasGiftSeparator && !giftNameMr) {
    warnings.push("Gift item is missing after the gift separator.");
  }

  if ((hasPlaceSeparator || entryType === "cash") && !placeMr) {
    warnings.push("Place is missing after the place separator.");
  }

  if (hasAmountSeparator && !amount) {
    warnings.push("Amount separator was detected, but amount was not clear.");
  }

  if (entryType === "unknown") {
    warnings.push("Could not confidently classify this entry. Confirm the entry type or edit manually.");
  }

  return {
    draft: buildDraft(serialNumber, {
      entryType,
      nameMr: nameTokens.join(" "),
      contributionAmount: amount ? String(amount) : "",
      giftNameMr,
      placeMr,
      requiresConfirmation: entryType === "unknown"
    }),
    confidence: entryType === "unknown" || warnings.length ? 0.68 : 0.93,
    warnings,
    suggestions: []
  };
};

export const parseMarathiEntryText = (text: string, serialNumber: number): ParseResult => {
  const cleaned = normalizeEntrySpaces(text);
  const warnings: string[] = [];

  if (!cleaned) {
    return {
      draft: createInitialEntryDraft(serialNumber),
      confidence: 0,
      warnings: ["Enter or speak one entry before parsing."],
      suggestions: []
    };
  }

  const tokens = cleaned.split(" ");
  const separatorResult = parseWithSeparators(tokens, serialNumber);
  if (separatorResult && separatorResult.confidence >= 0.75) {
    return separatorResult;
  }

  const amountMatch = findAmount(tokens);
  const firstGiftIndex = findGiftIndex(tokens);

  if (!amountMatch && firstGiftIndex >= 0) {
    const explicitGiftWord = ["भेट", "गिफ्ट", "आहेर", "gift"].includes(tokens[firstGiftIndex].toLowerCase());
    const giftStart = explicitGiftWord ? firstGiftIndex + 1 : firstGiftIndex;
    const giftTokens = tokens.slice(giftStart);

    return {
      draft: buildDraft(serialNumber, {
        entryType: "gift",
        nameMr: tokens.slice(0, firstGiftIndex).join(" "),
        contributionAmount: "",
        giftNameMr: giftTokens.join(" "),
        placeMr: ""
      }),
      confidence: 0.9,
      warnings: giftTokens.length ? [] : ["Gift item is missing after the gift keyword."],
      suggestions: []
    };
  }

  if (!amountMatch) {
    return {
      draft: buildDraft(serialNumber, {
        entryType: "unknown",
        nameMr: cleaned,
        requiresConfirmation: true
      }),
      confidence: 0.35,
      warnings: ["Amount or gift was not detected. Confirm the entry type or edit manually."],
      suggestions: []
    };
  }

  const nameMr = tokens.slice(0, amountMatch.start).join(" ");
  const afterAmount = tokens.slice(amountMatch.end + 1);
  const afterCashWords = trimCashConnectors(afterAmount);
  const giftIndexAfterAmount = findGiftIndex(tokens, amountMatch.end + 1);
  const hasGiftAfterAmount = giftIndexAfterAmount >= 0;
  const giftLikeAfterAmount = afterCashWords.some((token) => GIFT_KEYWORDS.has(token.toLowerCase()));
  const ambiguousGiftTail =
    amountMatch.isWordAmount && amountMatch.amount <= 10 && amountMatch.hasCashMarker && giftLikeAfterAmount;

  if (ambiguousGiftTail) {
    const giftMr = afterCashWords.join(" ");
    const base = buildDraft(serialNumber, {
      entryType: "unknown",
      nameMr,
      contributionAmount: String(amountMatch.amount),
      giftNameMr: giftMr,
      placeMr: giftMr,
      requiresConfirmation: true
    });

    return {
      draft: base,
      confidence: 0.45,
      warnings: ["We found both amount and gift possibility. Please confirm."],
      suggestions: [
        {
          label: "Save as Cash",
          draft: buildDraft(serialNumber, {
            entryType: "cash",
            nameMr,
            contributionAmount: String(amountMatch.amount),
            giftNameMr: "",
            placeMr: giftMr,
            requiresConfirmation: false
          })
        },
        {
          label: "Save as Gift",
          draft: buildDraft(serialNumber, {
            entryType: "gift",
            nameMr,
            contributionAmount: "",
            giftNameMr: giftMr,
            placeMr: "",
            requiresConfirmation: false
          })
        },
        {
          label: "Save as Cash + Gift",
          draft: buildDraft(serialNumber, {
            entryType: "cash_and_gift",
            nameMr,
            contributionAmount: String(amountMatch.amount),
            giftNameMr: giftMr,
            placeMr: "",
            requiresConfirmation: false
          })
        }
      ]
    };
  }

  if (hasGiftAfterAmount) {
    const explicitGiftWord = ["भेट", "गिफ्ट", "आहेर", "gift"].includes(tokens[giftIndexAfterAmount].toLowerCase());
    const giftStart = explicitGiftWord ? giftIndexAfterAmount + 1 : giftIndexAfterAmount;
    const giftMr = tokens.slice(giftStart).join(" ");

    return {
      draft: buildDraft(serialNumber, {
        entryType: "cash_and_gift",
        nameMr,
        contributionAmount: String(amountMatch.amount),
        giftNameMr: giftMr,
        placeMr: ""
      }),
      confidence: giftMr ? 0.88 : 0.7,
      warnings: giftMr ? [] : ["Gift item is missing after the gift keyword."],
      suggestions: []
    };
  }

  const placeMr = afterCashWords.join(" ");
  if (!nameMr) warnings.push("Name is missing before the amount.");
  if (!placeMr) warnings.push("Place is missing after the amount.");

  return {
    draft: buildDraft(serialNumber, {
      entryType: "cash",
      nameMr,
      contributionAmount: String(amountMatch.amount),
      giftNameMr: "",
      placeMr
    }),
    confidence: warnings.length ? 0.65 : 0.92,
    warnings,
    suggestions: []
  };
};
