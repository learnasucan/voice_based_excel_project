"use client";

import { useEffect, useMemo, useState } from "react";
import { ContributionRow, VoiceCaptureFieldName } from "@/lib/contracts/row";
import {
  ApiClientError,
  checkDuplicate,
  createRow,
  processVoiceTopUp
} from "@/lib/utils/apiClient";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { VoiceFieldInput } from "@/components/voice/VoiceFieldInput";
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

type FieldConfig = {
  key: VoiceCaptureFieldName;
  label: string;
  prompt: string;
  lang: string;
  placeholder: string;
};

const FIELD_CONFIGS: FieldConfig[] = [
  {
    key: "nameMr",
    label: "Name (Marathi)",
    prompt: "Speak the Marathi name clearly.",
    lang: "mr-IN",
    placeholder: "उदा. वैभव जगताप"
  },
  {
    key: "nameEn",
    label: "Name (English)",
    prompt: "Speak the English/transliterated name or use suggested text.",
    lang: "en-IN",
    placeholder: "e.g. Vaibhav Jagtap"
  },
  {
    key: "contributionAmount",
    label: "Contribution Amount",
    prompt: "Speak amount (e.g. पाचशे / five hundred / 500).",
    lang: "mr-IN",
    placeholder: "e.g. 500"
  },
  {
    key: "placeMr",
    label: "Place (Marathi)",
    prompt: "Speak the Marathi place name.",
    lang: "mr-IN",
    placeholder: "उदा. पुणे"
  },
  {
    key: "placeEn",
    label: "Place (English)",
    prompt: "Speak the English/transliterated place or use suggested text.",
    lang: "en-IN",
    placeholder: "e.g. Pune"
  }
];

const createInitialDraft = (serialNumber: number): DraftForm => ({
  serialNumber,
  nameMr: "",
  nameEn: "",
  contributionAmount: "",
  placeMr: "",
  placeEn: ""
});

const deriveAcceptedFromDraft = (
  draft: Pick<DraftForm, "nameMr" | "nameEn" | "contributionAmount" | "placeMr" | "placeEn">
): Record<VoiceCaptureFieldName, boolean> => ({
  nameMr: draft.nameMr.trim().length > 0,
  nameEn: draft.nameEn.trim().length > 0,
  contributionAmount: draft.contributionAmount.trim().length > 0,
  placeMr: draft.placeMr.trim().length > 0,
  placeEn: draft.placeEn.trim().length > 0
});

const findFirstUnacceptedIndex = (
  acceptedMap: Record<VoiceCaptureFieldName, boolean>
): number => {
  const pending = FIELD_CONFIGS.findIndex((field) => !acceptedMap[field.key]);
  return pending >= 0 ? pending : FIELD_CONFIGS.length - 1;
};

export const RowCaptureWizard = ({ nextSerialNumber, onRowCreated }: Props) => {
  const [draft, setDraft] = useState<DraftForm>(createInitialDraft(nextSerialNumber));
  const [accepted, setAccepted] = useState<Record<VoiceCaptureFieldName, boolean>>({
    nameMr: false,
    nameEn: false,
    contributionAmount: false,
    placeMr: false,
    placeEn: false
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [topUpTranscript, setTopUpTranscript] = useState("");
  const [topUpWarnings, setTopUpWarnings] = useState<string[]>([]);
  const [topUpError, setTopUpError] = useState<string | null>(null);
  const [topUpProcessing, setTopUpProcessing] = useState(false);
  const [requestingTopUpPermission, setRequestingTopUpPermission] = useState(false);

  useEffect(() => {
    const hasUnsavedData =
      draft.nameMr || draft.nameEn || draft.contributionAmount || draft.placeMr || draft.placeEn;
    if (!hasUnsavedData) {
      setDraft(createInitialDraft(nextSerialNumber));
    }
  }, [nextSerialNumber, draft.contributionAmount, draft.nameEn, draft.nameMr, draft.placeEn, draft.placeMr]);

  const currentFieldConfig = FIELD_CONFIGS[currentIndex];

  const topUpSpeech = useSpeechRecognition({
    lang: "hi-IN",
    onTranscript: async (transcript: string) => {
      setTopUpTranscript(transcript);
      setTopUpWarnings([]);
      setTopUpError(null);
      setTopUpProcessing(true);
      setFormError(null);
      setDuplicateWarning(null);

      try {
        const contributionAmount = Number.parseInt(draft.contributionAmount, 10);
        const result = await processVoiceTopUp({
          transcript,
          currentDraft: {
            serialNumber: draft.serialNumber,
            nameMr: draft.nameMr,
            nameEn: draft.nameEn,
            contributionAmount:
              Number.isFinite(contributionAmount) && contributionAmount > 0
                ? contributionAmount
                : null,
            placeMr: draft.placeMr,
            placeEn: draft.placeEn
          }
        });

        const nextDraft: DraftForm = {
          serialNumber: draft.serialNumber,
          nameMr: result.nameMr || draft.nameMr,
          nameEn: result.nameEn || draft.nameEn,
          contributionAmount:
            result.contributionAmount !== null && result.contributionAmount !== undefined
              ? String(result.contributionAmount)
              : draft.contributionAmount,
          placeMr: result.placeMr || draft.placeMr,
          placeEn: result.placeEn || draft.placeEn
        };

        const nextAccepted = deriveAcceptedFromDraft(nextDraft);
        setDraft(nextDraft);
        setAccepted(nextAccepted);
        setCurrentIndex(findFirstUnacceptedIndex(nextAccepted));
        setTopUpWarnings(result.warnings);
      } catch (error: unknown) {
        const message =
          typeof error === "object" && error !== null && "message" in error
            ? String(error.message)
            : "Could not process top-up voice input. Try again or continue manual entry.";
        setTopUpError(message);
      } finally {
        setTopUpProcessing(false);
      }
    }
  });

  const progress = useMemo(() => {
    const doneCount = FIELD_CONFIGS.filter((field) => accepted[field.key]).length;
    return {
      doneCount,
      total: FIELD_CONFIGS.length
    };
  }, [accepted]);

  const updateField = (field: VoiceCaptureFieldName, value: string) => {
    setDraft((prev) => ({
      ...prev,
      [field]: value
    }));
    setAccepted((prev) => ({
      ...prev,
      [field]: false
    }));
    setFormError(null);
    setDuplicateWarning(null);
  };

  const onAcceptField = () => {
    const value = draft[currentFieldConfig.key];
    if (!value.trim()) {
      setFormError(`${currentFieldConfig.label} is required before accepting.`);
      return;
    }

    setAccepted((prev) => ({
      ...prev,
      [currentFieldConfig.key]: true
    }));
    setFormError(null);

    if (currentIndex < FIELD_CONFIGS.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const hasRequiredDraftFields = FIELD_CONFIGS.every((field) =>
    draft[field.key].trim().length > 0
  );

  const handleSave = async () => {
    setSaving(true);
    setFormError(null);
    setDuplicateWarning(null);

    const contributionAmount = Number.parseInt(draft.contributionAmount, 10);

    if (!hasRequiredDraftFields) {
      setSaving(false);
      setFormError("Complete all row fields before saving.");
      return;
    }

    if (!Number.isFinite(contributionAmount) || contributionAmount <= 0) {
      setSaving(false);
      setFormError("Contribution amount must be a valid positive number.");
      return;
    }

    try {
      const duplicateResult = await checkDuplicate({
        nameMr: draft.nameMr,
        contributionAmount,
        placeMr: draft.placeMr
      });

      if (duplicateResult.isDuplicate) {
        setDuplicateWarning(
          `Duplicate detected (Name: ${duplicateResult.matchedRow?.nameMr}, Amount: ${duplicateResult.matchedRow?.contributionAmount}, Place: ${duplicateResult.matchedRow?.placeMr}). Save is blocked.`
        );
        return;
      }

      const created = await createRow({
        nameMr: draft.nameMr,
        nameEn: draft.nameEn,
        contributionAmount,
        placeMr: draft.placeMr,
        placeEn: draft.placeEn
      });

      onRowCreated(created);
      setDraft(createInitialDraft(created.serialNumber + 1));
      setAccepted({
        nameMr: false,
        nameEn: false,
        contributionAmount: false,
        placeMr: false,
        placeEn: false
      });
      setCurrentIndex(0);
    } catch (error: unknown) {
      if (error instanceof ApiClientError && error.code === "DUPLICATE_ROW") {
        const matchedRow = (error.details as { matchedRow?: ContributionRow } | undefined)
          ?.matchedRow;

        if (matchedRow) {
          setDuplicateWarning(
            `Duplicate detected. This matches row #${matchedRow.serialNumber} (${matchedRow.nameMr}, ${matchedRow.contributionAmount}, ${matchedRow.placeMr}).`
          );
        } else {
          setDuplicateWarning("Duplicate detected. Save is blocked.");
        }
        return;
      }

      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String(error.message)
          : "Failed to save row";
      setFormError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      title="Add New Row"
      subtitle="Capture one field at a time: Listen -> Verify -> Accept -> Next"
    >
      <div className="mb-4 flex items-center justify-between">
        <Badge variant="success">Serial Number: {draft.serialNumber}</Badge>
        <Badge>{`Progress: ${progress.doneCount}/${progress.total}`}</Badge>
      </div>

      <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 p-3">
        <p className="text-sm font-semibold text-slate-800">Top-up Voice (Name + Amount + Location)</p>
        <p className="mt-1 text-xs text-slate-600">
          Speak one phrase in order: Name, Amount, Location. Example: Krishna Ravale 500 Nevale.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={topUpSpeech.isListening ? topUpSpeech.stopListening : topUpSpeech.startListening}
            disabled={
              !topUpSpeech.isSupported ||
              topUpProcessing ||
              requestingTopUpPermission ||
              topUpSpeech.permissionState === "denied"
            }
          >
            {topUpSpeech.isListening ? "Stop Top-up Voice" : "Start Top-up Voice"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={async () => {
              setRequestingTopUpPermission(true);
              try {
                await topUpSpeech.requestPermission();
              } finally {
                setRequestingTopUpPermission(false);
              }
            }}
            disabled={
              !topUpSpeech.isMicrophoneSupported ||
              requestingTopUpPermission ||
              topUpProcessing
            }
          >
            {requestingTopUpPermission ? "Requesting access..." : "Enable microphone access"}
          </Button>
        </div>

        {!topUpSpeech.isSupported ? (
          <p className="mt-2 text-xs text-amber-700">
            Speech-to-text is not supported in this browser. Use Chrome or Edge for top-up voice.
          </p>
        ) : null}
        {!topUpSpeech.isMicrophoneSupported ? (
          <p className="mt-2 text-xs text-amber-700">
            Microphone access is unavailable on this page or device.
          </p>
        ) : null}
        {topUpSpeech.isListening ? (
          <p className="mt-2 text-xs font-medium text-brand-700">Listening for full row...</p>
        ) : null}
        {topUpTranscript ? (
          <p className="mt-2 text-xs text-slate-500">
            Last top-up transcript: <span className="font-medium">{topUpTranscript}</span>
          </p>
        ) : null}
        {topUpProcessing ? (
          <p className="mt-2 text-xs text-brand-700">Applying top-up voice to row fields...</p>
        ) : null}
        {topUpWarnings.length > 0 ? (
          <ul className="mt-2 space-y-1 text-xs text-amber-700">
            {topUpWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : null}
        {topUpSpeech.error || topUpError ? (
          <p className="mt-2 text-xs text-rose-600">{topUpSpeech.error ?? topUpError}</p>
        ) : null}
      </div>

      <div className="space-y-4">
        <VoiceFieldInput
          field={currentFieldConfig.key}
          label={currentFieldConfig.label}
          prompt={currentFieldConfig.prompt}
          lang={currentFieldConfig.lang}
          value={draft[currentFieldConfig.key]}
          currentDraft={{
            serialNumber: draft.serialNumber,
            nameMr: draft.nameMr,
            nameEn: draft.nameEn,
            contributionAmount:
              Number.parseInt(draft.contributionAmount, 10) > 0
                ? Number.parseInt(draft.contributionAmount, 10)
                : null,
            placeMr: draft.placeMr,
            placeEn: draft.placeEn
          }}
          placeholder={currentFieldConfig.placeholder}
          onValueChange={(value) => updateField(currentFieldConfig.key, value)}
          onAutoFill={(updates) => {
            if (updates.nameEn) {
              setDraft((prev) => ({ ...prev, nameEn: updates.nameEn ?? prev.nameEn }));
            }
            if (updates.placeEn) {
              setDraft((prev) => ({ ...prev, placeEn: updates.placeEn ?? prev.placeEn }));
            }
          }}
        />

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={onAcceptField}>
            Accept
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
            disabled={currentIndex === 0}
          >
            Previous Field
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setCurrentIndex((prev) => Math.min(prev + 1, FIELD_CONFIGS.length - 1))
            }
            disabled={currentIndex === FIELD_CONFIGS.length - 1}
          >
            Next Field
          </Button>
        </div>
      </div>

      <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
        <h3 className="text-sm font-semibold text-slate-800">Review Before Save</h3>
        <div className="mt-2 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
          <p>
            <span className="font-medium">Name (MR): </span>
            {draft.nameMr || "-"}
          </p>
          <p>
            <span className="font-medium">Name (EN): </span>
            {draft.nameEn || "-"}
          </p>
          <p>
            <span className="font-medium">Amount: </span>
            {draft.contributionAmount || "-"}
          </p>
          <p>
            <span className="font-medium">Place (MR): </span>
            {draft.placeMr || "-"}
          </p>
          <p>
            <span className="font-medium">Place (EN): </span>
            {draft.placeEn || "-"}
          </p>
        </div>
      </div>

      {duplicateWarning ? (
        <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {duplicateWarning}
        </p>
      ) : null}

      {formError ? (
        <p className="mt-3 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {formError}
        </p>
      ) : null}

      <div className="mt-4 flex gap-2">
        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Row"}
        </Button>
      </div>
    </Card>
  );
};
