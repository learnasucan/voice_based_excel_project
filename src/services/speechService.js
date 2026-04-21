const BrowserSpeechRecognition =
  globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;

const MOCK_TRANSCRIPTS = {
  nameMarathi: "गणेश पाटील",
  nameEnglish: "Ganesh Patil",
  contributionAmount: "500",
  placeMarathi: "पुणे",
  placeEnglish: "Pune",
};

function normalizeSpeechError(errorCode) {
  switch (errorCode) {
    case "not-allowed":
      return "Microphone permission denied.";
    case "audio-capture":
      return "No microphone input detected.";
    case "network":
      return "Speech service network error.";
    case "aborted":
      return "Recording stopped.";
    default:
      return "Speech recognition failed.";
  }
}

class BrowserSpeechRecognitionService {
  constructor() {
    this.recognition = null;
    this.handlers = null;
  }

  getMode() {
    return "browser";
  }

  isAvailable() {
    return Boolean(BrowserSpeechRecognition);
  }

  startListening({ fieldId, language, onResult, onStateChange, onError }) {
    if (!BrowserSpeechRecognition) {
      throw new Error("Speech recognition is not supported in this browser.");
    }

    this.stopListening();

    const recognition = new BrowserSpeechRecognition();
    this.recognition = recognition;
    this.handlers = { fieldId, onResult, onStateChange, onError };

    recognition.lang = language || "en-IN";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      this.handlers?.onStateChange?.("listening");
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .join(" ")
        .trim();

      if (transcript) {
        this.handlers?.onResult?.(transcript, true);
      }
    };

    recognition.onerror = (event) => {
      this.handlers?.onError?.(normalizeSpeechError(event.error));
    };

    recognition.onend = () => {
      this.handlers?.onStateChange?.("ended");
      this.recognition = null;
      this.handlers = null;
    };

    recognition.start();
  }

  stopListening() {
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
    }
    if (this.handlers) {
      this.handlers.onStateChange?.("ended");
      this.handlers = null;
    }
  }
}

class MockSpeechRecognitionService {
  constructor() {
    this.pending = null;
    this.handlers = null;
  }

  getMode() {
    return "mock";
  }

  isAvailable() {
    return true;
  }

  startListening({ fieldId, onResult, onStateChange }) {
    this.stopListening();
    this.handlers = { onStateChange };
    onStateChange?.("listening");

    this.pending = globalThis.setTimeout(() => {
      const transcript = MOCK_TRANSCRIPTS[fieldId] || "";
      if (transcript) {
        onResult?.(transcript, true);
      }
      this.handlers?.onStateChange?.("ended");
      this.handlers = null;
      this.pending = null;
    }, 900);
  }

  stopListening() {
    if (this.pending) {
      globalThis.clearTimeout(this.pending);
      this.pending = null;
    }
    this.handlers?.onStateChange?.("ended");
    this.handlers = null;
  }
}

export function createSpeechRecognitionService() {
  const injectedService = globalThis.WorkerCAdapters?.speechRecognitionService;
  if (
    injectedService &&
    typeof injectedService.startListening === "function" &&
    typeof injectedService.stopListening === "function"
  ) {
    return injectedService;
  }

  if (BrowserSpeechRecognition) {
    return new BrowserSpeechRecognitionService();
  }

  return new MockSpeechRecognitionService();
}
