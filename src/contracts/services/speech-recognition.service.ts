export interface SpeechTranscriptionInput {
  audioUrl: string;
  languageCode?: string;
}

export interface SpeechTranscriptionResult {
  text: string;
  confidence?: number;
}

export interface SpeechRecognitionService {
  readonly providerName: string;
  transcribe(input: SpeechTranscriptionInput): Promise<SpeechTranscriptionResult>;
}
