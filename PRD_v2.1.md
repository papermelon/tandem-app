# Tandem — Caregiver Coordination Platform
## Product Roadmap: v1 (Built) → v2 (In Progress)

**Status:** Draft for engineering review
**Author:** Product
**Last updated:** 2026-05-09
**Target release:** v2.0 (rolling, behind feature flag)
**Builds on:** Tandem MVP (v1.x) — see [README.md](README.md)

---

## 0. Product Vision

**Tandem** is a digital coordination platform that connects primary and secondary caregivers to manage care for elderly family members or patients. By automating task routing, generating real-time care signals, and providing a conversational co-pilot, Tandem shifts the burden of coordination away from a single caregiver onto the entire care circle.

### The Problem We Solve

Caregiving is fragmented and creates an invisible burden:

1. **Fragmented coordination** — Information lives across Telegram, WhatsApp, phone calls, and scattered notes. A missed message means a missed medication or appointment.
2. **The "only one who notices" trap** — The primary caregiver becomes the de facto orchestrator: triaging what's urgent, assigning work, chasing follow-ups. They see 100% of care decisions but get burned out doing 70% of the execution.
3. **Secondary caregivers feel passive** — Siblings and helpers want to help but don't know what's actually needed right now. They either over-engage (asking for updates constantly) or disengage entirely.
4. **Care gaps are invisible until they happen** — Missed meds, skipped appointments, and silent deterioration only surface when a crisis hits.

### How Tandem Fixes It

**v1 (Live): Capture + Shared Inbox**
- Unify fragmented notes from Telegram, voice, documents into a single timeline
- Extract actionable tasks and assign them to family members
- Let caregivers claim work and track completion
- Generate "what you missed" briefings on demand
- ✅ Solves: capture friction, shared context, manual handovers

**v2 (Now): Add a Coordination Agent**
- **Smart routing**: AI proposes assignees based on workload, history, preferences — lead caregiver approves instead of dispatching
- **Proactive signals**: Hourly cron job detects stale work, missed medications, and sentiment dips. Pushes nudges to the right person via Telegram.
- **Conversational queries**: "What did mum's cardiologist say?" answered with citations in <3s
- **Closed-loop workflows**: After approving a task, one-tap follow-ups (schedule reminder, notify sibling, recurring check-in)
- ✅ Solves: coordination friction, secondary caregiver engagement, data-driven decisions

**v2.1+ (Future): Autonomous Workflows**
- Calendar integration (block Sarah's Tuesday, auto-suggest coverage)
- Multi-recipient circles (one family caring for two parents)
- Agent write actions (schedule appointments, auto-reply confirmations)
- EHR integrations (pull summaries from provider portals)

### Key User Journeys

| Persona | v1 Job | v1 Outcome | v2 Job | v2 Outcome |
| --- | --- | --- | --- | --- |
| **Lead caregiver (Sarah)** | Manually dispatch tasks to siblings | Everyone has work, but Sarah did the thinking | Stop being the routing bottleneck | Co-Pilot proposes assignments; Sarah approves rather than dispatches |
| **Distant sibling (Tom)** | Ask Sarah what to do, scroll timeline | Unsure if he's helping or just noise | Know exactly what's mine | Daily Telegram digest "3 things are yours today"; one-tap claim/done |
| **Backup caregiver (Priya)** | Wait for Sarah to ask for help | Feels passive, disengaged | Pick up slack opportunistically | Nudge: "Sarah's load at 90% this week, want to take Tuesday's transport?" |
| **Care recipient (Mum)** | Forward notes and hope someone notices | Anxiety about whether things got done | Forward a card, be done | Confirmation reply: "Dr visited ✓ Sarah assigned, due Friday" |

### Key User Journeys

| Persona | v1 Job | v1 Outcome | v2 Job | v2 Outcome |
| --- | --- | --- | --- | --- |
| **Lead caregiver (Sarah)** | Manually dispatch tasks to siblings | Everyone has work, but Sarah did the thinking | Stop being the routing bottleneck | Co-Pilot proposes assignments; Sarah approves rather than dispatches |
| **Distant sibling (Tom)** | Ask Sarah what to do, scroll timeline | Unsure if he's helping or just noise | Know exactly what's mine | Daily Telegram digest "3 things are yours today"; one-tap claim/done |
| **Backup caregiver (Priya)** | Wait for Sarah to ask for help | Feels passive, disengaged | Pick up slack opportunistically | Nudge: "Sarah's load at 90% this week, want to take Tuesday's transport?" |
| **Care recipient (Mum)** | Forward notes and hope someone notices | Anxiety about whether things got done | Forward a card, be done | Confirmation reply: "Dr visited ✓ Sarah assigned, due Friday" |

---

## Executive Summary: What's Built, What's Being Built

| Capability | v1 (Live) | v2 (In Progress) |
| --- | --- | --- |
| **Capture** | ✅ Telegram, voice, web | ✅ (no changes) |
| **Task extraction** | ✅ AI extraction to task board | ✅ Enhanced with real assignments |
| **Task assignment** | ⚠️ Lead caregiver manual claims | 🔄 Smart routing + lead approves top choice |
| **Care history** | ✅ Timeline of all events | ✅ Enhanced with real signals |
| **Care signals** | ✅ Hardcoded seed data | 🔄 Derived from actual events (missed meds, silence, sentiment) |
| **Proactive alerts** | ❌ None; must open app | 🔄 Hourly cron detects stale work → Telegram nudges |
| **Conversational queries** | ❌ Not available | 🔄 Tool-calling agent with citations (<3s p95) |
| **Handovers** | ⚠️ Manual generation on demand | 🔄 Auto-generated on long absence (24h+) |
| **Follow-up workflows** | ❌ Manual | 🔄 One-tap: schedule reminder, notify sibling, recurring check-in |
| **Workload visibility** | ✅ Load board view | ✅ (enhanced with predictions) |
| **Team engagement** | ⚠️ Passive (claim if you see it) | 🔄 Active (nudges + daily digest sent to you) |

---

## 0.2 How to Read This Document

Tandem v1 is a **shared inbox** for caregiving: Telegram forwards and voice notes get extracted into tasks/timeline items, family members claim work, AI generates handover briefings on demand. It works, but the lead caregiver still does all the *orchestration* (assigning, chasing, deciding what's urgent).

v2 turns Tandem into a **care coordinator agent**. Five concrete shifts:

1. **Smart Assign** — extracted items propose an assignee using load + history + preferences, instead of `suggested_assignee` being a free-text guess from the LLM.
2. **Co-Pilot tick** — an hourly Vercel Cron job that detects stale work, generates real care signals (replacing the simulated ones), and pushes nudges via Telegram + web.
3. **Real care signals** — derive `CareSignal` rows from actual data (missed meds, capture silence, sentiment dips), not seed data.
4. **Conversational Co-Pilot** — a `/copilot` chat surface with tool-calling over the existing tables (tasks, timeline, documents, captures).
5. **Closed-loop capture** — approving an extracted item offers one-tap follow-ups (schedule reminder, notify sibling, create recurring check-in).

All v1 behaviour stays. Mock mode (no Supabase / no `OPENAI_API_KEY`) must continue to work — the hackathon demo is a load-bearing constraint.

The rest of this doc specifies data model, API surface, agent tool spec, mock-mode strategy, rollout, and metrics in enough detail to start implementing without further product input.

---

## 1. Core Features: Vision → Implementation

### 1.0 Feature Map (Vision vs v1 vs v2)

| Vision Feature | v1 Status | v2 Status | Notes |
| --- | --- | --- | --- |
| **Telehealth Chatbot** | ✅ Built | ✨ Enhanced | Extract + voice transcription. v2: adds conversational queries with tool-calling |
| **Daily Actions Checklist** | ✅ Built (Tasks board) | ✨ Enhanced | Task board with manual claims. v2: smart routing + nudges for stale tasks |
| **Care History & Timeline** | ✅ Built | ✨ Enhanced | Full timeline of events. v2: adds signal detection (missed meds, silence, sentiment) |
| **Caregiver Onboarding & Handoff** | ⚠️ Partial | ✨ In progress | Manual handover briefing. v2: auto-handover + member preferences |
| **Family Engagement** | ✅ Built | ✨ Enhanced | See tasks, claim work. v2: daily digest, nudges, family tree insights |
| **Care Signals** | ✅ Built (fake data) | 🔄 Real data | Seeded mock signals. v2: derive from actual events (missed meds, gaps, sentiment) |
| **Coordination Agent** | ❌ Not built | 🔄 Building | N/A | v2: smart assign + co-pilot + nudges |

### 1.1 What v1 is today (Built features)

Mobile-first Next.js 15 App Router app. Supabase (Postgres + Auth + Storage) for persistence, OpenAI for extraction/summarisation, Telegram Bot API for inbound capture. Both Supabase and OpenAI are *optional*: missing keys flip the app into deterministic seeded mock mode.

#### v1 Surfaces (User-facing)

| Route | Feature | Purpose |
| --- | --- | --- |
| [app/dashboard](app/dashboard) | Family Home | Today's tasks, recent timeline, load summary |
| [app/timeline](app/timeline) | Care History | Chronological feed of notes, voice updates, meeting summaries, signals |
| [app/tasks](app/tasks) | Daily Actions | Task board, claim/assign, status transitions |
| [app/inbox](app/inbox) | Capture Review | Extracted items pending approval (from Telegram forwards, voice, documents) |
| [app/capture](app/capture) | Manual Input | Web capture (text/image/document/voice) |
| [app/handover](app/handover) | Handover Brief | "What you missed" briefing (manual trigger) |
| [app/meeting](app/meeting) | Doctor Visit | Recap from meeting transcript |
| [app/load](app/load) | Workload View | Distribution of care work across siblings |
| [app/settings](app/settings) | Circle Admin | Members, preferences |

#### v1 Server API Routes

| Route | Feature | Input | Output |
| --- | --- | --- | --- |
| [app/api/ai/extract/route.ts](app/api/ai/extract/route.ts) | Content extraction | Text/image/document | `ExtractionResult` (task + metadata) |
| [app/api/ai/voice/route.ts](app/api/ai/voice/route.ts) | Voice transcription | Audio | Transcript + suggested task |
| [app/api/ai/handover/route.ts](app/api/ai/handover/route.ts) | Handover generation | Time window | `Handover` brief |
| [app/api/ai/meeting/route.ts](app/api/ai/meeting/route.ts) | Meeting summarization | Transcript | `MeetingResult` |
| [app/api/captures/route.ts](app/api/captures/route.ts) | Capture CRUD | Capture event | Stored event |
| [app/api/extracted-items/[itemId]](app/api/extracted-items/[itemId]) | Task approval | Extracted item | Accept/delete + create task |
| [app/api/telegram/webhook/route.ts](app/api/telegram/webhook/route.ts) | Telegram ingest | Forwarded message | Create capture → extract |
| [app/api/data/route.ts](app/api/data/route.ts), [app/api/demo-data/route.ts](app/api/demo-data/route.ts) | Data fetch | Query | Live or mock data |

Domain model: [lib/types.ts](lib/types.ts)  
Migrations: [supabase/migrations/20260509000000_init_tandem.sql](supabase/migrations/20260509000000_init_tandem.sql), [20260509010000_add_forwarding_capture.sql](supabase/migrations/20260509010000_add_forwarding_capture.sql)

---

## 1.2 What's being added in v2 (Coordination Agent)

Three observations from the v1 design that v2 fixes:

1. **AI is per-request, never proactive** — Nothing runs on a schedule. The "are you on top of mum's care?" question still requires a human to open the app.
   - **v2 Fix**: `co-pilot/tick` cron job runs hourly, detects stale work, missed meds, generates nudges proactively.

2. **`CareSignal` is fake** — `lib/seed-data.ts` ships with hardcoded signals. The type is right; the generator is missing.
   - **v2 Fix**: Real signals derived from actual events (missed medication windows, extended silence in timeline, sentiment dips in notes).

3. **Assignment is a hint, not a decision** — `ExtractionResult.suggested_assignee` is a free-text name from LLM, ignored by inbox UI on approval. Lead caregiver still hand-claims everything.
   - **v2 Fix**: `lib/routing.ts` ranks candidates by workload + history + preferences. Lead caregiver sees top 3 options with reasoning, approves one.

#### v2 New Features (Behind feature flag)

**Feature 1: Smart Assign**  
Replace free-text suggestion with ranked candidates. See [§4.1 Smart Assign](#41-smart-assign).

**Feature 2: Proactive Co-Pilot Cron**  
Hourly job detects stale tasks, missed meds, sentiment dips. Pushes nudges via Telegram + web. See [§4.2 Co-Pilot Tick](#42-co-pilot-tick).

**Feature 3: Real Care Signals**  
Derive signals from actual data: missed medication windows, extended timeline silence, negative sentiment in notes. See [§4.3 Real Care Signals](#43-real-care-signals).

**Feature 4: Conversational Co-Pilot**  
Chat interface with tool-calling over tasks, timeline, documents. Answer queries like "what did mum's cardiologist say last month?" with citations. See [§4.4 Conversational Co-Pilot](#44-conversational-co-pilot).

**Feature 5: Closed-Loop Capture Follow-ups**  
After approving a task, one-tap actions: schedule reminder, notify sibling, recurring check-in. See [§4.5 Closed-Loop Capture](#45-closed-loop-capture).

#### v2 New Surfaces

| Route | Feature | Purpose |
| --- | --- | --- |
| [app/copilot/page.tsx](app/copilot/page.tsx) | Conversational Co-Pilot | Chat with the agent; tool calls; citations |
| [app/api/co-pilot/tick/route.ts](app/api/co-pilot/tick/route.ts) | Cron ticker | Hourly signal detection + nudge generation |
| [app/api/co-pilot/chat/route.ts](app/api/co-pilot/chat/route.ts) | Chat API | LLM tool-calling with citations |
| [app/api/co-pilot/nudges/route.ts](app/api/co-pilot/nudges/route.ts) | Nudge delivery | Push to Telegram + web inbox |
| [app/api/co-pilot/action/route.ts](app/api/co-pilot/action/route.ts) | Follow-up actions | Schedule reminder, notify sibling, etc. |
| [app/inbox/*](app/inbox/*) | Enhanced approval | v1 + follow-up action pills |
| [app/settings/*](app/settings/*) | Preference panes | New member preferences (category, availability, quiet hours, load capacity) |

---

## 2. Context

### 2.1 Why v2 now

- Underlying data model is good enough — `circle_members`, `tasks`, `timeline_items`, `capture_events`, `extracted_items` already capture what we need to make routing and signal decisions.
- Telegram bot is wired bidirectionally (we already POST to send confirmations); pushing nudges is incremental.
- AI Gateway + tool-calling SDKs are stable enough to build a real agent surface without provider lock-in.
- v1 is proven in the field; we know what data works and what doesn't.

---

## 3. Goals & non-goals

### 3.1 Goals (must)

- G1. **Auto-routing**: ≥60% of newly extracted tasks get an assignee accepted by the family without manual reassignment within 4h.
- G2. **Proactive nudges**: stale tasks (claimed, no progress >48h) and unclaimed-overdue tasks (past `dueDate − 24h`) are surfaced to the right person within one cron tick.
- G3. **Real signals**: every `CareSignal` in production data is derivable from ground-truth events, not seeds.
- G4. **Conversational queries**: a family member can ask "what did mum's cardiologist say last month?" and get a sourced answer in <3s p95.
- G5. **Mock-mode parity**: every v2 surface runs end-to-end with no Supabase and no OpenAI keys.

### 3.2 Stretch (should)

- S1. Closed-loop capture follow-ups (schedule reminder, notify sibling) post-approval.
- S2. Auto-generated handover when a member returns after >24h absence.
- S3. SMS fallback for nudges to non-Telegram siblings.

### 3.3 Non-goals (won't, this release)

- Multi-recipient circles (caring for two parents in one circle).
- Direct EHR / provider integrations.
- Co-Pilot taking *destructive* actions autonomously (delete, reassign without confirmation).
- Mobile native apps. Web + Telegram only.
- Replacing clinical advice. Co-Pilot must refuse medical reasoning beyond surfacing what providers already said.

---

## 5. Users & primary jobs

| Persona | Primary job | v2 outcome |
| --- | --- | --- |
| **Lead caregiver** (Sarah, eldest, default-caregiver) | Stop being the routing bottleneck | Co-Pilot proposes assignments; Sarah approves rather than dispatches |
| **Distant sibling** (Tom, lives abroad) | Know exactly what's mine, no scrolling | Daily Telegram digest "3 things are yours today"; one-tap claim/done |
| **Recipient** (Mum, the parent) | Forward a card, be done | Confirmation reply on Telegram includes assignee + due date |
| **Backup caregiver** (Priya, niece) | Pick up slack opportunistically | Nudge: "Sarah's load is at 90% this week, want to take Tuesday's transport?" |

Anti-persona: a stranger or non-circle member. RLS must hold.

---

## 5. Feature Specifications

### 5.1 Smart Assign

**What:** Replace `ExtractionResult.suggested_assignee` (LLM free-text guess, often wrong) with a deterministic ranked list produced by a routing function.

**Inputs:**
- `extractedItem` (category, dueAt, priority)
- `circle_members` rows + new `member_preferences` (`categoryPreferences`, `availability`, `quietHours`, `loadCapacityPct`)
- Recent claim history (last 90 days of `tasks` rows): per-member claim rate per category
- Current open load: count of `tasks` where `status IN ('claimed')` and `dueDate` within 7d, per member

**Algorithm (`lib/routing.ts`, new):**

```ts
type Candidate = { memberId: string; score: number; reasons: string[] };

export function rankAssignees(item: ExtractedItem, ctx: RoutingContext): Candidate[] {
  // 1. Filter: members in circle, not the recipient, available at item.dueAt
  // 2. Score components (sum, weighted):
  //    - categoryAffinity:  historical_claims_in_category / total_claims  (weight 0.35)
  //    - inverseLoad:       1 - (open_tasks / capacity)                   (weight 0.30)
  //    - explicitPref:      1 if category in member.categoryPreferences   (weight 0.20)
  //    - proximity:         1 - normalize(time_to_due)                    (weight 0.10)
  //    - defaultBias:       0.05 if member.isDefaultCaregiver             (weight 0.05)
  // 3. Return top 3, with human-readable reasons[]
}
```

**Rules:**
- Never auto-assign without surfacing reasons. UI must show "Why Tom?" on hover/tap.
- If top candidate's score < 0.4, fall back to "unclaimed" — don't force a bad assignment.
- Per-circle toggle `auto_execute_assignments`: default off (propose), on (write directly to `tasks.assigneeId` with `claimed` status and 1h undo window).

**Surface changes:**
- [app/api/ai/extract/route.ts](app/api/ai/extract/route.ts): after LLM extraction, call `rankAssignees` for each recommended task; replace `suggested_assignee` (string) with `suggested_assignees` (array of `{memberId, name, score, reasons}`). Bump response shape — no v1 callers consume this server-to-server, so no compat layer needed.
- [app/inbox](app/inbox): show top 3 with one-tap "Approve & assign to Tom" / "Pick someone else."

**Telemetry:** log `routing_decisions` (candidate ranking, chosen, time-to-accept, reassignment-within-4h). This is the dataset that proves G1.

### 5.2 Co-Pilot tick (proactive layer)

**What:** A scheduled job that runs every hour and emits nudges + signals.

**Implementation:** Vercel Cron via [vercel.ts](https://vercel.com/docs/project-configuration/vercel-ts) (use the new `vercel.ts` config, not `vercel.json`). New route `app/api/co-pilot/tick/route.ts`. Idempotent on `(rule_id, target_id, period_bucket)`.

```ts
// vercel.ts (new file)
import { type VercelConfig } from '@vercel/config/v1';
export const config: VercelConfig = {
  framework: 'nextjs',
  crons: [
    { path: '/api/co-pilot/tick', schedule: '0 * * * *' },             // hourly
    { path: '/api/co-pilot/digest', schedule: '0 8 * * *' },            // daily 08:00 local
  ],
};
```

**What the tick does (in order, all idempotent):**

1. **Detect stale tasks** — `status='claimed' AND updatedAt < now()-48h` → nudge claimer.
2. **Detect unclaimed-overdue** — `status='unclaimed' AND dueDate < now()+24h` → escalate to lead.
3. **Generate care signals** — run signal rules (§4.3).
4. **Run digest gate** — if member opens app after >24h absence, queue auto-handover (S2).
5. **Flush nudge queue** — collapse per-member nudges, respect `quietHours` and daily cap, send via Telegram (existing bot) and write web inbox row.

**Idempotency:** every nudge writes to `nudges (id, member_id, kind, target_id, period_bucket, sent_at, dismissed_at)` with unique `(member_id, kind, target_id, period_bucket)`. `period_bucket` is `date_trunc('hour', now())` for hourly, `date_trunc('day', now())` for digest.

**Failure mode:** a tick that errors mid-run must not double-send. Wrap each member's nudges in a transaction that inserts the `nudges` row first, then performs the side-effect; on side-effect failure, mark the row `failed` and let the next tick retry (only if not yet sent).

### 5.3 Real care signals

**What:** Replace seeded `CareSignal` rows with derived ones.

**Generators (new `lib/signals/`):**

| Rule | Triggers | Severity |
| --- | --- | --- |
| `missedMedicationCheckin` | Recurring medication task missed `dueDate + 6h` with no `done` | `watch` → `alert` after 2 misses |
| `captureSilence` | No `capture_events` in 72h, recipient previously active | `watch` |
| `voiceSentimentDip` | Last 3 voice notes have negative sentiment (cheap classifier on transcript) | `watch` |
| `appointmentMissed` | Appointment timeline item past, no follow-up note within 24h | `watch` |
| `loadImbalance` | One member >70% of weekly task claims | `normal` (informational) |
| `escalationOverdue` | `alert` signal open >24h | `alert` |

Signals write to `timeline_items` with `type='care signal'` and `severity` set, so they appear in the existing feed without UI work.

**Migration:** add `signal_rules` table for per-circle thresholds (so a hyper-anxious family can lower `captureSilence` to 24h).

### 5.4 Conversational Co-Pilot

**What:** A chat surface at `/copilot` for natural-language queries over circle data.

**Stack:**
- Vercel AI SDK v6 + AI Gateway with `anthropic/claude-sonnet-4-6` as default (configurable via `COPILOT_MODEL`).
- Tool-calling agent. Tools are server-side, scoped to caller's circle (RLS enforced via Supabase JWT passthrough).
- Stream responses (`streamText` / `useChat`).

**Tools (read-only in v2.0):**

| Tool | Returns | Notes |
| --- | --- | --- |
| `searchTimeline(query, range?)` | `TimelineItem[]` | Full-text + semantic via pgvector on `timeline_items.description` (new column `embedding vector(1536)`) |
| `searchDocuments(query)` | `DocumentRecord[]` | Same pattern on `documents.summary` |
| `listTasks(filters)` | `Task[]` | Status, assignee, due window |
| `getMember(name)` | `FamilyMember` | Resolves nicknames |
| `getLoad(rangeDays)` | `CareLoadCategory[]` | Reuses load logic |
| `getCareSignals(severity?)` | `CareSignal[]` | |

**Write tools (gated by `auto_execute_actions` flag, off by default):**

| Tool | Effect |
| --- | --- |
| `proposeAssignment(taskId, memberId)` | Writes draft, requires user confirm in UI |
| `scheduleReminder(taskId, when)` | Creates entry in `nudges` |
| `draftHandover(rangeDays)` | Calls existing handover route |

**System prompt constraints (codify in `lib/ai/copilot-prompt.ts`):**
- Always cite source: `[timeline:abc123]` inline. UI renders as a chip linking to the source.
- Refuse medical reasoning: "I can show you what Dr. Patel said on April 12, but I can't tell you if you should change the dose."
- Never invent member names or dates. If a tool returns empty, say so.

**Eval suite (`lib/ai/copilot-evals/`):** seed corpus of 30 Q/A pairs using the existing seed data. Run in CI; block merge if accuracy < 0.85 or hallucinated citation rate > 0.

### 5.5 Closed-loop capture

**What:** After a user approves an extracted item in the inbox, Co-Pilot offers contextual one-tap follow-ups.

**Examples:**
- Approved appointment → "Notify Tom (assigned) / Add 1d-before reminder / Block Sarah's calendar"
- Approved medication item → "Create recurring check-in task / Add to mum's medication list"
- Approved document with `important_dates` → "Create reminder 7d before each date"

**Implementation:** server-side rule table `capture_followups` keyed on `extractedItem.type` + `category`. UI in [components/capture](components/capture) renders a pill row after approval. Each pill is a single `POST /api/co-pilot/action` call.

### 5.6 Auto-handover triggers (stretch)

On member's first authenticated request after `last_seen_at < now()-24h`, server middleware checks for `pending_handover`. If absent, calls existing handover route with `range = since(last_seen_at)` and stores result. UI surfaces a one-shot card on next page render. Gated by per-member preference `auto_handover_on_return`.

---

## 5. Data model changes

### 5.1 New tables

```sql
-- Per-member preferences for routing & nudges
CREATE TABLE member_preferences (
  member_id          UUID PRIMARY KEY REFERENCES circle_members(id) ON DELETE CASCADE,
  category_preferences TEXT[] NOT NULL DEFAULT '{}',  -- TaskCategory[]
  availability       JSONB  NOT NULL DEFAULT '{}',     -- {mon:[[9,17]], ...}
  quiet_hours        INT4RANGE,                        -- e.g. [22,7) local
  load_capacity_pct  INT NOT NULL DEFAULT 100 CHECK (load_capacity_pct BETWEEN 0 AND 200),
  auto_handover_on_return BOOLEAN NOT NULL DEFAULT true,
  notification_channels TEXT[] NOT NULL DEFAULT '{web}', -- subset of {web,telegram,sms}
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Per-circle Co-Pilot configuration
CREATE TABLE co_pilot_rules (
  circle_id          UUID PRIMARY KEY REFERENCES care_circles(id) ON DELETE CASCADE,
  auto_execute_assignments BOOLEAN NOT NULL DEFAULT false,
  auto_execute_actions     BOOLEAN NOT NULL DEFAULT false,
  digest_local_time  TIME NOT NULL DEFAULT '08:00',
  digest_timezone    TEXT NOT NULL DEFAULT 'UTC',
  daily_nudge_cap    INT  NOT NULL DEFAULT 3,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Outbound nudges (idempotent, auditable)
CREATE TABLE nudges (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id     UUID NOT NULL REFERENCES care_circles(id) ON DELETE CASCADE,
  member_id     UUID NOT NULL REFERENCES circle_members(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL,         -- 'stale_task' | 'unclaimed_overdue' | 'digest' | ...
  target_kind   TEXT NOT NULL,         -- 'task' | 'signal' | 'handover'
  target_id     UUID,
  period_bucket TIMESTAMPTZ NOT NULL,
  payload       JSONB NOT NULL,
  channel       TEXT NOT NULL,         -- 'telegram' | 'web' | 'sms'
  state         TEXT NOT NULL DEFAULT 'queued', -- 'queued'|'sent'|'failed'|'dismissed'
  sent_at       TIMESTAMPTZ,
  dismissed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (member_id, kind, target_id, period_bucket)
);
CREATE INDEX nudges_pending_idx ON nudges (state) WHERE state IN ('queued','failed');

-- Configurable signal generators per circle
CREATE TABLE signal_rules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id   UUID NOT NULL REFERENCES care_circles(id) ON DELETE CASCADE,
  rule_key    TEXT NOT NULL,           -- 'captureSilence' | ...
  config      JSONB NOT NULL DEFAULT '{}',
  enabled     BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (circle_id, rule_key)
);

-- Routing decisions (telemetry for G1)
CREATE TABLE routing_decisions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extracted_item_id UUID NOT NULL REFERENCES extracted_items(id) ON DELETE CASCADE,
  candidates      JSONB NOT NULL,
  chosen_member_id UUID,
  auto_executed   BOOLEAN NOT NULL,
  accepted        BOOLEAN,             -- null until 4h window passes
  reassigned_within_4h BOOLEAN,
  decided_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Embeddings for Co-Pilot retrieval (requires pgvector)
ALTER TABLE timeline_items  ADD COLUMN embedding vector(1536);
ALTER TABLE documents       ADD COLUMN embedding vector(1536);
CREATE INDEX timeline_embedding_idx ON timeline_items USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX documents_embedding_idx ON documents USING ivfflat (embedding vector_cosine_ops);
```

### 5.2 RLS

Every new table inherits the same RLS pattern as v1: a row is readable/writable iff `auth.uid()` is in `circle_members.user_id` for the row's `circle_id`. Add policies in the migration; do not skip — the Co-Pilot agent must run under the caller's JWT, not the service role.

The service role is used only inside the cron tick, where there is no caller context. Cron tick must scope every query by `circle_id` explicitly.

### 5.3 Migration file

`supabase/migrations/20260601000000_co_pilot.sql` — contains everything above plus seed updates so mock mode reflects v2 shapes.

### 5.4 TypeScript additions in `lib/types.ts`

```ts
export type NudgeKind = 'stale_task' | 'unclaimed_overdue' | 'digest' | 'load_imbalance' | 'signal_alert';
export type NudgeChannel = 'telegram' | 'web' | 'sms';

export type MemberPreferences = {
  memberId: string;
  categoryPreferences: TaskCategory[];
  availability: Partial<Record<'mon'|'tue'|'wed'|'thu'|'fri'|'sat'|'sun', Array<[number, number]>>>;
  quietHours?: [number, number];
  loadCapacityPct: number;
  autoHandoverOnReturn: boolean;
  notificationChannels: NudgeChannel[];
};

export type RoutingCandidate = {
  memberId: string;
  name: string;
  score: number;             // 0..1
  reasons: string[];
};

// Extend ExtractionResult.recommended_tasks[*] with:
//   suggested_assignees: RoutingCandidate[]   (replaces suggested_assignee: string)
```

---

## 6. API surface

### 6.1 New routes

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/co-pilot/tick` | Cron-only. Runs detectors + flushes queue. Auth: shared secret header. |
| POST | `/api/co-pilot/digest` | Cron-only. Daily morning digest. |
| POST | `/api/co-pilot/action` | User-triggered follow-up (closed-loop capture). Body: `{kind, taskId?, when?, ...}`. |
| POST | `/api/co-pilot/chat` | Streaming chat with tool calls. Body: `{messages}`. |
| GET  | `/api/co-pilot/nudges` | List my pending nudges (web inbox). |
| POST | `/api/co-pilot/nudges/[id]/dismiss` | Dismiss. |
| GET  | `/api/preferences/me` | Get my `member_preferences`. |
| PATCH| `/api/preferences/me` | Update. |
| GET  | `/api/preferences/circle` | Circle-level `co_pilot_rules`. Lead-only. |
| PATCH| `/api/preferences/circle` | Update. Lead-only. |

### 6.2 Modified routes

- [app/api/ai/extract/route.ts](app/api/ai/extract/route.ts) — after LLM call, run `rankAssignees` per recommended task; persist `routing_decisions` row; return `suggested_assignees`.
- [app/api/extracted-items/[itemId]](app/api/extracted-items/[itemId]) — accept `assigneeId` on approve; if circle has `auto_execute_assignments=true`, set without confirmation; emit follow-up suggestions in response.
- [app/api/telegram/webhook/route.ts](app/api/telegram/webhook/route.ts) — handle inbound replies to nudges (tap "Done" / "Snooze 1h"). Map `callback_query` to nudge dismissal.

### 6.3 Cron auth

Vercel Cron sets `Authorization: Bearer <CRON_SECRET>`. Validate in middleware. Reject all other callers to `/api/co-pilot/tick` with 401.

---

## 7. AI architecture

### 7.1 Provider strategy

Use **Vercel AI Gateway** with model strings (`anthropic/claude-sonnet-4-6`, `anthropic/claude-haiku-4-5-20251001`), not direct provider SDKs. Reasons: failover, observability, cost tracking, no key sprawl. The existing `openai` dependency stays only for Whisper-equivalent transcription until we migrate voice to Gateway too (out of scope for v2.0).

Models by job:

| Job | Model | Why |
| --- | --- | --- |
| Extraction (existing) | `anthropic/claude-haiku-4-5-20251001` | Cheap, structured output is fine |
| Conversational Co-Pilot | `anthropic/claude-sonnet-4-6` | Tool-calling quality matters |
| Sentiment classifier (signals) | `anthropic/claude-haiku-4-5-20251001` | Volume |
| Embeddings | `openai/text-embedding-3-small` (via Gateway) | Cost |

### 7.2 Mock mode

The Gateway client must be a thin wrapper that detects `process.env.AI_GATEWAY_API_KEY` (or `OPENAI_API_KEY` for legacy) and falls back to deterministic seeded responses. New file: `lib/ai/gateway.ts`. All v2 AI calls go through it.

For Co-Pilot chat in mock mode, ship a scripted fixture conversation indexed by question hash — judges expect the demo to be live, but the demo must not require keys.

### 7.3 Tool-calling pattern

```ts
// app/api/co-pilot/chat/route.ts (sketch)
import { streamText, tool } from 'ai';
import { z } from 'zod';

export async function POST(req: Request) {
  const { messages } = await req.json();
  const ctx = await getCircleContext(req); // RLS-bound

  const result = streamText({
    model: 'anthropic/claude-sonnet-4-6',
    system: COPILOT_SYSTEM_PROMPT,
    messages,
    tools: {
      searchTimeline: tool({
        description: 'Semantic + keyword search over the family timeline.',
        inputSchema: z.object({ query: z.string(), rangeDays: z.number().optional() }),
        execute: async ({ query, rangeDays }) => searchTimeline(ctx, query, rangeDays),
      }),
      // ... other tools
    },
    maxSteps: 6,
  });

  return result.toUIMessageStreamResponse();
}
```

---

## 8. UX changes

### 8.1 Inbox approval flow (v2)

Today: a "Approve" button writes the extracted item to `tasks` with `unclaimed`.

v2:
1. Approval card shows top assignee with score bar + reasons. "Approve & assign to Tom (load 30%, owns admin)."
2. Secondary chip: "Pick someone else" → expands to ranked list.
3. After approval, follow-up pill row appears: "Notify Tom · Add 1d reminder · Block Sarah's Tue."
4. If `auto_execute_assignments=on`, approval is skipped — card shows for 1h with "Undo" then collapses.

### 8.2 Co-Pilot inbox (new surface or merged into Inbox)

Per-member view: pending nudges + dismissed-today log. Tappable rows route to the underlying task/signal.

### 8.3 Chat surface (`/copilot`)

Standard chat layout. Citation chips render inline. Empty state shows three suggested questions seeded from current data ("What's mum's next appointment?" / "Who's least loaded this week?" / "Summarise the last cardiology visit").

### 8.4 Settings additions

- **Member-level**: notification channels, quiet hours, category preferences, capacity, auto-handover toggle.
- **Circle-level (lead only)**: auto-execute toggles, digest time, daily nudge cap, signal rule thresholds.

### 8.5 Telegram nudges

Plain text + inline keyboard:

```
🌅 Good morning, Tom. 3 things today:

  • Drive mum to cardiology, Tue 10:00 (you claimed this)
  • Pharmacy refill — overdue, no one claimed yet
  • Sarah's load is 90% this week — pick anything?

[ I've got the pharmacy ]  [ Show me everything ]  [ Snooze 4h ]
```

Callback queries map to actions on the existing webhook route.

---

## 9. Security & privacy

- **PHI-adjacent data.** Treat all `timeline_items.description`, `documents.summary`, `capture_events.raw_text` as sensitive. Logs must not include row content; log IDs only.
- **RLS** is the primary boundary. Service role usage is restricted to cron tick + Telegram webhook (which authenticates via `TELEGRAM_WEBHOOK_SECRET`).
- **AI Gateway zero-data-retention** must be enabled. Verify in dashboard before launch.
- **Embeddings** are sensitive too — pgvector columns inherit RLS via row policy.
- **Telegram allow-list**: keep `TELEGRAM_ALLOWED_USER_IDS` enforcement. Add per-circle allow-list table in v2.1 if we onboard external families.
- **Refusal policy** for Co-Pilot chat: no medical reasoning, no legal interpretation, no advice on controlled-substance dosing. Enforce in system prompt + a deterministic post-filter for high-risk patterns (regex on `mg`, `dose`, etc., to require a citation).
- **Audit log**: every write tool call, every assignment, every nudge sent — written to `routing_decisions` / `nudges` / a new `audit_log` if any other writes appear.

---

## 10. Observability

- Structured logs (JSON) with `circle_id`, `member_id`, `correlation_id` on every server action.
- New dashboard (Vercel Analytics + Postgres views):
  - Routing acceptance rate (G1)
  - Median time-to-claim
  - Nudges sent / dismissed / acted-on
  - Signal generation rate by rule
  - Co-Pilot chat: latency p50/p95, tool-call distribution, refusal rate
- Error budget: cron tick failures > 5% in a rolling 24h triggers a Vercel alert.

---

## 11. Mock-mode strategy (load-bearing)

Every v2 feature must work with no keys. Concrete checklist for each PR:

- [ ] Migration adds rows to [supabase/seed.sql](supabase/seed.sql) so live and mock data shapes match.
- [ ] Any new AI call routes through `lib/ai/gateway.ts` with a deterministic fallback.
- [ ] Cron tick has a `dev` mode trigger (`POST /api/co-pilot/tick?dev=1` with no auth in development) so demo can show signals firing.
- [ ] Co-Pilot chat fixture covers the three seeded suggested questions.
- [ ] Telegram nudges in mock mode write to a `mock_outbox` table viewable on a debug page.

If a PR can't be demoed without keys, it's not done.

---

## 12. Rollout plan

Phased, all behind `co_pilot_v2` feature flag (per-circle, opt-in).

1. **Phase 1 — foundations (weeks 1–2)**
   - Migration + types + `lib/routing.ts` with unit tests
   - `co-pilot/tick` skeleton (no-op detectors, idempotency proven)
   - Settings UI for preferences
2. **Phase 2 — Smart Assign (weeks 3–4)**
   - Extract route changes
   - Inbox UI changes
   - `routing_decisions` telemetry → dashboard
   - Ship to one internal circle
3. **Phase 3 — proactive layer (weeks 5–6)**
   - Real signals replace seeded ones (mock mode keeps both via toggle)
   - Stale-task + unclaimed-overdue detectors
   - Web inbox + Telegram nudges
   - Daily digest
4. **Phase 4 — Conversational Co-Pilot (weeks 7–9)**
   - Read-only tools, citations, refusal policy
   - Eval suite in CI
   - Streaming UI
   - Embedding backfill job
5. **Phase 5 — closed-loop + auto-handover (weeks 10–11)**
   - Capture follow-ups
   - Auto-handover middleware
6. **Phase 6 — GA (week 12)**
   - Flip flag default to on for new circles
   - Existing circles see opt-in card

Kill criteria at each phase:
- Phase 2 abort if routing acceptance < 40% on internal circle
- Phase 3 abort if dismissal rate > 60% on nudges
- Phase 4 abort if eval accuracy < 0.75 or any hallucinated citation in eval

---

## 13. Success metrics

| Metric | Baseline | Target | Measured by |
| --- | --- | --- | --- |
| Median time-to-claim on extracted tasks | unknown (instrument first) | < 30 min | `routing_decisions` + `tasks.claimed_at` |
| Auto-assigned tasks accepted within 4h | n/a | ≥ 60% | `routing_decisions.accepted` |
| Lead-caregiver share of total claims | ~70% (estimate) | < 50% | weekly query on `tasks.assigneeId` |
| D7 retention of distant siblings | unknown | +25 pp vs v1 cohort | auth events |
| Stale-task rate (overdue > 24h, no action) | unknown | < 10% | hourly snapshot |
| Co-Pilot chat refusal-when-should-have rate | n/a | < 5% (eval set) | eval suite |
| Co-Pilot chat hallucinated citation rate | n/a | 0 | eval suite, blocks merge |
| Cron tick error rate (24h) | n/a | < 1% | structured logs |

---

## 14. Risks & mitigations

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Wrong auto-assignment erodes trust | High | High | Default to propose (not execute); always show reasons; one-tap reassign with reason capture; feed reasons back into routing weights |
| Nudge fatigue → uninstall Telegram bot | Medium | High | Per-circle daily cap; quiet hours mandatory; bundling; dismissal rate alarm |
| Co-Pilot hallucinates a doctor's quote | Medium | Catastrophic | Mandatory citations; eval gate in CI; refusal policy; post-filter for medical terms |
| Mock-mode drifts from live | High | Medium (kills demo) | PR checklist; CI runs both modes; seed migration co-located with data migration |
| Cron tick double-sends nudges | Medium | Medium | Unique constraint on `(member_id, kind, target_id, period_bucket)`; insert-then-act ordering; idempotency tested |
| pgvector cost / latency at scale | Low (small data per circle) | Low | ivfflat index; per-circle scoped queries; cache embeddings on write |
| Provider outage breaks chat | Low | Medium | AI Gateway failover to Haiku; chat surface degrades to "search only" mode |
| RLS bypass via Co-Pilot tools | Medium | Catastrophic | All tool execution under caller JWT; integration tests for cross-circle leakage |

---

## 15. Open questions

1. **Auto-execute by default?** PRD says no. Counter-argument: lead caregivers are exactly the people who'll never flip the switch on, and we'd see the impact only in opted-in circles. Suggest: A/B at GA with explicit consent flow.
2. **SMS now or later?** Listed as stretch. If usability testing shows >20% of distant siblings refuse Telegram, promote to must.
3. **Multi-recipient circles** (one circle, two parents). Out of scope for v2.0 but the data model should not actively block it. Audit: `care_recipients` is already 1-to-N from `care_circles`, so we're probably fine.
4. **Calendar integration** (Google/Apple)? Not in v2.0. The "block Sarah's Tuesday" follow-up assumes in-app calendar only.
5. **Does the agent get write tools at GA, or does that wait for v2.1 after we measure read-only refusal/hallucination rates?** Default position: read-only at GA.

---

## 16. Definition of done

A v2.0 release is done when:

- [ ] All migrations applied; `supabase db reset` from scratch produces a working v2 schema
- [ ] `npm run dev` works with no keys; every v2 surface is reachable and demoable
- [ ] All tests pass: unit (routing, signal rules), integration (RLS leakage, cron idempotency), eval (Co-Pilot accuracy ≥ 0.85)
- [ ] Three internal circles have run on v2 for ≥ 2 weeks with G1 metric on track
- [ ] Telemetry dashboard live; alerts wired
- [ ] Settings UI ships for all per-member and per-circle preferences
- [ ] Documentation: [README.md](README.md) updated with cron + AI Gateway env vars; new `docs/co-pilot.md` for engineers
- [ ] Feature flag flip plan signed off

---

## 17. Out of scope (deferred to v2.1+)

- Multi-recipient circles
- Calendar integration (Google/Apple/Outlook)
- Native mobile apps
- Direct EHR / portal scraping
- Agent write actions beyond proposals (full autonomous mode)
- Cross-circle insights ("families like yours often…")
- Voice-out (Co-Pilot speaks) and on-device wake word
- Billing / paid tier mechanics

---

## 18. Appendix: file-level change map

For grep-ability when starting work:

| Path | Change |
| --- | --- |
| `vercel.ts` | **new** — cron schedule |
| `supabase/migrations/20260601000000_co_pilot.sql` | **new** — all v2 tables + RLS |
| `supabase/seed.sql` | update with v2 seeds |
| `lib/types.ts` | add `MemberPreferences`, `RoutingCandidate`, `NudgeKind`, etc.; modify `ExtractionResult` |
| `lib/routing.ts` | **new** |
| `lib/signals/index.ts` | **new** — rule registry |
| `lib/signals/rules/*.ts` | **new** — one file per rule |
| `lib/ai/gateway.ts` | **new** — provider-neutral wrapper with mock fallback |
| `lib/ai/copilot-prompt.ts` | **new** |
| `lib/ai/copilot-evals/` | **new** — eval corpus + runner |
| `lib/seed-data.ts` | extend with v2 fixtures |
| `app/api/ai/extract/route.ts` | wire `rankAssignees`, persist `routing_decisions` |
| `app/api/extracted-items/[itemId]/route.ts` | accept `assigneeId`, return follow-ups |
| `app/api/telegram/webhook/route.ts` | handle callback queries from nudges |
| `app/api/co-pilot/tick/route.ts` | **new** |
| `app/api/co-pilot/digest/route.ts` | **new** |
| `app/api/co-pilot/action/route.ts` | **new** |
| `app/api/co-pilot/chat/route.ts` | **new** |
| `app/api/co-pilot/nudges/route.ts` | **new** |
| `app/api/co-pilot/nudges/[id]/dismiss/route.ts` | **new** |
| `app/api/preferences/me/route.ts` | **new** |
| `app/api/preferences/circle/route.ts` | **new** |
| `app/copilot/page.tsx` | **new** — chat UI |
| `app/inbox/*` | approval card v2, follow-up pills |
| `app/settings/*` | preference panes |
| `components/copilot/*` | **new** — chat components, citation chips |
| `components/shared/nudge-card.tsx` | **new** |
| `README.md` | new env vars (`CRON_SECRET`, `AI_GATEWAY_API_KEY`, `COPILOT_MODEL`), v2 section |
| `docs/co-pilot.md` | **new** — engineering deep dive |

---

## 18. Proposed Feature: Caregiver Wrapped (v2.1)

**Motivation:** When a caregiver steps back from active care, Tandem generates a Spotify Wrapped-style celebration of their service. It quantifies their impact, injects humor through funny comparisons, and provides a shareable keepsake.

**Example narrative:** "You were there for 187 days. You coordinated 847 tasks. You kept mum's meds on track with 98.7% adherence—better than people remember to park their cars. Thank you. ❤️"

**Key features:**
- Auto-generates or on-demand when member transitions to `status = 'inactive'`
- 7 interactive cards: cover, duration, tasks, critical moments, funny comparisons, key memories, thank-you
- Shareable as PNG/PDF or private URL (with QR code)
- Social share templates (Twitter, Instagram, Telegram, email)
- Archived in circle timeline as a permanent memory

**Why it works:**
- Celebrates contribution (morale for departing caregiver + staying caregivers)
- Creates a shareable moment (good for word-of-mouth, social proof)
- Eases transitions (acknowledges the emotional work, not just logistics)
- Provides data gratification (people like seeing their numbers)

**Effort:** 2-3 weeks (Phase 1: stats; Phase 2: UI + sharing; Phase 3: polish)

**Full spec:** See [FEATURE_CAREGIVER_WRAPPED.md](FEATURE_CAREGIVER_WRAPPED.md)

---

*End of PRD.*
