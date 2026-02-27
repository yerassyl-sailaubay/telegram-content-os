# Telegram Content OS

AI-powered content management and distribution system for Telegram creators.

## Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Package Manager**: Bun
- **Database**: Supabase (Postgres)
- **Background Jobs**: Inngest
- **Payments**: Stripe
- **AI**: OpenRouter

## Setup

### 1. Clone and install dependencies

```bash
bun install
```

### 2. Configure environment variables

```bash
cp .env.local.example .env.local
# Fill in all values in .env.local
```

### 3. Run the development server

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

| Command         | Description                              |
|-----------------|------------------------------------------|
| `bun dev`       | Start development server on port 3000    |
| `bun build`     | Build production bundle                  |
| `bun start`     | Start production server                  |
| `bun lint`      | Run ESLint                               |
| `bun format`    | Format code with Prettier                |
| `bun test`      | Run unit tests (Jest/Vitest)             |
| `bun test:e2e`  | Run end-to-end tests (Playwright)        |

## Project Structure

```
src/
├── app/              # Next.js App Router pages & API routes
│   └── api/
│       └── health/   # Health check endpoint → GET /api/health
├── components/       # Shared React components
│   └── ui/           # shadcn/ui components
├── lib/              # Utility functions and helpers
├── server/           # Server-side logic (actions, db, etc.)
└── types/            # Shared TypeScript type definitions
```

## Health Check

```bash
curl http://localhost:3000/api/health
# → {"status":"ok"}
```
