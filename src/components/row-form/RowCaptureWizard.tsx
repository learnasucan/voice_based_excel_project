"use client";

import { useMemo, useState } from "react";
import { ContributionRow } from "@/lib/contracts/row";
import { transliterateMarathiToEnglish } from "@/lib/normalization/marathiTransliteration";
import { ApiClientError, checkDuplicate, createRow } from "@/lib/utils/apiClient";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

type DraftForm = {
  serialNumber: number;
  nameMr: string;
  nameEn: string;
  contributionAmount: string;
  placeMr: string;
  placeEn: string;
};

type Props = {
  nextSerialNumber: number;
  onRowCreated: (row: ContributionRow) => void;
};

type ParseResult = {
  draft: Partial<DraftForm>;
  confidence: number;
  warnings: string[];
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
  "रावले": "Ravale"
};

const AMOUNT_WORDS: Record<string, number> = {
  "पाचशे": 500,
  "दोनशे": 200,
  "तीनशे": 300,
  "चारशे": 400,
  "सहाशे": 600,
  "सातशे": 700,
  "आठशे": 800,
  "नऊशे": 900,
  "हजार": 1000,
  "एक हजार": 1000,
  "one hundred": 100,
  "two hundred": 200,
  "three hundred": 300,
  "four hundred": 400,
  "five hundred": 500,
  "six hundred": 600,
  "seven hundred": 700,
  "eight hundred": 800,
  "nine hundred": 900,
  "one thousand": 1000
};

const createInitialDraft = (serialNumber: number): DraftForm => ({
  serialNumber,
  nameMr: "",
  nameEn: "",
  contributionAmount: "",
  placeMr: "",
  placeEn: ""
});

const normalizeSpaces = (value: string): string => value.replace(/\s+/g, " ").trim();

const toAsciiDigits = (value: string): string =>
  Array.from(value)
    .map((char) => DEVANAGARI_DIGITS[char] ?? char)
    .join("");

const titleCase = (value: string): string =>
  normalizeSpaces(value)
    .split(" ")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1).toLowerCase() : part))
    .join(" ");

const transliterateCached = (value: string): string =>
  normalizeSpaces(value)
    .split(" ")
    .map((token) => TRANSLITERATION_CACHE[token] ?? transliterateMarathiToEnglish(token))
    .join(" ");

const parseAmountToken = (value: string): number | null => {
  const normalized = normalizeSpaces(toAsciiDigits(value).replace(/[₹,]/g, " "));
  const compactNumeric = normalized.replace(/\s+/g, "");
  if (/^(?:rs|inr)?\d+$/.test(compactNumeric.toLowerCase())) {
    const parsed = Number.parseInt(compactNumeric.replace(/^(?:rs|inr)/i, ""), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  const lower = normalized.toLowerCase();
  return AMOUNT_WORDS[lower] ?? null;
};

const parseEntryText = (text: string, serialNumber: number): ParseResult => {
  const cleaned = normalizeSpaces(text);
  const warnings: string[] = [];

  if (!cleaned) {
    return {
      draft: createInitialDraft(serialNumber),
      confidence: 0,
      warnings: ["Enter or speak one entry before parsing."]
    };
  }

  const tokens = cleaned.split(" ");
  let amountStart = -1;
  let amountEnd = -1;
  let amount: number | null = null;

  for (let start = 0; start < tokens.length; start += 1) {
    for (let end = start; end < Math.min(tokens.length, start + 3); end += 1) {
      const candidate = tokens.slice(start, end + 1).join(" ");
      const parsed = parseAmountToken(candidate);
      if (parsed) {
        amountStart = start;
        amountEnd = end;
        amount = parsed;
        break;
      }
    }

    if (amount) {
      break;
    }
  }

  if (!amount || amountStart < 0) {
    return {
      draft: {
        ...createInitialDraft(serialNumber),
        nameMr: cleaned
      },
      confidence: 0.35,
      warnings: ["Amount was not detected. Use format: Name Amount Place."]
    };
  }

  const nameMr = normalizeSpaces(tokens.slice(0, amountStart).join(" "));
  const placeMr = normalizeSpaces(tokens.slice(amountEnd + 1).join(" "));

  if (!nameMr) {
    warnings.push("Name is missing before the amount.");
  }

  if (!placeMr) {
    warnings.push("Place is missing after the amount.");
  }

  return {
    draft: {
      serialNumber,
      nameMr,
      nameEn: titleCase(transliterateCached(nameMr)),
      contributionAmount: String(amount),
      placeMr,
      placeEn: titleCase(transliterateCached(placeMr))
    },
    confidence: warnings.length ? 0.65 : 0.92,
    warnings
  };
};

const formatCurrency = (value: string): string => {
  const amount = Number.parseInt(value, 10);
  if (!Number.isFinite(amount) || amount <= 0) {
    return "-";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount);
};

export const RowCaptureWizard = ({ nextSerialNumber, onRowCreated }: Props) => {
  const [draft, setDraft] = useState<DraftForm>(createInitialDraft(nextSerialNumber));
  const [entryText, setEntryText] = useState("");
  const [manualMode, setManualMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);

  const applyParseResult = (result: ParseResult) => {
    setDraft((prev) => ({
      ...prev,
      ...result.draft
    }));
    setConfidence(result.confidence);
    setWarnings(result.warnings);
    setDuplicateWarning(null);
    setStatus(result.warnings.length ? "Please verify and edit before saving." : "Parsed locally. Verify and save.");
  };

  const speech = useSpeechRecognition({
    lang: "mr-IN",
    onTranscript: (transcript) => {
      setEntryText(transcript);
      applyParseResult(parseEntryText(transcript, nextSerialNumber));
    }
  });

  const hasPreview = useMemo(
    () =>
      Boolean(
        draft.nameMr ||
          draft.nameEn ||
          draft.contributionAmount ||
          draft.placeMr ||
          draft.placeEn
      ),
    [draft]
  );

  const missingFields = useMemo(() => {
    const missing: string[] = [];
    if (!draft.nameMr.trim()) missing.push("Name (MR)");
    if (!draft.nameEn.trim()) missing.push("Name (EN)");
    if (!draft.contributionAmount.trim()) missing.push("Amount");
    if (!draft.placeMr.trim()) missing.push("Place (MR)");
    if (!draft.placeEn.trim()) missing.push("Place (EN)");
    return missing;
  }, [draft]);

  const clearDraft = () => {
    setDraft(createInitialDraft(nextSerialNumber));
    setEntryText("");
    setWarnings([]);
    setDuplicateWarning(null);
    setConfidence(null);
    setStatus(null);
  };

  const parseManualEntry = () => {
    applyParseResult(parseEntryText(entryText, nextSerialNumber));
    setManualMode(true);
  };

  const saveRow = async () => {
    setSaving(true);
    setStatus(null);
    setDuplicateWarning(null);

    const amount = Number.parseInt(draft.contributionAmount, 10);

    if (missingFields.length > 0) {
      setSaving(false);
      setStatus(`Complete required fields: ${missingFields.join(", ")}.`);
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setSaving(false);
      setStatus("Amount must be a valid positive number.");
      return;
    }

    try {
      const duplicateResult = await checkDuplicate({
        nameMr: draft.nameMr,
        contributionAmount: amount,
        placeMr: draft.placeMr
      });

      if (duplicateResult.isDuplicate) {
        setDuplicateWarning(
          `Possible duplicate found with serial ${duplicateResult.matchedRow?.serialNumber ?? "unknown"}.`
        );
        return;
      }

      const created = await createRow({
        nameMr: draft.nameMr,
        nameEn: draft.nameEn,
        contributionAmount: amount,
        placeMr: draft.placeMr,
        placeEn: draft.placeEn
      });

      onRowCreated(created);
      setDraft(createInitialDraft(created.serialNumber + 1));
      setEntryText("");
      setWarnings([]);
      setConfidence(null);
      setStatus(`Saved row #${created.serialNumber}.`);
    } catch (error: unknown) {
      if (error instanceof ApiClientError && error.code === "DUPLICATE_ROW") {
        const matchedRow = (error.details as { matchedRow?: ContributionRow } | undefined)
          ?.matchedRow;
        setDuplicateWarning(
          `Possible duplicate found with serial ${matchedRow?.serialNumber ?? "unknown"}.`
        );
        return;
      }

      setStatus("Failed to save row. Please verify fields and retry.");
    } finally {
      setSaving(false);
    }
  };

  const updateDraft = (field: keyof DraftForm, value: string) => {
    setDraft((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "nameMr" ? { nameEn: titleCase(transliterateCached(value)) } : {}),
      ...(field === "placeMr" ? { placeEn: titleCase(transliterateCached(value)) } : {})
    }));
    setStatus(null);
    setDuplicateWarning(null);
  };

  return (
    <div className="space-y-3">
      <section className="rounded-lg border border-blue-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 text-blue-700">
                <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" stroke="currentColor" strokeWidth="2" />
                  <path d="M5 10v1a7 7 0 0 0 14 0v-1M12 18v3M8 21h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </span>
              <h2 className="text-base font-bold text-slate-950">Quick Entry</h2>
              <p className="text-sm text-slate-500">Speak: Name + Amount + Place</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={speech.isListening ? speech.stopListening : speech.startListening}
              disabled={!speech.isSupported || speech.permissionState === "denied"}
              className="min-w-[130px]"
            >
              {speech.isListening ? "Stop Voice" : "Start Voice"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setManualMode((value) => !value)}
            >
              Manual Entry
            </Button>
            <Button type="button" variant="danger" onClick={clearDraft}>
              Clear
            </Button>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-blue-100 bg-gradient-to-r from-blue-50 to-white p-3">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
                <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" stroke="currentColor" strokeWidth="2" />
                  <path d="M5 10v1a7 7 0 0 0 14 0v-1M12 18v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex h-9 items-end gap-1 text-blue-600" aria-hidden="true">
                  {Array.from({ length: 36 }).map((_, index) => (
                    <span
                      key={index}
                      className={`w-0.5 rounded-full bg-current ${speech.isListening ? "animate-pulse" : ""}`}
                      style={{ height: `${10 + ((index * 7) % 24)}px` }}
                    />
                  ))}
                </div>
                <p className="mt-1 text-sm font-semibold text-emerald-700">
                  {speech.isListening ? "Listening..." : "Ready for one full entry"}
                </p>
                <p className="text-xs text-slate-600">Example: कृष्णा रावळे ५०० नेवाळे</p>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Say once: नाव + रक्कम + ठिकाण
            </p>
          </div>

          {manualMode ? (
            <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto]">
              <Input
                aria-label="Manual quick entry"
                value={entryText}
                onChange={(event) => setEntryText(event.target.value)}
                placeholder="कृष्णा रावळे ५०० नेवाळे"
              />
              <Button type="button" onClick={parseManualEntry}>
                Parse Entry
              </Button>
            </div>
          ) : null}

          {!speech.isSupported ? (
            <p className="mt-2 text-xs text-amber-700">
              Speech-to-text is not supported in this browser. Use Chrome or manual entry.
            </p>
          ) : null}
          {speech.error ? <p className="mt-2 text-xs text-rose-600">{speech.error}</p> : null}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-950">Preview & Verify</h2>
            <p className="text-sm text-slate-500">Please verify the captured details</p>
          </div>
          <Button type="button" variant="ghost" onClick={() => setManualMode(true)}>
            Edit
          </Button>
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-[1fr_1fr_1fr_auto]">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <label className="text-xs font-semibold text-slate-600">Name (MR)</label>
            <Input
              aria-label="Name Marathi"
              value={draft.nameMr}
              onChange={(event) => updateDraft("nameMr", event.target.value)}
              placeholder="कृष्णा रावळे"
              className="mt-1 border-0 bg-transparent px-0 text-base font-semibold focus:ring-0"
            />
            <label className="mt-2 block text-xs font-semibold text-slate-600">Name (EN)</label>
            <Input
              aria-label="Name English"
              value={draft.nameEn}
              onChange={(event) => updateDraft("nameEn", event.target.value)}
              placeholder="Krishna Ravale"
              className="mt-1 border-0 bg-transparent px-0 focus:ring-0"
            />
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <label className="text-xs font-semibold text-slate-600">Amount</label>
            <Input
              aria-label="Contribution amount"
              value={draft.contributionAmount}
              onChange={(event) => updateDraft("contributionAmount", event.target.value)}
              placeholder="500"
              inputMode="numeric"
              className="mt-1 border-0 bg-transparent px-0 text-lg font-bold focus:ring-0"
            />
            <p className="mt-3 text-sm text-slate-500">{formatCurrency(draft.contributionAmount)}</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <label className="text-xs font-semibold text-slate-600">Place (MR)</label>
            <Input
              aria-label="Place Marathi"
              value={draft.placeMr}
              onChange={(event) => updateDraft("placeMr", event.target.value)}
              placeholder="नेवाळे"
              className="mt-1 border-0 bg-transparent px-0 text-base font-semibold focus:ring-0"
            />
            <label className="mt-2 block text-xs font-semibold text-slate-600">Place (EN)</label>
            <Input
              aria-label="Place English"
              value={draft.placeEn}
              onChange={(event) => updateDraft("placeEn", event.target.value)}
              placeholder="Nevale"
              className="mt-1 border-0 bg-transparent px-0 focus:ring-0"
            />
          </div>

          <div className="flex min-w-[190px] flex-col justify-center gap-2 border-slate-200 xl:border-l xl:pl-6">
            <Button type="button" onClick={saveRow} disabled={saving || !hasPreview}>
              {saving ? "Saving..." : "Save Row"}
            </Button>
            <Button type="button" variant="secondary" onClick={clearDraft}>
              Clear
            </Button>
          </div>
        </div>

        {confidence !== null ? (
          <p className="mt-3 text-xs text-slate-500">
            Parse confidence: {Math.round(confidence * 100)}%
          </p>
        ) : null}
        {warnings.length > 0 ? (
          <ul className="mt-2 space-y-1 text-xs text-amber-700">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : null}
        {duplicateWarning ? (
          <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {duplicateWarning}
          </p>
        ) : null}
        {status ? (
          <p className="mt-3 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800">
            {status}
          </p>
        ) : null}
      </section>
    </div>
  );
};
