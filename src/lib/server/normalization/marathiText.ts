const ZERO_WIDTH_RE = /[\u200b\u200c\u200d\ufeff]/g;
const SERIAL_PREFIX_RE = /^[0-9०-९]+\s*[)\.]?\s*/;
const LEADING_PUNCT_RE = /^[-:;,.]+\s*/;

export const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, " ").trim();

export const normalizeMarathiText = (value: string): string =>
  normalizeWhitespace(
    value
      .normalize("NFKC")
      .replace(ZERO_WIDTH_RE, " ")
      .replace(/[|]/g, " ")
      .replace(/[।]/g, " ")
      .replace(/[\[\]{}<>]/g, " ")
  );

export const stripSerialPrefix = (value: string): string =>
  normalizeWhitespace(normalizeMarathiText(value).replace(SERIAL_PREFIX_RE, "").replace(LEADING_PUNCT_RE, ""));

export const normalizeNameMrText = (value: string): string =>
  normalizeWhitespace(
    stripSerialPrefix(value)
      .replace(/\s+[-–—]\s+/g, " ")
      .replace(/\s{2,}/g, " ")
  );

export const normalizePlaceMrText = (value: string): string =>
  normalizeWhitespace(
    stripSerialPrefix(value)
      .replace(/\s+,/g, ",")
      .replace(/,\s*/g, ", ")
  );
