# APP ROUTER KNOWLEDGE BASE

## OVERVIEW

`src/app` owns App Router segments, locale/layout nesting, route groups, and page-level loading/error boundaries. Keep routes server-first; move interactive logic into sibling `client.tsx` files.

## STRUCTURE

```
app/
├── layout.tsx                    # Root passthrough; real HTML shell lives under [locale]/layout.tsx
├── page.tsx                      # Fallback redirect to default locale
├── [locale]/
│   ├── layout.tsx                # Fonts, providers, analytics, `<html>` / `<body>`
│   ├── page.tsx                  # Localized marketing landing
│   ├── (auth)/                   # Public login/signup/callback shell
│   └── (dashboard)/              # Auth-gated product shell
│       ├── dashboard/            # Canonical product surfaces
│       └── {media,posts,schedule}/ # Compatibility routes outside dashboard/
└── api/                          # Route handlers; see src/app/api/AGENTS.md
```

## WHERE TO LOOK

| Task                              | Location                                                    | Notes                                                 |
| --------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------- |
| Add locale landing or public page | `src/app/[locale]/.../page.tsx`                             | Call `setRequestLocale(locale)` in locale-bound pages |
| Add auth page                     | `src/app/[locale]/(auth)/...`                               | Uses centered auth shell                              |
| Add dashboard feature page        | `src/app/[locale]/(dashboard)/dashboard/{feature}/page.tsx` | Canonical product surface                             |
| Add loading or error boundary     | Segment-local `loading.tsx` / `error.tsx`                   | Colocate with the route it serves                     |
| Adjust app providers or fonts     | `src/app/[locale]/layout.tsx`                               | Owns `<html>`, fonts, `ThemeProvider`, `Toaster`      |
| Adjust auth gating shell          | `src/app/[locale]/(dashboard)/layout.tsx`                   | Reads Supabase user and wraps `Shell`                 |
| Adjust auth callback bootstrap    | `src/app/[locale]/(auth)/auth/callback/route.ts`            | Exchanges Supabase code and ensures local user exists |
| Adjust root locale redirect       | `src/app/page.tsx`                                          | Fallback redirect to `routing.defaultLocale`          |

## CONVENTIONS

- `src/app/layout.tsx` is passthrough only; the real document shell lives in `src/app/[locale]/layout.tsx`.
- Route props are Promise-shaped here; await `params` and `searchParams` in server components.
- Call `setRequestLocale(locale)` in locale-aware layouts/pages.
- Use `@/i18n/navigation` for locale-aware links/router helpers instead of raw `next/link`.
- Keep `page.tsx` and `layout.tsx` server components unless hooks/browser APIs force a sibling `client.tsx`.
- Colocate route helpers like `schedule-mapper.ts`, `loading.tsx`, `error.tsx`, and `__tests__/` beside the segment they support.
- Treat `src/app/[locale]/(dashboard)/dashboard/*` as canonical product routes; top-level `(dashboard)/media|posts|schedule` are compatibility routes.

## ANTI-PATTERNS

- Do NOT add API handlers under `[locale]`; route handlers belong in `src/app/api` unless they are locale-scoped auth callbacks already following existing patterns.
- Do NOT use `next/link` for app-internal localized navigation.
- Do NOT move auth checks out of middleware + `(dashboard)/layout.tsx` without tracing both redirect paths.
- Do NOT push heavy interactive state into `page.tsx` when a sibling `client.tsx` keeps the route server-first.
