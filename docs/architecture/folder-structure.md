# Folder Structure

```text
.
|- prisma/
|  |- schema.prisma
|- src/
|  |- app/
|  |  |- api/v1/
|  |  |  |- health/
|  |  |  |- records/
|  |  |  |  |- [recordId]/
|  |  |  |  |  |- transcript/
|  |  |  |  |  |- summary/
|  |  |  |- exports/
|  |  |- globals.css
|  |  |- layout.tsx
|  |  |- page.tsx
|  |- config/
|  |  |- env.ts
|  |- contracts/
|  |  |- api/
|  |  |- domain/
|  |  |- dto/
|  |  |- env/
|  |  |- services/
|  |  |- index.ts
|  |- modules/
|  |  |- records/
|  |  |- speech/
|  |  |- ai/
|  |  |- export/
|  |- server/
|  |  |- db/
|- docs/
|  |- architecture/
|- .env.example
|- package.json
```

## Why this shape

- `src/contracts` is the stable source of truth shared by API, UI, and integration workers.
- `src/modules/*` gives each domain lane an isolated implementation space.
- `src/app/api/v1/*` reserves route ownership with minimal placeholder handlers.
- `src/server/*` holds infrastructure concerns (Prisma and future repositories).
