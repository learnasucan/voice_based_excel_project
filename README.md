# Voice Structured Entry MVP (Marathi + English)

Production-ready MVP for field-by-field voice-assisted structured data entry.

## Stack

- Next.js + TypeScript + Tailwind
- Prisma + SQLite
- Zod validation
- Browser SpeechRecognition abstraction
- AI processing adapter (OpenAI + deterministic fallback)
- Export: CSV, XLSX, PDF

## Quick Start

1. Install dependencies:
   - `pnpm install`
2. Configure environment:
   - `cp .env.example .env`
3. Generate Prisma client and migrate:
   - `pnpm prisma:generate`
   - `pnpm prisma:migrate --name init`
4. Start app:
   - `pnpm dev`

## Scripts

- `pnpm dev` - run local app
- `pnpm build` - production build
- `pnpm lint` - lint checks
- `pnpm typecheck` - TypeScript checks
- `pnpm test` - Vitest suite

## Core Features

- Step-by-step field voice capture with explicit validation actions:
  - Accept
  - Edit manually
  - Re-record
- AI-assisted cleanup/transliteration/amount normalization
- Duplicate guard on `(nameMrKey, contributionAmount, placeMrKey)`
- Add/Edit/Delete rows
- Search/filter and totals
- Export to CSV/XLSX/PDF

## API Surface

- `GET /api/records?search=`
- `POST /api/records`
- `PUT /api/records/:id`
- `DELETE /api/records/:id`
- `GET /api/records/summary`
- `POST /api/records/check-duplicate`
- `GET /api/rows?search=`
- `POST /api/rows`
- `PATCH /api/rows/:id`
- `DELETE /api/rows/:id`
- `POST /api/rows/duplicate-check`
- `POST /api/ai/process-field`
- `GET /api/export?format=csv|xlsx|pdf&search=`
