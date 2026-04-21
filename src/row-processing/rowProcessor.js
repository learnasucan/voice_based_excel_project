"use strict";

const DEVANAGARI_DIGITS = Object.freeze({
  "०": "0",
  "१": "1",
  "२": "2",
  "३": "3",
  "४": "4",
  "५": "5",
  "६": "6",
  "७": "7",
  "८": "8",
  "९": "9",
});

const FIELD_NAMES = Object.freeze([
  "serialNumber",
  "nameMr",
  "nameEn",
  "contributionAmount",
  "placeMr",
  "placeEn",
]);

function createEmptyRow() {
  return {
    serialNumber: "",
    nameMr: "",
    nameEn: "",
    contributionAmount: "",
    placeMr: "",
    placeEn: "",
  };
}

function toStringSafe(value) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeDevanagariDigits(value) {
  let out = "";
  for (const ch of value) {
    out += DEVANAGARI_DIGITS[ch] || ch;
  }
  return out;
}

function sanitizeText(value) {
  const text = normalizeDevanagariDigits(toStringSafe(value));
  return normalizeWhitespace(text.replace(/[\u200c\u200d]/g, " "));
}

function normalizeSerialNumber(value) {
  const text = sanitizeText(value);
  if (!text) {
    return "";
  }
  const digits = text.replace(/[^0-9]/g, "");
  if (!digits) {
    return "";
  }
  return String(Number.parseInt(digits, 10));
}

function normalizeContributionAmount(value) {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) {
      return "";
    }
    return String(Math.round(value));
  }

  let text = sanitizeText(value);
  if (!text) {
    return "";
  }

  text = text
    .replace(/₹/g, "")
    .replace(/INR/gi, "")
    .replace(/Rs\.?/gi, "")
    .replace(/[\s,]/g, "")
    .replace(/\/-$/g, "")
    .replace(/\/$/g, "")
    .replace(/-$/g, "")
    .replace(/[^0-9.\-]/g, "");

  if (!text || text === "-" || text === "." || text === "-.") {
    return "";
  }

  const numeric = Number.parseFloat(text);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return "";
  }

  return String(Math.round(numeric));
}

function toCanonicalText(value) {
  return sanitizeText(value).toLowerCase();
}

function buildRowUniquenessKey(row) {
  const normalizedAmount = normalizeContributionAmount(row.contributionAmount);
  return [
    toCanonicalText(row.nameMr),
    toCanonicalText(row.nameEn),
    normalizedAmount,
    toCanonicalText(row.placeMr),
    toCanonicalText(row.placeEn),
  ].join("||");
}

function validateRow(row) {
  const errors = {};

  if (!normalizeSerialNumber(row.serialNumber)) {
    errors.serialNumber = "Serial number is required.";
  }
  if (!sanitizeText(row.nameMr)) {
    errors.nameMr = "Marathi name is required.";
  }
  if (!normalizeContributionAmount(row.contributionAmount)) {
    errors.contributionAmount = "Contribution amount must be a positive number.";
  }

  return errors;
}

class NoopTranscriptCleanupAdapter {
  async cleanupFieldText(_fieldName, value, _row) {
    return toStringSafe(value);
  }
}

class NoopTransliterationAdapter {
  async transliterateMrToEn(_fieldName, _marathiText, _row) {
    return "";
  }
}

async function prepareRow(inputRow, options = {}) {
  const cleanupAdapter =
    options.cleanupAdapter && typeof options.cleanupAdapter.cleanupFieldText === "function"
      ? options.cleanupAdapter
      : new NoopTranscriptCleanupAdapter();

  const transliterationAdapter =
    options.transliterationAdapter &&
    typeof options.transliterationAdapter.transliterateMrToEn === "function"
      ? options.transliterationAdapter
      : new NoopTransliterationAdapter();

  const row = createEmptyRow();

  for (const fieldName of FIELD_NAMES) {
    const rawValue = inputRow && Object.prototype.hasOwnProperty.call(inputRow, fieldName)
      ? inputRow[fieldName]
      : "";
    const cleaned = await cleanupAdapter.cleanupFieldText(fieldName, toStringSafe(rawValue), row);
    row[fieldName] = sanitizeText(cleaned);
  }

  row.serialNumber = normalizeSerialNumber(row.serialNumber);
  row.contributionAmount = normalizeContributionAmount(row.contributionAmount);

  const autoFillEnglishFromMarathi = options.autoFillEnglishFromMarathi !== false;

  if (autoFillEnglishFromMarathi && !row.nameEn && row.nameMr) {
    const transliteratedName = await transliterationAdapter.transliterateMrToEn(
      "nameMr",
      row.nameMr,
      row
    );
    row.nameEn = sanitizeText(transliteratedName);
  }

  if (autoFillEnglishFromMarathi && !row.placeEn && row.placeMr) {
    const transliteratedPlace = await transliterationAdapter.transliterateMrToEn(
      "placeMr",
      row.placeMr,
      row
    );
    row.placeEn = sanitizeText(transliteratedPlace);
  }

  const errors = validateRow(row);

  return {
    row,
    errors,
    isValid: Object.keys(errors).length === 0,
    uniquenessKey: buildRowUniquenessKey(row),
  };
}

function findDuplicateRow(candidateRow, existingRows, options = {}) {
  const candidateKey = buildRowUniquenessKey(candidateRow);
  const ignoreSerialNumber = normalizeSerialNumber(options.ignoreSerialNumber || "");

  for (let index = 0; index < existingRows.length; index += 1) {
    const current = existingRows[index];
    if (ignoreSerialNumber && normalizeSerialNumber(current.serialNumber) === ignoreSerialNumber) {
      continue;
    }

    if (buildRowUniquenessKey(current) === candidateKey) {
      return {
        index,
        row: current,
        key: candidateKey,
      };
    }
  }

  return null;
}

module.exports = {
  FIELD_NAMES,
  NoopTranscriptCleanupAdapter,
  NoopTransliterationAdapter,
  buildRowUniquenessKey,
  createEmptyRow,
  findDuplicateRow,
  normalizeContributionAmount,
  normalizeSerialNumber,
  prepareRow,
  sanitizeText,
  validateRow,
};
