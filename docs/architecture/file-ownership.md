# File Ownership Lanes

| Lane | Owns | Should Not Edit |
| --- | --- | --- |
| Platform Contracts | `src/contracts/**`, `docs/architecture/**`, `.env.example` | feature internals in `src/modules/*/adapters` |
| Records API | `src/app/api/v1/records/**`, future `src/server/repositories/**` | AI/speech/export adapter internals |
| Speech Integration | `src/modules/speech/**`, transcript route internals | Prisma schema unrelated to speech |
| AI Integration | `src/modules/ai/**`, summary route internals | record repository internals |
| Export Pipeline | `src/modules/export/**`, export route internals | speech and ai adapters |
| UI Surfaces | future `src/modules/*/components/**` | contracts and env contract unless coordinated |

This keeps merge conflicts low and responsibilities explicit.
