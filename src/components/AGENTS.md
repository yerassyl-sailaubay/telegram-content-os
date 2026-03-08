# COMPONENTS KNOWLEDGE BASE

## OVERVIEW

`src/components` contains feature UI for dashboard, landing, admin, creation flows, and reusable primitives.

## STRUCTURE

```
components/
├── admin/            # Admin console UI
├── analytics/        # Charts, KPI cards, tables, comparison views
├── billing/          # Usage meter, pricing/upgrade surfaces
├── calendar/         # Gap detection cards and scheduling suggestions
├── channels/         # Channel list/settings/connect/profile
├── content/          # Content library, filters, quick capture, repurpose modal
├── create/           # URL input + source ingestion UX
├── dashboard/        # Dashboard widgets (welcome, stats, activity, upcoming)
├── landing/          # Placeholder directory (currently empty)
├── layout/           # Shell, sidebar, headers
├── marketing/        # Production landing page component
├── media/            # Media grid/upload/cards
├── posts/            # Post empty states and supporting UI
├── preview/          # LinkedIn/Twitter preview cards
├── publish/          # Telegram publish form
├── schedule/         # Calendar + recurring + schedule dialog
├── settings/         # Profile, connections, AI prefs, billing tabs
├── telegram-post/    # Telegram post composer
├── ui/               # shadcn/ui primitives
├── welcome/          # Welcome template editor
├── language-switcher.tsx
├── media-picker.tsx
├── theme-provider.tsx
└── theme-toggle.tsx
```

## WHERE TO LOOK

| Task                             | Location                                                   |
| -------------------------------- | ---------------------------------------------------------- |
| Add admin UI                     | `src/components/admin/`                                    |
| Add landing section              | `src/components/marketing/`                                |
| Add content library UI           | `src/components/content/`                                  |
| Add source-ingestion UI          | `src/components/create/`                                   |
| Add analytics visualizations     | `src/components/analytics/`                                |
| Add telegram publish/composer UX | `src/components/publish/`, `src/components/telegram-post/` |
| Add dashboard widget             | `src/components/dashboard/`                                |
| Add reusable primitive           | `src/components/ui/` via shadcn CLI                        |

## CONVENTIONS

- Keep feature components inside their feature directory (avoid generic catch-all folders).
- Use `cn()` from `@/lib/utils` for class composition.
- Use CVA when variant complexity warrants it.
- Keep tests in colocated `__tests__/` folders with `*.test.tsx` naming.
- Add `"use client"` to components using hooks/browser APIs.
- Keep testability hooks (`data-testid`) for interactive/complex components.

## ANTI-PATTERNS

- Do NOT hand-edit shadcn-managed primitives in `components/ui` if they should stay CLI-syncable.
- Do NOT couple unrelated feature folders directly; lift reusable pieces appropriately.
- Do NOT hardcode locale/user-facing copy in components; use translations.

## NOTES

- `content/`, `schedule/`, and `channels/` are the densest feature folders; prefer focused edits and add tests when expanding them.
- `marketing/landing-page.tsx`, `telegram-post/telegram-post-composer.tsx`, and `admin/admin-console.tsx` are large files; extend carefully before adding more surface area.
