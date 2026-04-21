import {
  FieldProcessInput,
  TopUpVoiceInput,
  TopUpVoiceResult
} from "@/lib/contracts/row";
import { openAiFieldProcessor } from "@/lib/server/ai/openAiProcessor";
import { normalizeContributionAmountText } from "@/lib/server/normalization/amountNormalization";
import { normalizeMarathiText } from "@/lib/server/normalization/marathiText";

type TranscriptToken = {
  value: string;
  start: number;
  end: number;
};

type AmountMatch = {
  startIndex: number;
  endIndex: number;
  amount: number;
  hasDigit: boolean;
  hasEdgeContext: boolean;
  tokenSpan: number;
};

const MAX_AMOUNT_TOKEN_SPAN = 8;

const tokenizeTranscript = (transcript: string): TranscriptToken[] => {
  const tokens: TranscriptToken[] = [];
  const matcher = /\S+/g;
  let match = matcher.exec(transcript);

  while (match) {
    const value = match[0];
    const start = match.index;
    tokens.push({ value, start, end: start + value.length });
    match = matcher.exec(transcript);
  }

  return tokens;
};

const findAmountMatch = (tokens: TranscriptToken[]): AmountMatch | null => {
  const matches: AmountMatch[] = [];

  for (let startIndex = 0; startIndex < tokens.length; startIndex += 1) {
    for (
      let endIndex = startIndex;
      endIndex < tokens.length && endIndex - startIndex < MAX_AMOUNT_TOKEN_SPAN;
      endIndex += 1
    ) {
      const slice = tokens.slice(startIndex, endIndex + 1);
      const sample = slice.map((token) => token.value).join(" ");
      const parsed = normalizeContributionAmountText(sample);

      if (!parsed.normalizedAmount) {
        continue;
      }

      matches.push({
        startIndex,
        endIndex,
        amount: parsed.normalizedAmount,
        hasDigit: /[0-9०-९]/.test(sample),
        hasEdgeContext: startIndex > 0 && endIndex < tokens.length - 1,
        tokenSpan: endIndex - startIndex + 1
      });
    }
  }

  if (matches.length === 0) {
    return null;
  }

  matches.sort((left, right) => {
    if (left.hasEdgeContext !== right.hasEdgeContext) {
      return left.hasEdgeContext ? -1 : 1;
    }

    if (left.hasDigit !== right.hasDigit) {
      return left.hasDigit ? -1 : 1;
    }

    if (left.hasDigit && right.hasDigit && left.tokenSpan !== right.tokenSpan) {
      return left.tokenSpan - right.tokenSpan;
    }

    if (!left.hasDigit && !right.hasDigit && left.tokenSpan !== right.tokenSpan) {
      return right.tokenSpan - left.tokenSpan;
    }

    if (left.startIndex !== right.startIndex) {
      return left.startIndex - right.startIndex;
    }

    return right.endIndex - left.endIndex;
  });

  return matches[0];
};

const toFieldInput = (
  field: FieldProcessInput["field"],
  transcript: string,
  currentDraft: TopUpVoiceInput["currentDraft"]
): FieldProcessInput => ({
  field,
  transcript,
  currentDraft
});

const averageConfidence = (scores: number[]): number => {
  if (scores.length === 0) {
    return 0.5;
  }

  return Math.max(
    0,
    Math.min(
      1,
      scores.reduce((total, score) => total + score, 0) / scores.length
    )
  );
};

export const processTopUpVoiceWithAi = async (
  input: TopUpVoiceInput
): Promise<TopUpVoiceResult> => {
  const cleanedTranscript = normalizeMarathiText(input.transcript);
  const warnings: string[] = [];
  const tokens = tokenizeTranscript(cleanedTranscript);

  const amountMatch = findAmountMatch(tokens);
  if (!amountMatch) {
    return {
      nameMr: "",
      nameEn: "",
      contributionAmount: null,
      placeMr: "",
      placeEn: "",
      confidence: 0.35,
      warnings: [
        "Could not detect amount in transcript. Say phrase as: Name Amount Location."
      ]
    };
  }

  const nameSegment = tokens
    .slice(0, amountMatch.startIndex)
    .map((token) => token.value)
    .join(" ")
    .trim();
  const amountSegment = tokens
    .slice(amountMatch.startIndex, amountMatch.endIndex + 1)
    .map((token) => token.value)
    .join(" ")
    .trim();
  const placeSegment = tokens
    .slice(amountMatch.endIndex + 1)
    .map((token) => token.value)
    .join(" ")
    .trim();

  if (!nameSegment) {
    warnings.push("Name segment was empty. Put the name before the amount.");
  }
  if (!placeSegment) {
    warnings.push("Location segment was empty. Put the location after the amount.");
  }

  const [nameResult, placeResult, amountResult] = await Promise.all([
    nameSegment
      ? openAiFieldProcessor.processField(
          toFieldInput("nameMr", nameSegment, input.currentDraft)
        )
      : Promise.resolve(null),
    placeSegment
      ? openAiFieldProcessor.processField(
          toFieldInput("placeMr", placeSegment, input.currentDraft)
        )
      : Promise.resolve(null),
    openAiFieldProcessor.processField(
      toFieldInput("contributionAmount", amountSegment, input.currentDraft)
    )
  ]);

  const nameMr = nameResult?.cleanedText ?? nameSegment;
  const nameEn = nameResult?.transliteration ?? nameMr;
  const placeMr = placeResult?.cleanedText ?? placeSegment;
  const placeEn = placeResult?.transliteration ?? placeMr;
  const contributionAmount = amountResult.normalizedAmount ?? amountMatch.amount;

  warnings.push(...(nameResult?.warnings ?? []));
  warnings.push(...(placeResult?.warnings ?? []));
  warnings.push(...(amountResult.warnings ?? []));

  return {
    nameMr,
    nameEn,
    contributionAmount: contributionAmount ?? null,
    placeMr,
    placeEn,
    confidence: averageConfidence(
      [nameResult?.confidence, placeResult?.confidence, amountResult.confidence].filter(
        (value): value is number => typeof value === "number"
      )
    ),
    warnings: Array.from(new Set(warnings.filter((warning) => warning.trim().length > 0)))
  };
};
