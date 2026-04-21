import type {
  SpeechRecognitionService,
  SpeechTranscriptionInput,
  SpeechTranscriptionResult
} from "@/contracts/services/speech-recognition.service";

export class StubSpeechRecognitionService implements SpeechRecognitionService {
  public readonly providerName = "stub";

  async transcribe(input: SpeechTranscriptionInput): Promise<SpeechTranscriptionResult> {
    void input;
    throw new Error("StubSpeechRecognitionService.transcribe is not implemented yet.");
  }
}
