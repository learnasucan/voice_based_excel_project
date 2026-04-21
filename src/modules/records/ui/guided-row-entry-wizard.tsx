"use client"

import { CreateRowInputSchema, type CreateRowInput, type VoiceCaptureFieldName } from "@/lib/contracts/row"
import { useEffect, useMemo, useRef, useState } from "react"

import { createLiveSpeechCaptureService, createSaveRowService } from "./row-entry-services"

type FieldStepDefinition = {
  id: VoiceCaptureFieldName
  heading: string
  description: string
  placeholder: string
  languageCode: string
  inputMode?: "text" | "decimal"
}

type FieldState = {
  value: string
  transcript: string
  accepted: boolean
  listening: boolean
  helper: string
  error: string
}

const fieldSteps: FieldStepDefinition[] = [
  {
    id: "nameMr",
    heading: "Name Marathi",
    description: "Speak or type the Marathi name.",
    placeholder: "उदा. गणेश पाटील",
    languageCode: "mr-IN",
    inputMode: "text"
  },
  {
    id: "nameEn",
    heading: "Name English Transliteration",
    description: "Capture the English transliteration of the same name.",
    placeholder: "e.g. Ganesh Patil",
    languageCode: "en-IN",
    inputMode: "text"
  },
  {
    id: "contributionAmount",
    heading: "Contribution Amount",
    description: "Enter the contribution amount as a positive number.",
    placeholder: "e.g. 1500",
    languageCode: "en-IN",
    inputMode: "decimal"
  },
  {
    id: "placeMr",
    heading: "Place Marathi",
    description: "Capture the place in Marathi.",
    placeholder: "उदा. पुणे",
    languageCode: "mr-IN",
    inputMode: "text"
  },
  {
    id: "placeEn",
    heading: "Place English Transliteration",
    description: "Capture the English transliteration of the place.",
    placeholder: "e.g. Pune",
    languageCode: "en-IN",
    inputMode: "text"
  }
]

const englishTransliterationPattern = /^[A-Za-z .'-]+$/
const devanagariDigitToLatin: Record<string, string> = {
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
}

function buildInitialFieldState(): Record<VoiceCaptureFieldName, FieldState> {
  return {
    nameMr: {
      value: "",
      transcript: "",
      accepted: false,
      listening: false,
      helper: "Capture by voice or type manually, then press Accept.",
      error: ""
    },
    nameEn: {
      value: "",
      transcript: "",
      accepted: false,
      listening: false,
      helper: "Capture by voice or type manually, then press Accept.",
      error: ""
    },
    contributionAmount: {
      value: "",
      transcript: "",
      accepted: false,
      listening: false,
      helper: "Capture by voice or type manually, then press Accept.",
      error: ""
    },
    placeMr: {
      value: "",
      transcript: "",
      accepted: false,
      listening: false,
      helper: "Capture by voice or type manually, then press Accept.",
      error: ""
    },
    placeEn: {
      value: "",
      transcript: "",
      accepted: false,
      listening: false,
      helper: "Capture by voice or type manually, then press Accept.",
      error: ""
    }
  }
}

function toLatinDigits(value: string): string {
  return Array.from(value)
    .map((character) => devanagariDigitToLatin[character] ?? character)
    .join("")
}

function normalizeAmountInput(value: string): string {
  return toLatinDigits(value)
    .replace(/₹/g, "")
    .replace(/INR/gi, "")
    .replace(/Rs\.?/gi, "")
    .replace(/\/-$/g, "")
    .replace(/[\s,]/g, "")
    .replace(/[^0-9.]/g, "")
}

function validateFieldValue(fieldId: VoiceCaptureFieldName, value: string): string {
  const trimmed = value.trim()

  if (!trimmed) {
    return "This field is required."
  }

  if (fieldId === "nameEn" || fieldId === "placeEn") {
    if (!englishTransliterationPattern.test(trimmed)) {
      return "Use roman letters for English transliteration."
    }
  }

  if (fieldId === "contributionAmount") {
    const normalizedAmount = normalizeAmountInput(trimmed)
    const amount = Number.parseFloat(normalizedAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      return "Contribution amount must be a positive number."
    }
  }

  return ""
}

export function GuidedRowEntryWizard() {
  const [activeStepIndex, setActiveStepIndex] = useState(0)
  const [fieldStateById, setFieldStateById] = useState(buildInitialFieldState)
  const [listeningFieldId, setListeningFieldId] = useState<VoiceCaptureFieldName | null>(null)
  const [reviewConfirmed, setReviewConfirmed] = useState(false)
  const [savePending, setSavePending] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [saveSuccess, setSaveSuccess] = useState("")
  const activeInputRef = useRef<HTMLInputElement | null>(null)

  const speechService = useMemo(() => createLiveSpeechCaptureService(), [])
  const saveService = useMemo(() => createSaveRowService(), [])
  const activeStep = fieldSteps[activeStepIndex] ?? null
  const isReviewStep = activeStep === null

  const allFieldsAccepted = fieldSteps.every((step) => fieldStateById[step.id].accepted)

  useEffect(() => {
    return () => {
      speechService.stopListening()
    }
  }, [speechService])

  const applyFieldUpdate = (
    fieldId: VoiceCaptureFieldName,
    updater: (currentFieldState: FieldState) => FieldState
  ) => {
    setFieldStateById((previousState) => ({
      ...previousState,
      [fieldId]: updater(previousState[fieldId])
    }))
  }

  const stopListening = (fieldId: VoiceCaptureFieldName) => {
    speechService.stopListening()
    setListeningFieldId(null)
    applyFieldUpdate(fieldId, (currentFieldState) => ({
      ...currentFieldState,
      listening: false,
      helper: "Recording stopped. Re-record or edit manually."
    }))
  }

  const startListening = (step: FieldStepDefinition) => {
    if (listeningFieldId && listeningFieldId !== step.id) {
      stopListening(listeningFieldId)
    }

    setListeningFieldId(step.id)
    applyFieldUpdate(step.id, (currentFieldState) => ({
      ...currentFieldState,
      accepted: false,
      listening: true,
      error: "",
      helper: "Listening..."
    }))

    try {
      speechService.startListening({
        fieldId: step.id,
        languageCode: step.languageCode,
        onResult: (transcript) => {
          applyFieldUpdate(step.id, (currentFieldState) => ({
            ...currentFieldState,
            transcript,
            value: transcript,
            accepted: false,
            error: "",
            helper: "Transcript captured. Verify visually, then press Accept."
          }))
        },
        onStateChange: (isListening) => {
          applyFieldUpdate(step.id, (currentFieldState) => ({
            ...currentFieldState,
            listening: isListening,
            helper: isListening
              ? "Listening..."
              : currentFieldState.helper === "Listening..."
                ? "Voice capture complete. Verify and accept."
                : currentFieldState.helper
          }))
          if (!isListening) {
            setListeningFieldId((currentListeningField) =>
              currentListeningField === step.id ? null : currentListeningField
            )
          }
        },
        onError: (message) => {
          applyFieldUpdate(step.id, (currentFieldState) => ({
            ...currentFieldState,
            listening: false,
            error: message,
            helper: "Use keyboard fallback or re-record."
          }))
          setListeningFieldId((currentListeningField) =>
            currentListeningField === step.id ? null : currentListeningField
          )
        }
      })
    } catch (error) {
      applyFieldUpdate(step.id, (currentFieldState) => ({
        ...currentFieldState,
        listening: false,
        error: error instanceof Error ? error.message : "Unable to start voice capture.",
        helper: "Use keyboard fallback and press Accept."
      }))
      setListeningFieldId((currentListeningField) =>
        currentListeningField === step.id ? null : currentListeningField
      )
    }
  }

  const handleAccept = (step: FieldStepDefinition) => {
    const currentState = fieldStateById[step.id]
    const validationError = validateFieldValue(step.id, currentState.value)
    const normalizedValue =
      step.id === "contributionAmount"
        ? normalizeAmountInput(currentState.value)
        : currentState.value.trim()

    applyFieldUpdate(step.id, (fieldState) => ({
      ...fieldState,
      value: validationError ? fieldState.value : normalizedValue,
      accepted: !validationError,
      error: validationError,
      helper: validationError
        ? "Resolve the validation issue, then accept again."
        : "Accepted. Continue when ready."
    }))
  }

  const handleManualEdit = (step: FieldStepDefinition) => {
    applyFieldUpdate(step.id, (fieldState) => ({
      ...fieldState,
      accepted: false,
      error: "",
      helper: "Edit manually, then press Accept."
    }))
    setTimeout(() => {
      activeInputRef.current?.focus()
    }, 0)
  }

  const handleRerecord = (step: FieldStepDefinition) => {
    applyFieldUpdate(step.id, (fieldState) => ({
      ...fieldState,
      value: "",
      transcript: "",
      accepted: false,
      error: "",
      helper: "Recording restarted."
    }))
    startListening(step)
  }

  const moveToStep = (nextStepIndex: number) => {
    if (nextStepIndex < 0 || nextStepIndex > fieldSteps.length) {
      return
    }
    if (listeningFieldId) {
      stopListening(listeningFieldId)
    }
    setActiveStepIndex(nextStepIndex)
    setSaveError("")
    setSaveSuccess("")
  }

  const handleSave = async () => {
    const candidateRow: CreateRowInput = {
      nameMr: fieldStateById.nameMr.value.trim(),
      nameEn: fieldStateById.nameEn.value.trim(),
      contributionAmount: Number.parseInt(normalizeAmountInput(fieldStateById.contributionAmount.value), 10),
      placeMr: fieldStateById.placeMr.value.trim(),
      placeEn: fieldStateById.placeEn.value.trim()
    }

    const parseResult = CreateRowInputSchema.safeParse(candidateRow)
    if (!parseResult.success) {
      setSaveError(parseResult.error.issues[0]?.message ?? "Invalid row details.")
      setSaveSuccess("")
      return
    }

    setSavePending(true)
    setSaveError("")
    setSaveSuccess("")

    try {
      const saveResult = await saveService.save(parseResult.data)
      setSaveSuccess(`Row saved successfully (${saveResult.id}, source: ${saveResult.source}).`)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Save failed.")
    } finally {
      setSavePending(false)
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white/95 shadow-sm">
      <div className="border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-5 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Worker C UI</p>
        <h1 className="mt-1 text-xl font-semibold text-slate-900 sm:text-2xl">Guided Row Entry Wizard</h1>
        <p className="mt-2 text-sm text-slate-600">
          One field at a time. Verify transcript visually, then accept before moving ahead.
        </p>
        <p className="mt-2 inline-flex rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-medium text-emerald-700">
          Speech service: {speechService.mode}
        </p>
      </div>

      <ol className="grid gap-2 border-b border-slate-200 bg-slate-50/70 px-4 py-4 sm:grid-cols-3 sm:px-6">
        {fieldSteps.map((step, index) => {
          const isComplete = fieldStateById[step.id].accepted
          const isActive = index === activeStepIndex
          return (
            <li
              key={step.id}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs sm:text-sm ${
                isActive
                  ? "border-emerald-400 bg-emerald-50 text-emerald-900"
                  : isComplete
                    ? "border-emerald-200 bg-white text-emerald-800"
                    : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-700">
                {index + 1}
              </span>
              <span>{step.heading}</span>
            </li>
          )
        })}
        <li
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs sm:text-sm ${
            isReviewStep
              ? "border-emerald-400 bg-emerald-50 text-emerald-900"
              : "border-slate-200 bg-white text-slate-600"
          }`}
        >
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-700">
            6
          </span>
          <span>Review and Save</span>
        </li>
      </ol>

      {!isReviewStep && activeStep ? (
        <div className="space-y-5 px-4 py-5 sm:px-6">
          <header>
            <h2 className="text-lg font-semibold text-slate-900">{activeStep.heading}</h2>
            <p className="mt-1 text-sm text-slate-600">{activeStep.description}</p>
          </header>

          <div className="space-y-2">
            <label htmlFor={`field-${activeStep.id}`} className="text-sm font-medium text-slate-700">
              {activeStep.heading}
            </label>
            <input
              id={`field-${activeStep.id}`}
              ref={activeInputRef}
              value={fieldStateById[activeStep.id].value}
              onChange={(event) => {
                const nextValue = event.target.value
                applyFieldUpdate(activeStep.id, (fieldState) => ({
                  ...fieldState,
                  value: nextValue,
                  accepted: false,
                  error: "",
                  helper: "Review the value and press Accept."
                }))
              }}
              inputMode={activeStep.inputMode}
              autoComplete="off"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm outline-none ring-emerald-500 transition focus:ring-2"
              placeholder={activeStep.placeholder}
            />
          </div>

          <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  fieldStateById[activeStep.id].listening ? "animate-pulse bg-emerald-500" : "bg-slate-400"
                }`}
                aria-hidden
              />
              {fieldStateById[activeStep.id].listening ? "Listening..." : "Microphone idle"}
            </div>
            <button
              type="button"
              onClick={() =>
                fieldStateById[activeStep.id].listening
                  ? stopListening(activeStep.id)
                  : startListening(activeStep)
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              {fieldStateById[activeStep.id].listening ? "Stop Listening" : "Use Microphone"}
            </button>
          </div>

          <div className="space-y-2">
            <label htmlFor={`transcript-${activeStep.id}`} className="text-sm font-medium text-slate-700">
              Transcript Preview
            </label>
            <textarea
              id={`transcript-${activeStep.id}`}
              value={fieldStateById[activeStep.id].transcript}
              readOnly
              rows={2}
              placeholder="Transcript appears here after voice capture."
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700"
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => handleAccept(activeStep)}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={() => handleManualEdit(activeStep)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Edit manually
            </button>
            <button
              type="button"
              onClick={() => handleRerecord(activeStep)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Re-record
            </button>
          </div>

          <p className="text-sm text-slate-600">{fieldStateById[activeStep.id].helper}</p>
          {fieldStateById[activeStep.id].error ? (
            <p className="text-sm font-medium text-rose-700">{fieldStateById[activeStep.id].error}</p>
          ) : null}

          <footer className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => moveToStep(activeStepIndex - 1)}
              disabled={activeStepIndex === 0}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition enabled:hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => moveToStep(activeStepIndex + 1)}
              disabled={!fieldStateById[activeStep.id].accepted}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition enabled:hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue
            </button>
          </footer>
        </div>
      ) : (
        <div className="space-y-5 px-4 py-5 sm:px-6">
          <header>
            <h2 className="text-lg font-semibold text-slate-900">Review and Save</h2>
            <p className="mt-1 text-sm text-slate-600">
              Verify every field before saving. Jump back to edit any item if needed.
            </p>
          </header>

          <div className="space-y-3">
            {fieldSteps.map((step, index) => (
              <div key={step.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{step.heading}</p>
                <p className="mt-1 text-base text-slate-900">
                  {fieldStateById[step.id].value || <span className="text-slate-400">Not provided</span>}
                </p>
                <button
                  type="button"
                  onClick={() => moveToStep(index)}
                  className="mt-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  Edit this step
                </button>
              </div>
            ))}
          </div>

          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={reviewConfirmed}
              onChange={(event) => setReviewConfirmed(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600"
            />
            <span>I have reviewed all fields and confirm they are correct.</span>
          </label>

          {saveError ? <p className="text-sm font-medium text-rose-700">{saveError}</p> : null}
          {saveSuccess ? <p className="text-sm font-medium text-emerald-700">{saveSuccess}</p> : null}

          <footer className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => moveToStep(fieldSteps.length - 1)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!allFieldsAccepted || !reviewConfirmed || savePending}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition enabled:hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savePending ? "Saving..." : "Save Row"}
            </button>
          </footer>
        </div>
      )}
    </section>
  )
}
