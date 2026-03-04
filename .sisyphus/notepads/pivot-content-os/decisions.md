# Decisions — Pivot Content OS

## 2026-03-04 Planning Phase

- Schedule decoupling: Generalize schedules table (make crossPostId nullable, add contentLibraryId FK + targetType enum)
- Plan scope: Full pivot — all 8 items in ONE plan
- Test strategy: TDD — tests first (RED→GREEN→REFACTOR)
- Podcast: Deferred to V1.5
- Telegram is primary platform, NOT a cross-post target — no "telegram" in platformEnum
