import type { CreateRowInput, VoiceCaptureFieldName } from "@/lib/contracts/row"
import type { ApiEnvelope } from "@/lib/contracts/api"

type LiveSpeechCaptureEvent = {
  fieldId: VoiceCaptureFieldName
  languageCode: string
  onResult: (transcript: string) => void
  onStateChange: (isListening: boolean) => void
  onError: (message: string) => void
}

export interface LiveSpeechCaptureService {
  readonly mode: "browser" | "mock" | "custom"
  startListening(input: LiveSpeechCaptureEvent): void
  stopListening(): void
}

export interface SaveRowResult {
  id: string
  source: "api" | "mock" | "custom"
}

export interface SaveRowService {
  readonly mode: "api" | "mock" | "fallback" | "custom"
  save(input: CreateRowInput): Promise<SaveRowResult>
}

type BrowserRecognition = {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives: number
  onstart: (() => void) | null
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript?: string }>> }) => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type BrowserRecognitionConstructor = new () => BrowserRecognition

const recognitionConstructor: BrowserRecognitionConstructor | null =
  (globalThis as {
    SpeechRecognition?: BrowserRecognitionConstructor
    webkitSpeechRecognition?: BrowserRecognitionConstructor
  }).SpeechRecognition ??
  (globalThis as {
    SpeechRecognition?: BrowserRecognitionConstructor
    webkitSpeechRecognition?: BrowserRecognitionConstructor
  }).webkitSpeechRecognition ??
  null

const mockTranscripts: Record<VoiceCaptureFieldName, string> = {
  nameMr: "राम पाटील",
  nameEn: "Ram Patil",
  contributionAmount: "1500",
  placeMr: "पुणे",
  placeEn: "Pune"
}

function mapSpeechError(errorCode?: string): string {
  if (!errorCode) {
    return "Voice capture failed."
  }

  switch (errorCode) {
    case "not-allowed":
      return "Microphone permission was denied."
    case "audio-capture":
      return "No microphone input detected."
    case "network":
      return "Network issue while capturing speech."
    case "aborted":
      return "Recording was stopped."
    default:
      return "Voice capture failed."
  }
}

class BrowserLiveSpeechCaptureService implements LiveSpeechCaptureService {
  public readonly mode = "browser" as const
  private recognition: BrowserRecognition | null = null
  private activeInput: LiveSpeechCaptureEvent | null = null

  startListening(input: LiveSpeechCaptureEvent): void {
    if (!recognitionConstructor) {
      throw new Error("Browser speech recognition is unavailable.")
    }

    this.stopListening()
    this.activeInput = input

    const recognition = new recognitionConstructor()
    recognition.lang = input.languageCode
    recognition.interimResults = false
    recognition.continuous = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      this.activeInput?.onStateChange(true)
    }

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result?.[0]?.transcript ?? "")
        .join(" ")
        .trim()

      if (transcript) {
        this.activeInput?.onResult(transcript)
      }
    }

    recognition.onerror = (event) => {
      this.activeInput?.onError(mapSpeechError(event.error))
    }

    recognition.onend = () => {
      this.activeInput?.onStateChange(false)
      this.recognition = null
      this.activeInput = null
    }

    this.recognition = recognition
    recognition.start()
  }

  stopListening(): void {
    if (this.recognition) {
      this.recognition.stop()
      this.recognition = null
    }

    if (this.activeInput) {
      this.activeInput.onStateChange(false)
      this.activeInput = null
    }
  }
}

class MockLiveSpeechCaptureService implements LiveSpeechCaptureService {
  public readonly mode = "mock" as const
  private timeoutId: ReturnType<typeof setTimeout> | null = null
  private activeInput: LiveSpeechCaptureEvent | null = null

  startListening(input: LiveSpeechCaptureEvent): void {
    this.stopListening()
    this.activeInput = input
    input.onStateChange(true)

    this.timeoutId = setTimeout(() => {
      const transcript = mockTranscripts[input.fieldId] ?? ""
      if (transcript) {
        input.onResult(transcript)
      }
      input.onStateChange(false)
      this.activeInput = null
      this.timeoutId = null
    }, 900)
  }

  stopListening(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
    this.activeInput?.onStateChange(false)
    this.activeInput = null
  }
}

class ApiSaveRowService implements SaveRowService {
  public readonly mode = "api" as const

  async save(input: CreateRowInput): Promise<SaveRowResult> {
    const response = await fetch("/api/v1/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nameMr: input.nameMr,
        nameEn: input.nameEn,
        contributionAmount: input.contributionAmount,
        placeMr: input.placeMr,
        placeEn: input.placeEn
      })
    })

    if (!response.ok) {
      let message = `Save API unavailable (${response.status}).`
      try {
        const payload = (await response.json()) as ApiEnvelope<unknown>
        if (payload.success === false) {
          message = payload.error.message
        }
      } catch {
        // Ignore non-json error payloads.
      }
      throw new Error(message)
    }

    const payload = (await response.json()) as ApiEnvelope<{ id?: number | string }>
    if (payload.success === false) {
      throw new Error(payload.error.message)
    }

    const recordId = payload.data?.id
    return {
      id: recordId ? String(recordId) : `api-${Date.now()}`,
      source: "api"
    }
  }
}

type WorkerCAdapters = {
  liveSpeechCaptureService?: LiveSpeechCaptureService
  saveRowService?: SaveRowService
}

function getInjectedAdapters(): WorkerCAdapters | undefined {
  return (globalThis as { WorkerCAdapters?: WorkerCAdapters }).WorkerCAdapters
}

export function createLiveSpeechCaptureService(): LiveSpeechCaptureService {
  const injectedService = getInjectedAdapters()?.liveSpeechCaptureService
  if (injectedService) {
    return { ...injectedService, mode: "custom" }
  }

  if (recognitionConstructor) {
    return new BrowserLiveSpeechCaptureService()
  }

  return new MockLiveSpeechCaptureService()
}

export function createSaveRowService(): SaveRowService {
  const injectedService = getInjectedAdapters()?.saveRowService
  if (injectedService) {
    return { ...injectedService, mode: "custom" }
  }

  // Avoid silent "saved" states when API persistence fails.
  return new ApiSaveRowService()
}
