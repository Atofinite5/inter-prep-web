# inter-prep-web

Next.js frontend for the Interview Prep Kit. Talks to `inter-prep-api` over HTTP
only — no shared code. Types are intentionally duplicated (`lib/types` here,
`src/core/types` there); if the API shape changes, update both.

## Setup

```bash
npm install
cp .env.example .env.local   # point at your API
npm run dev                  # Next.js on :3000
```

## Environment (`.env.local`)

| Key | Purpose |
|-----|---------|
| `NEXT_PUBLIC_API_URL` | Backend base URL, e.g. `http://localhost:5001/api` |

The backend must list this app's origin in its `CLIENT_URL` for CORS.

## Pages

| Route | What |
|-------|------|
| `/` | Landing + sign in / register |
| `/dashboard` | Prep-kit list, create (single + batch) |
| `/kit/[id]` | Builder: questions, brief, requirements, schedule, flashcards |
| `/kit/[id]/practice` | Flashcard practice with confidence ratings |
