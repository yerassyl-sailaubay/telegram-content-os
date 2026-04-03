# Teleflow Year in Review

**Status:** Backlog  
**Priority:** Later, when active user base justifies a shareable annual campaign  
**Owner:** Product + Engineering + Design + Marketing  
**Product brand:** Teleflow  
**Internal shorthand:** "Telegram Wrapped" style feature  
**Public naming:** avoid copying "Wrapped" directly; ship with original Teleflow branding

---

## 1. Why this should exist

This feature is first a **marketing artifact**, second an analytics surface.

If executed well, it should:

- give creators a beautiful, emotional summary of their year with their channel
- turn existing analytics into something naturally shareable
- make Teleflow feel like the system that was present for the creator's real journey
- create a strong seasonal campaign moment for retention, referrals, and brand recognition
- reward users for connecting early and staying connected

Core product truth:

- this is not about perfect historical reconstruction
- this is about celebrating the creator's tracked journey **inside Teleflow**
- if someone connected late, that is fine; the story becomes "since you joined Teleflow"

That framing is honest and strategically useful.

---

## 2. Product thesis

Teleflow Year in Review should feel like:

- a premium creator artifact
- a campaign-worthy brand moment
- a subtle proof that Teleflow is the operating system behind the scenes

It should **not** feel like:

- a generic analytics export
- a dashboard screenshot turned into slides
- a loud, needy promo disguised as user value

The balance to aim for:

- unmistakably Teleflow
- modest in self-promotion
- proud in craft
- generous toward the creator

The creator should feel:

- "this looks good enough to share"
- "this understands my work"
- "Teleflow has been tracking the signals that matter"

---

## 3. Brand direction

### Brand goal

The artifact should quietly but clearly say: **this came from Teleflow**.

### Branding principles

- Use Teleflow's own visual language, motion style, typography, and tone.
- Keep the creator and their channel as the hero; Teleflow is the signature, not the headline.
- Include clear but restrained brand presence on every card or screen.
- Prefer a refined "Presented by Teleflow" or "Tracked by Teleflow" treatment over a heavy watermark.
- Make the share assets feel premium enough that the brand benefit comes from quality, not volume.

### Creative direction

- Editorial, cinematic, data-rich
- Telegram-native, not generic B2B SaaS
- Confident color system with strong contrast and elegant restraint
- Motion should feel deliberate, not gimmicky
- Every card should have one memorable number, one short insight, and one line of emotional framing

### Naming direction

Working options:

- **Teleflow Year in Signals**
- **Your Year on Telegram, by Teleflow**
- **Teleflow Channel Recap**
- **Teleflow Annual Signal**

Recommendation:

- keep "Wrapped" as internal shorthand only
- ship an original public name that can become ownable

---

## 4. Experience shape

Recommended format:

- in-app recap experience
- downloadable share cards
- story-friendly vertical assets
- square and portrait export variants

Suggested flow:

1. Cover card  
   "Your year on Telegram"

2. Output card  
   posts published, publishing streak, active months

3. Reach card  
   total tracked views, average views, top-performing post

4. Growth card  
   subscriber growth since connection, strongest growth month

5. Momentum card  
   best posting day, best hour, most consistent publishing window

6. Love card  
   reaction highlight, most forwarded post, most shared format

7. Identity card  
   signature content pattern, strongest theme, recurring post style

8. Closing card  
   soft Teleflow signature + CTA to connect earlier next year / keep tracking

The recap should be story-like, not table-like.

---

## 5. Honest data policy

This feature should use only **tracked Teleflow data**.

### Core framing

- Default frame: **"Your year with Teleflow"**
- If needed: **"Since you connected Teleflow on <date>"**
- If the connected duration is under 365 days, do not fake a full-year framing

### Explicit non-goal

- No requirement to reconstruct old channel history before Teleflow connection
- No promise of full retrospective coverage for creators who connect late

### Strategic upside

This creates a natural product incentive:

- early connection = richer future recap
- always-on connection = better story next season

---

## 6. Metrics we can eventually support

### Strong candidates

- total posts published
- total tracked views
- average views per post
- top-performing post by views
- most forwarded post
- best publishing day
- best publishing hour
- subscriber growth since tracked connection
- best month by growth
- longest publishing streak
- total active publishing days

### Nice-to-have candidates

- total reactions
- favorite reaction pattern
- best-performing format type
- strongest recurring topic
- best hook style or opening pattern
- "your audience showed up most when..."

### Metrics to avoid unless fully supported

- unique readers
- exact number of people who "loved" posts without reliable reaction tracking
- causal claims like "this post brought X subscribers"
- anything implying retroactive full-history coverage before Teleflow connection

---

## 7. Technical foundation needed before build

### Data collection

- Continue storing all incoming channel posts with view and forward counts.
- Add webhook support for `message_reaction_count` and, where useful, `message_reaction`.
- Consider `chat_member` updates only if channel member changes become reliably useful for growth storytelling.
- Keep daily subscriber snapshots for every connected channel.
- Add yearly aggregation jobs so recap generation is cheap and deterministic.

### Storage and aggregation

- Persist reaction deltas in a form that can be summarized per post and per year.
- Store daily or periodic channel snapshot rows explicitly for recap-ready reporting.
- Create a recap summary model so export generation does not depend on live heavy queries.

### Generation pipeline

- Build a recap compiler that turns tracked metrics into a narrative payload.
- Build card templates from a fixed design system so every recap looks premium and on-brand.
- Support localized copy in RU and EN.
- Support image export first; video or animated export later.

### Delivery

- In-app preview
- downloadable images
- one-tap "share to Telegram / stories" friendly asset set
- optional public share page later if privacy controls are strong

---

## 8. Narrative system

The feature should not just report numbers. It should translate them into creator identity.

Examples of recap language:

- "You did not post often. You posted with precision."
- "Wednesday evening kept winning for you."
- "One post carried the year."
- "Your audience responded strongest when your writing got sharper and more direct."
- "Teleflow tracked the signals. You made the work."

Copy style:

- short
- confident
- elegant
- emotionally warm
- never corny
- never hype-heavy

The brand voice should feel more like a premium editorial product than a noisy SaaS campaign.

---

## 9. Visual and branding requirements

This is a brand moment, so design quality matters as much as metric accuracy.

Requirements:

- Do not reuse standard dashboard UI as the recap format.
- Do not make it look like a generic BI report.
- Build a dedicated visual system for the recap campaign.
- Use strong typography and motion with restraint.
- Ensure every exported frame feels polished enough to be shared without embarrassment.
- Teleflow branding should be present in a tasteful, persistent way:
  - logo or wordmark lockup
  - signature accent palette
  - closing brand line
  - subtle footer treatment on share assets

Success means:

- people recognize Teleflow immediately
- people do not feel they are posting an ad

---

## 10. Rollout strategy

### Phase 0: Backlog and instrumentation

- tighten analytics truth
- add reaction tracking support
- improve snapshot quality
- define recap-ready aggregates

### Phase 1: Internal prototype

- generate recap JSON for one channel
- render static internal cards
- validate which metrics actually feel exciting

### Phase 2: MVP

- in-app recap for eligible users
- image export
- "since you connected Teleflow" framing
- no public share page yet

### Phase 3: Campaign version

- polished motion
- vertical share stories
- localized seasonal launch copy
- referral or invite layer if it can stay tasteful

### Phase 4: Signature annual launch

- recurring yearly release window
- campaign kit for social shares
- polished landing/support page for the recap campaign

---

## 11. Gating criteria before prioritizing

Do not build this early just because the idea is good.

Start when most of these are true:

- we have a meaningful base of active connected channels
- enough channels have at least 90-180 days of tracked history
- analytics data is clean enough to trust publicly
- the Teleflow brand is ready to benefit from a viral share moment
- design bandwidth is available for a premium campaign-quality execution

This should be treated as a **multiplier feature**, not a core survival feature.

---

## 12. Success metrics

Primary:

- recap open rate
- export rate
- share rate
- invite/referral lift from recap period
- retention lift among users who viewed recap

Secondary:

- branded organic impressions from shares
- reactivation of dormant creators during campaign window
- increase in new channel connections before next campaign cycle

Brand quality signals:

- users share without removing branding
- screenshots still look clearly like Teleflow
- feedback describes the recap as "beautiful", "accurate", or "surprisingly good"

---

## 13. Risks

### Product risk

- weak data makes the experience feel fake
- generic design makes the campaign forgettable
- over-branding makes the artifact feel like an ad

### Messaging risk

- overclaiming historical completeness
- using emotional copy unsupported by actual metrics
- implying subscriber attribution precision we do not have

### Timing risk

- building this before enough users exist to generate organic sharing

---

## 14. Backlog decision

This should remain a **future brand-and-growth initiative** until Teleflow has enough connected, active channels for the feature to produce real social proof.

When it is time, the correct bar is not:

- "can we technically render some stats?"

The correct bar is:

- "can we ship something creators are proud to share and that makes Teleflow feel like a serious, elegant product?"

That is the standard this feature should meet.
