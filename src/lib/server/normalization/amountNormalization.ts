import { normalizeWhitespace } from "@/lib/server/normalization/marathiText";

const DEVANAGARI_TO_ASCII: Record<string, string> = {
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

const CURRENCY_NOISE = new Set([
  "rs",
  "inr",
  "rupee",
  "rupees",
  "rupaye",
  "rupay",
  "रु",
  "रु.",
  "रूपये",
  "रुपये",
  "रुपया",
  "रुपये/-"
]);

const IGNORE_TOKENS = new Set(["and", "ani", "aur", "आणि", "और", "फक्त", "only"]);

const TOKEN_VALUES: Record<string, number> = {
  // English units and tens
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fourty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,

  // Marathi words
  "शून्य": 0,
  "एक": 1,
  "दोन": 2,
  "तीन": 3,
  "चार": 4,
  "पाच": 5,
  "सहा": 6,
  "सात": 7,
  "आठ": 8,
  "नऊ": 9,
  "दहा": 10,
  "अकरा": 11,
  "बारा": 12,
  "तेरा": 13,
  "चौदा": 14,
  "पंधरा": 15,
  "सोळा": 16,
  "सतरा": 17,
  "अठरा": 18,
  "एकोणीस": 19,
  "वीस": 20,
  "तीस": 30,
  "चाळीस": 40,
  "पन्नास": 50,
  "साठ": 60,
  "सत्तर": 70,
  "ऐंशी": 80,
  "नव्वद": 90,

  // Hindi words
  "दो": 2,
  "पांच": 5,
  "छह": 6,
  "ग्यारह": 11,
  "बारह": 12,
  "तेरह": 13,
  "चौदह": 14,
  "पंद्रह": 15,
  "सोलह": 16,
  "उन्नीस": 19,
  "बीस": 20,
  "चालीस": 40,
  "अस्सी": 80,
  "नब्बे": 90,

  // Common fused forms
  "पाचशे": 500,
  "दोनशे": 200,
  "तीनशे": 300,
  "चारशे": 400,
  "सहाशे": 600,
  "सातशे": 700,
  "आठशे": 800,
  "नऊशे": 900,
  "एकावन्न": 51,
  "बावन्न": 52,
  "त्रेपन्न": 53,
  "चौपन्न": 54,
  "पंचावन्न": 55,
  "छप्पन्न": 56,
  "सत्तावन्न": 57,
  "अठ्ठावन्न": 58,
  "एकोणसाठ": 59,

  // Roman Marathi
  ek: 1,
  don: 2,
  teen: 3,
  char: 4,
  pach: 5,
  saha: 6,
  sat: 7,
  aath: 8,
  nau: 9,
  daha: 10,
  akra: 11,
  bara: 12,
  tera: 13,
  chauda: 14,
  pandhara: 15,
  pandhra: 15,
  sola: 16,
  satra: 17,
  athra: 18,
  vis: 20,
  tis: 30,
  chalis: 40,
  pannas: 50,
  sath: 60,
  sattar: 70,
  enshi: 80,
  navvad: 90,

  // Roman Hindi
  do: 2,
  paanch: 5,
  chhe: 6,
  gyarah: 11,
  baarah: 12,
  pandrah: 15,
  bees: 20,
  chaalis: 40,
  assi: 80,
  nabbe: 90
};

const TOKEN_SCALES: Record<string, number> = {
  hundred: 100,
  thousand: 1_000,
  lakh: 100_000,
  lac: 100_000,
  crore: 10_000_000,
  "शंभर": 100,
  "शे": 100,
  "हजार": 1_000,
  "लाख": 100_000,
  "कोटी": 10_000_000,
  "सौ": 100,
  "हज़ार": 1_000,
  "करोड़": 10_000_000,
  she: 100,
  shambhar: 100,
  hajar: 1_000,
  hazar: 1_000,
  koti: 10_000_000,
  sau: 100,
  karod: 10_000_000
};

const FUSED_SCALE_DEV_RE = /^(.+?)(हजार|हज़ार|लाख|कोटी|करोड़)$/;
const FUSED_SCALE_ROMAN_RE = /^(.+?)(hajar|hazar|lakh|koti|karod)$/;
const DIGIT_CHUNK_RE = /\d[\d,\s]*/g;

export interface AmountNormalizationResult {
  normalizedAmount: number | null;
  mode: "empty" | "numeric-cleanup" | "spoken-number-parse" | "unparsed";
}

const toAsciiDigits = (value: string): string =>
  Array.from(value)
    .map((char) => DEVANAGARI_TO_ASCII[char] ?? char)
    .join("");

const cleanAmountText = (value: string): string =>
  normalizeWhitespace(
    toAsciiDigits(value.normalize("NFKC"))
      .replace(/[₹]/g, " ")
      .replace(/\/-/g, " ")
      .replace(/[\\/_]/g, " ")
      .replace(/-/g, " ")
      .replace(/\//g, " ")
  );

const normalizeOcrDigits = (source: string, digits: string): string => {
  const hasSep = /[/\\\-=]/.test(source);

  if (hasSep && digits.endsWith("1")) {
    if (digits.length === 3 && digits[digits.length - 2] === "0") {
      digits = `${digits.slice(0, -1)}0`;
    } else if (digits.length >= 4) {
      digits = digits.slice(0, -1);
    }
  }

  if (hasSep && digits.endsWith("9") && digits.length >= 4) {
    digits = digits.slice(0, -1);
  }

  if (digits.length === 5 && ["8", "9"].includes(digits[0]) && digits.slice(2) === "500") {
    digits = "2500";
  }

  if (digits.length >= 5 && Number.parseInt(digits, 10) > 5000 && digits.endsWith("00")) {
    const tail = Number.parseInt(digits.slice(1), 10);
    if (tail <= 5000) {
      digits = digits.slice(1);
    }
  }

  if (Number.parseInt(digits, 10) > 5000 && digits.length >= 4) {
    const tail = Number.parseInt(digits.slice(0, -1), 10);
    if (tail <= 5000) {
      digits = digits.slice(0, -1);
    }
  }

  return digits;
};

const parseNumericChunks = (value: string): number | null => {
  const chunks = value.match(DIGIT_CHUNK_RE) ?? [];
  if (!chunks.length) {
    return null;
  }

  const compact = chunks.map((chunk) => chunk.replace(/[^\d]/g, "")).filter(Boolean);
  if (!compact.length) {
    return null;
  }

  const candidate = compact.sort((a, b) => (b.length === a.length ? Number.parseInt(b, 10) - Number.parseInt(a, 10) : b.length - a.length))[0];
  const normalizedDigits = normalizeOcrDigits(value, candidate);
  const parsed = Number.parseInt(normalizedDigits, 10);

  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 10_000_000_000) {
    return null;
  }

  return parsed;
};

const expandFusedToken = (token: string): string[] => {
  if (token in TOKEN_VALUES || token in TOKEN_SCALES || IGNORE_TOKENS.has(token)) {
    return [token];
  }

  const devMatch = token.match(FUSED_SCALE_DEV_RE);
  if (devMatch) {
    const [, head, scale] = devMatch;
    if (head in TOKEN_VALUES || head in TOKEN_SCALES) {
      return [head, scale];
    }
  }

  const romanMatch = token.match(FUSED_SCALE_ROMAN_RE);
  if (romanMatch) {
    const [, head, scale] = romanMatch;
    if (head in TOKEN_VALUES || head in TOKEN_SCALES) {
      return [head, scale];
    }
  }

  return [token];
};

const parseSpokenAmount = (value: string): number | null => {
  const normalizedTokens = value
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.replace(/[.,:;()\[\]{}]/g, "").trim())
    .filter(Boolean)
    .filter((token) => !CURRENCY_NOISE.has(token));

  const expandedTokens = normalizedTokens.flatMap(expandFusedToken);

  let total = 0;
  let current = 0;
  let seen = false;

  for (const token of expandedTokens) {
    if (!token || IGNORE_TOKENS.has(token)) {
      continue;
    }

    if (/^\d+$/.test(token)) {
      current += Number.parseInt(token, 10);
      seen = true;
      continue;
    }

    const valueToken = TOKEN_VALUES[token];
    if (valueToken !== undefined) {
      current += valueToken;
      seen = true;
      continue;
    }

    const scaleToken = TOKEN_SCALES[token];
    if (scaleToken !== undefined) {
      seen = true;
      if (current === 0) {
        current = 1;
      }
      current *= scaleToken;

      if (scaleToken >= 1000) {
        total += current;
        current = 0;
      }
    }
  }

  if (!seen) {
    return null;
  }

  const parsed = total + current;
  return parsed > 0 ? parsed : null;
};

export const normalizeContributionAmountText = (value: string | number): AmountNormalizationResult => {
  if (typeof value === "number") {
    if (Number.isFinite(value) && value > 0) {
      return { normalizedAmount: Math.round(value), mode: "numeric-cleanup" };
    }
    return { normalizedAmount: null, mode: "unparsed" };
  }

  const cleaned = cleanAmountText(value);
  if (!cleaned) {
    return { normalizedAmount: null, mode: "empty" };
  }

  const numeric = parseNumericChunks(cleaned);
  if (numeric !== null) {
    return { normalizedAmount: numeric, mode: "numeric-cleanup" };
  }

  const spoken = parseSpokenAmount(cleaned);
  if (spoken !== null) {
    return { normalizedAmount: spoken, mode: "spoken-number-parse" };
  }

  return { normalizedAmount: null, mode: "unparsed" };
};
