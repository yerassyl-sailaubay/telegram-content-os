# LANDING PROJECT KNOWLEDGE BASE

**Generated:** 2026-03-20

## OVERVIEW

Separate Vite + React landing page project built with AI Studio. This is NOT the production landing (which lives in `src/components/marketing/` of the main Next.js app), but a standalone experimental/backup landing page.

Core stack: Vite + React + TypeScript + Google Gemini API

## STRUCTURE

```
telegram-content-os-landing/
├── src/
│   ├── App.tsx           # Main application component
│   ├── main.tsx          # Vite entry point
│   └── ...components/
├── index.html            # HTML entry
├── vite.config.ts        # Vite configuration
├── tsconfig.json         # TypeScript config
└── package.json          # npm dependencies (NOT Bun)
```

## CONVENTIONS

- **Package Manager**: npm (not Bun like main project)
- **Dev Server**: `npm run dev` (Vite dev server)
- **Build**: `npm run build` (Vite production build)
- **AI Integration**: Google Gemini API via `GEMINI_API_KEY` env var
- **Port**: Vite default (5173)

## ANTI-PATTERNS

- Do NOT confuse this with the production landing in `src/components/marketing/`
- Do NOT use Bun commands here (use npm)
- Do NOT import from main Next.js app (completely separate)

## NOTES

- Created via AI Studio: https://ai.studio/apps/8cb6282e-3186-4175-84dc-7fabdc5976ac
- Excluded from root `tsconfig.json` (in `exclude` array)
- Minimal project structure - single-page landing
