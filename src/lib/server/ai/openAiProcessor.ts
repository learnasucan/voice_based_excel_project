import { env } from "@/lib/config/env";
import { FieldProcessInput, FieldProcessResult } from "@/lib/contracts/row";
import { fallbackFieldProcessor } from "@/lib/server/ai/fallbackProcessor";
import { FieldProcessor } from "@/lib/server/ai/types";

const SYSTEM_PROMPT = `You are an expert processor for Marathi and English mixed speech transcripts for structured data entry.\n\nRules:\n1) Keep cleanedText concise and corrected.\n2) For field 'contributionAmount', output normalizedAmount as positive integer if confident.\n3) For fields 'nameMr' or 'placeMr', output transliteration in natural English phonetic form.\n4) Keep warnings as a string array.\n5) confidence must be between 0 and 1.\n6) Return strictly JSON object: { cleanedText, transliteration?, normalizedAmount?, confidence, warnings }.`;

const callOpenAi = async (input: FieldProcessInput): Promise<FieldProcessResult> => {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT
        },
        {
          role: "user",
          content: JSON.stringify(input)
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned empty response");
  }

  const parsed = JSON.parse(content) as FieldProcessResult;

  return {
    cleanedText: parsed.cleanedText,
    transliteration: parsed.transliteration,
    normalizedAmount: parsed.normalizedAmount,
    confidence: Number.isFinite(parsed.confidence) ? Math.min(1, Math.max(0, parsed.confidence)) : 0.5,
    warnings: Array.isArray(parsed.warnings) ? parsed.warnings : []
  };
};

export const openAiFieldProcessor: FieldProcessor = {
  processField: async (input: FieldProcessInput): Promise<FieldProcessResult> => {
    if (!env.OPENAI_API_KEY) {
      return fallbackFieldProcessor.processField(input);
    }

    try {
      return await callOpenAi(input);
    } catch {
      return fallbackFieldProcessor.processField(input);
    }
  }
};
