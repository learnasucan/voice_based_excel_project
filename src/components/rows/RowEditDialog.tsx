"use client";

import { useEffect, useMemo, useState } from "react";
import { ContributionRow, VoiceCaptureFieldName } from "@/lib/contracts/row";
import { ApiClientError, updateRow } from "@/lib/utils/apiClient";
import { Button } from "@/components/ui/Button";
import { VoiceFieldInput } from "@/components/voice/VoiceFieldInput";

type Props = {
  row: ContributionRow | null;
  onClose: () => void;
  onRowUpdated: (row: ContributionRow) => void;
};

type EditableDraft = {
  nameMr: string;
  nameEn: string;
  contributionAmount: string;
  placeMr: string;
  placeEn: string;
};

type FieldConfig = {
  key: VoiceCaptureFieldName;
  label: string;
  prompt: string;
  lang: string;
};

const FIELD_CONFIGS: FieldConfig[] = [
  {
    key: "nameMr",
    label: "Name (Marathi)",
    prompt: "Re-run voice input or edit manually.",
    lang: "mr-IN"
  },
  {
    key: "nameEn",
    label: "Name (English)",
    prompt: "Re-run voice input or edit manually.",
    lang: "en-IN"
  },
  {
    key: "contributionAmount",
    label: "Contribution Amount",
    prompt: "Speak or edit amount.",
    lang: "mr-IN"
  },
  {
    key: "placeMr",
    label: "Place (Marathi)",
    prompt: "Re-run voice input or edit manually.",
    lang: "mr-IN"
  },
  {
    key: "placeEn",
    label: "Place (English)",
    prompt: "Re-run voice input or edit manually.",
    lang: "en-IN"
  }
];

export const RowEditDialog = ({ row, onClose, onRowUpdated }: Props) => {
  const [draft, setDraft] = useState<EditableDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  useEffect(() => {
    if (!row) {
      setDraft(null);
      return;
    }

    setDraft({
      nameMr: row.nameMr,
      nameEn: row.nameEn,
      contributionAmount: String(row.contributionAmount),
      placeMr: row.placeMr,
      placeEn: row.placeEn
    });
  }, [row]);

  const currentDraftForProcessor = useMemo(() => {
    if (!row || !draft) {
      return {};
    }

    const amount = Number.parseInt(draft.contributionAmount, 10);

    return {
      serialNumber: row.serialNumber,
      nameMr: draft.nameMr,
      nameEn: draft.nameEn,
      contributionAmount: Number.isFinite(amount) && amount > 0 ? amount : null,
      placeMr: draft.placeMr,
      placeEn: draft.placeEn
    };
  }, [draft, row]);

  if (!row || !draft) {
    return null;
  }

  const dialogTitleId = `edit-row-dialog-title-${row.id}`;

  const updateField = (field: VoiceCaptureFieldName, value: string) => {
    setDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
    setError(null);
    setDuplicateWarning(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setDuplicateWarning(null);

    try {
      if (!draft.nameMr.trim()) {
        setError("Name (Marathi) is required.");
        return;
      }

      if (!draft.nameEn.trim()) {
        setError("Name (English) is required.");
        return;
      }

      if (!draft.placeMr.trim()) {
        setError("Place (Marathi) is required.");
        return;
      }

      if (!draft.placeEn.trim()) {
        setError("Place (English) is required.");
        return;
      }

      const amount = Number.parseInt(draft.contributionAmount, 10);

      if (!Number.isFinite(amount) || amount <= 0) {
        setError("Contribution amount must be a valid positive number.");
        return;
      }

      const updated = await updateRow(row.id, {
        nameMr: draft.nameMr,
        nameEn: draft.nameEn,
        contributionAmount: amount,
        placeMr: draft.placeMr,
        placeEn: draft.placeEn
      });

      onRowUpdated(updated);
      onClose();
    } catch (saveError: unknown) {
      if (saveError instanceof ApiClientError && saveError.code === "DUPLICATE_ROW") {
        const matchedRow = (saveError.details as { matchedRow?: ContributionRow } | undefined)
          ?.matchedRow;

        if (matchedRow) {
          setDuplicateWarning(
            `Duplicate detected. This matches row #${matchedRow.serialNumber} (${matchedRow.nameMr}, ${matchedRow.contributionAmount}, ${matchedRow.placeMr}).`
          );
        } else {
          setDuplicateWarning("Duplicate detected. Please adjust name, amount, or place.");
        }
        return;
      }

      const message =
        typeof saveError === "object" && saveError !== null && "message" in saveError
          ? String(saveError.message)
          : "Failed to update row";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={dialogTitleId}
    >
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-4 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 id={dialogTitleId} className="text-lg font-semibold text-slate-900">
            Edit Row #{row.serialNumber}
          </h2>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="space-y-3">
          {FIELD_CONFIGS.map((field) => (
            <VoiceFieldInput
              key={field.key}
              field={field.key}
              label={field.label}
              prompt={field.prompt}
              lang={field.lang}
              value={draft[field.key]}
              currentDraft={currentDraftForProcessor}
              onValueChange={(value) => updateField(field.key, value)}
              onAutoFill={(updates) => {
                if (updates.nameEn) {
                  updateField("nameEn", updates.nameEn);
                }
                if (updates.placeEn) {
                  updateField("placeEn", updates.placeEn);
                }
              }}
            />
          ))}
        </div>

        {duplicateWarning ? (
          <p
            className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800"
            role="status"
            aria-live="polite"
          >
            {duplicateWarning}
          </p>
        ) : null}

        {error ? (
          <p
            className="mt-4 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-4 flex gap-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};
