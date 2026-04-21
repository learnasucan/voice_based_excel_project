# Service Boundaries

## RecordService

- Owns CRUD orchestration for `RecordDto`.
- Delegates transcript generation to `SpeechRecognitionService`.
- Delegates summary generation to `AIService`.
- Must not know provider internals.

## SpeechRecognitionService

- Input: `audioUrl`, optional `languageCode`.
- Output: normalized `SpeechTranscriptionResult`.
- Adapter examples: browser Web Speech API, OpenAI Whisper, stub.

## AIService

- Input: transcript text and summary style.
- Output: normalized summary text.
- Adapter examples: OpenAI, local model, stub.

## ExportService

- Owns export job lifecycle and retrieval.
- Accepts only DTO/contracts, not UI components.
- Export format internals stay in export worker lane.

## Hard boundary rules

- No module may import from another module's internal files.
- Cross-module coupling happens through `src/contracts` only.
- Prisma schema changes must be reflected in DTO/domain contracts in the same PR.
