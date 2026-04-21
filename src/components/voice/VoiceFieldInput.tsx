"use client";

import { useMemo, useRef, useState } from "react";
import { RowDraft, VoiceCaptureFieldName } from "@/lib/contracts/row";
import { processVoiceField } from "@/lib/utils/apiClient";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

type Props = {
  field: VoiceCaptureFieldName;
  label: string;
  prompt: string;
  lang: string;
  value: string;
  currentDraft: Partial<RowDraft>;
  onValueChange: (value: string) => void;
  onAutoFill?: (updates: Partial<Record<VoiceCaptureFieldName, string>>) => void;
  placeholder?: string;
};

const getAmountAsNumber = (value: string): number | null => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const VoiceFieldInput = ({
  field,
  label,
  prompt,
  lang,
  value,
  currentDraft,
  onValueChange,
  onAutoFill,
  placeholder
}: Props) => {
  const [lastTranscript, setLastTranscript] = useState("");
  const [processing, setProcessing] = useState(false);
  const [requestingPermission, setRequestingPermission] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const draftPayload = useMemo(
    () => ({
      serialNumber: currentDraft.serialNumber,
      nameMr: currentDraft.nameMr,
      nameEn: currentDraft.nameEn,
      contributionAmount:
        currentDraft.contributionAmount ??
        (typeof value === "string" && field === "contributionAmount"
          ? getAmountAsNumber(value)
          : null),
      placeMr: currentDraft.placeMr,
      placeEn: currentDraft.placeEn
    }),
    [currentDraft, field, value]
  );

  const onTranscript = async (transcript: string) => {
    setLocalError(null);
    setWarnings([]);
    setLastTranscript(transcript);
    setProcessing(true);

    try {
      const result = await processVoiceField({
        field,
        transcript,
        currentDraft: draftPayload
      });

      const nextValue =
        field === "contributionAmount"
          ? String(result.normalizedAmount ?? result.cleanedText)
          : result.cleanedText;

      onValueChange(nextValue);
      setWarnings(result.warnings);

      if (result.transliteration) {
        if (field === "nameMr") {
          onAutoFill?.({ nameEn: result.transliteration });
        }

        if (field === "placeMr") {
          onAutoFill?.({ placeEn: result.transliteration });
        }
      }
    } catch {
      setLocalError("Could not process transcript. Please edit manually or re-record.");
      onValueChange(transcript);
    } finally {
      setProcessing(false);
    }
  };

  const speech = useSpeechRecognition({
    lang,
    onTranscript
  });

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 p-3">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <p className="text-xs text-slate-600">{prompt}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={speech.isListening ? "danger" : "primary"}
          onClick={speech.isListening ? speech.stopListening : speech.startListening}
          disabled={
            !speech.isSupported ||
            processing ||
            requestingPermission ||
            speech.permissionState === "denied"
          }
        >
          {speech.isListening ? "Stop Listening" : "Start Microphone"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={async () => {
            setRequestingPermission(true);
            try {
              await speech.requestPermission();
            } finally {
              setRequestingPermission(false);
            }
          }}
          disabled={!speech.isSupported || processing || requestingPermission}
        >
          {requestingPermission ? "Requesting access..." : "Enable microphone access"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            onValueChange("");
            setWarnings([]);
            setLastTranscript("");
          }}
          disabled={processing}
        >
          Re-record
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => inputRef.current?.focus()}
          disabled={processing}
        >
          Edit manually
        </Button>
        {!speech.isSupported ? (
          <span className="text-xs text-amber-700">
            Speech recognition is not supported in this browser.
          </span>
        ) : null}
        {speech.permissionState === "denied" ? (
          <span className="text-xs text-amber-700">
            Microphone permission is blocked. Click Enable microphone access.
          </span>
        ) : null}
        {speech.isListening ? (
          <span className="text-xs font-medium text-brand-700">Listening...</span>
        ) : null}
      </div>

      <Input
        label="Captured / Editable Text"
        value={value}
        placeholder={placeholder}
        ref={inputRef}
        onChange={(event) => {
          setWarnings([]);
          onValueChange(event.target.value);
        }}
      />

      {processing ? <p className="text-xs text-brand-700">Processing transcript...</p> : null}
      {lastTranscript ? (
        <p className="text-xs text-slate-500">
          Last transcript: <span className="font-medium">{lastTranscript}</span>
        </p>
      ) : null}

      {warnings.length > 0 ? (
        <ul className="space-y-1 text-xs text-amber-700">
          {warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}

      {speech.error || localError ? (
        <p className="text-xs text-rose-600">{speech.error ?? localError}</p>
      ) : null}
    </div>
  );
};
