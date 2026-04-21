# Naming Conventions

## General

- Use `PascalCase` for interfaces/types/classes: `RecordDto`, `SpeechRecognitionService`.
- Use `camelCase` for variables/functions: `apiRouteMap`, `loadEnv`.
- Use `kebab-case` for file names: `record.service.ts`, `route-map.ts`.
- Name DTOs with `RequestDto`, `ResponseDto`, or resource `Dto` suffix.

## Route naming

- URL paths use plural resources: `/api/v1/records`.
- Dynamic path params use `:recordId` in contract docs and `[recordId]` in Next route folders.
- Route handler ownership maps to module lane names in stub responses.

## Service naming

- Contract interfaces are nouns with `Service` suffix.
- Implementation adapters are prefixed by provider: `StubAIService`, `StubSpeechRecognitionService`.

## Environment naming

- Upper snake case for env vars.
- Prefix only client-exposed variables with `NEXT_PUBLIC_`.

## Contract import naming

- Canonical shared record contract path is `src/contracts/domain/record.ts`.
- Canonical DTO path is `src/contracts/dto/record.dto.ts`.
- New MVP modules should import from `src/contracts/index.ts` or these canonical paths.
- Avoid using legacy contract files outside this scaffold lane unless explicitly migrating them.
