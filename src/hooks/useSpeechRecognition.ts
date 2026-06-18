"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type SpeechRecognitionAlternative = {
  transcript: string;
};

type SpeechRecognitionResult = {
  isFinal: boolean;
  0: SpeechRecognitionAlternative;
};

type SpeechRecognitionResultList = {
  length: number;
  [index: number]: SpeechRecognitionResult;
};

type SpeechRecognitionEvent = {
  resultIndex: number;
  results: SpeechRecognitionResultList;
};

type SpeechRecognitionErrorEvent = {
  error: string;
  message: string;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

type UseSpeechRecognitionOptions = {
  lang: string;
  onTranscript: (value: string) => void;
};

type MicrophonePermissionState = "unknown" | "granted" | "denied" | "prompt" | "unsupported";

const VOICE_CAPTURE_TIMEOUT_MS = 15000;
const VOICE_SILENCE_TIMEOUT_MS = 3000;

const mapSpeechRecognitionError = (
  event: SpeechRecognitionErrorEvent,
  lang: string
): string | null => {
  const code = event.error;

  switch (code) {
    case "aborted":
      return null;
    case "no-speech":
      return "No speech detected. Please try again.";
    case "audio-capture":
      return "No microphone input detected. Check your microphone device.";
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone permission is blocked. Allow microphone access and retry.";
    case "network":
      return "Speech recognition service is unavailable. Check your internet and retry.";
    case "language-not-supported":
      return `Speech recognition does not support ${lang}. Try a supported language.`;
    default:
      return "Speech recognition failed. Please try again.";
  }
};

const mapGetUserMediaError = (
  error: unknown
): { message: string; nextPermissionState?: MicrophonePermissionState } => {
  const errorName =
    typeof error === "object" && error !== null && "name" in error
      ? String((error as { name?: unknown }).name)
      : "";

  switch (errorName) {
    case "NotAllowedError":
      return {
        message: "Microphone permission is blocked. Allow microphone access in browser/site settings.",
        nextPermissionState: "denied"
      };
    case "NotFoundError":
      return {
        message: "No microphone device was found. Connect a mic and retry."
      };
    case "NotReadableError":
      return {
        message: "Microphone is busy or unavailable. Close other recording apps and retry."
      };
    case "SecurityError":
      return {
        message: "Browser security blocked microphone access on this page.",
        nextPermissionState: "denied"
      };
    case "AbortError":
      return {
        message: "Microphone request was interrupted. Please retry."
      };
    default:
      return {
        message: "Microphone access failed. Verify browser/site permissions and retry."
      };
  }
};

export const useSpeechRecognition = ({
  lang,
  onTranscript
}: UseSpeechRecognitionOptions) => {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const captureTimeoutRef = useRef<number | null>(null);
  const silenceTimeoutRef = useRef<number | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isMicrophoneSupported, setIsMicrophoneSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<MicrophonePermissionState>("unknown");

  const refreshPermissionState = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setPermissionState("unsupported");
      return;
    }

    if (!navigator.permissions?.query) {
      setPermissionState("unknown");
      return;
    }

    try {
      const status = await navigator.permissions.query({
        name: "microphone" as PermissionName
      });
      setPermissionState(status.state);
    } catch {
      setPermissionState("unknown");
    }
  }, []);

  const clearListeningTimers = useCallback(() => {
    if (captureTimeoutRef.current) {
      window.clearTimeout(captureTimeoutRef.current);
      captureTimeoutRef.current = null;
    }

    if (silenceTimeoutRef.current) {
      window.clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    setIsSupported(Boolean(Recognition));
    setIsMicrophoneSupported(Boolean(navigator.mediaDevices?.getUserMedia));
    void refreshPermissionState();

    const onFocus = () => {
      void refreshPermissionState();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    if (!Recognition) {
      return () => {
        window.removeEventListener("focus", onFocus);
        document.removeEventListener("visibilitychange", onFocus);
      };
    }

    const recognition = new Recognition();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setError(null);
      setIsListening(true);
      setPermissionState("granted");
    };

    recognition.onend = () => {
      clearListeningTimers();
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setPermissionState("denied");
      }
      const mapped = mapSpeechRecognitionError(event, lang);
      if (mapped) {
        setError(mapped);
      }
      clearListeningTimers();
      setIsListening(false);
    };

    recognition.onresult = (event) => {
      if (silenceTimeoutRef.current) {
        window.clearTimeout(silenceTimeoutRef.current);
      }

      silenceTimeoutRef.current = window.setTimeout(() => {
        recognitionRef.current?.stop();
      }, VOICE_SILENCE_TIMEOUT_MS);

      const parts: string[] = [];
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result?.isFinal && result[0]?.transcript) {
          parts.push(result[0].transcript);
        }
      }

      const transcript = parts.join(" ").trim();
      if (transcript) {
        onTranscript(transcript);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      clearListeningTimers();
      recognition.stop();
      recognitionRef.current = null;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [clearListeningTimers, lang, onTranscript, refreshPermissionState]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setPermissionState("unsupported");
      setError("Microphone API is unavailable in this browser.");
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setPermissionState("granted");
      setError(null);
      return true;
    } catch (error: unknown) {
      const mapped = mapGetUserMediaError(error);
      if (mapped.nextPermissionState) {
        setPermissionState(mapped.nextPermissionState);
      }
      setError(mapped.message);
      return false;
    } finally {
      void refreshPermissionState();
    }
  }, [refreshPermissionState]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || !isSupported) {
      setError(
        "Speech-to-text is not available in this browser. Open the app in Chrome or Edge and allow microphone access."
      );
      return;
    }

    if (permissionState === "denied") {
      setError("Microphone permission is blocked. Allow microphone access and retry.");
      return;
    }

    setError(null);
    recognitionRef.current.lang = lang;
    recognitionRef.current.continuous = true;
    try {
      recognitionRef.current.start();
      clearListeningTimers();
      captureTimeoutRef.current = window.setTimeout(() => {
        recognitionRef.current?.stop();
      }, VOICE_CAPTURE_TIMEOUT_MS);
    } catch {
      clearListeningTimers();
      setError("Could not start microphone. Verify mic permission and retry.");
      setIsListening(false);
    }
  }, [clearListeningTimers, isSupported, lang, permissionState]);

  const stopListening = useCallback(() => {
    clearListeningTimers();
    recognitionRef.current?.stop();
  }, [clearListeningTimers]);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return useMemo(
    () => ({
      isSupported,
      isMicrophoneSupported,
      isListening,
      permissionState,
      error,
      requestPermission,
      startListening,
      stopListening,
      resetError
    }),
    [
      error,
      isListening,
      isMicrophoneSupported,
      isSupported,
      permissionState,
      requestPermission,
      resetError,
      startListening,
      stopListening
    ]
  );
};
