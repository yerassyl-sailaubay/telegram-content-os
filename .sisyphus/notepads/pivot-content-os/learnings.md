# Learnings — Pivot Content OS

## 2026-03-04 Planning Phase

- Telegram client already has `sendMessage` and `sendPhoto` — only need `sendMediaGroup`, `sendPoll`, `sendDocument`
- `aiCallsCount` column exists in `usage_tracking` but is never incremented or enforced
- `schedules.crossPostId` is NOT NULL FK — needs nullable for generalization
- `platformEnum` = ["linkedin", "twitter"] — must NOT add "telegram"
- `content_library` is minimal (13 cols) — needs 5 new: sourceType, status, channelId, sourceUrl, sourceMetadata
- YouTube Data API v3 NOT viable for transcripts — use `youtube-transcript-plus`
- Article extraction: use `@extractus/article-extractor`
- Podcast transcription: deferred to V1.5
