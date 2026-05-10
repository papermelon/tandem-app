# Tandem

Tandem is a mobile-first family caregiving coordination app for adult children caring for an ageing parent. It covers a warm family feed, task ownership, AI-assisted capture, structured handovers between caregivers, meeting summaries, care-load visibility, simulated reassurance signals, and a celebratory **Caregiver Wrapped** moment when someone steps back from primary care.

The app runs locally without Supabase or OpenAI keys. Missing environment variables automatically enable seeded local data and mock AI responses.

## Stack

- Next.js App Router · TypeScript · Tailwind CSS
- shadcn/ui-style components
- Supabase Auth, Postgres, and Storage ready
- OpenAI API routes with mock fallback
- Vercel-ready environment variables
- `qrcode.react` for handover QR generation

## Local Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The first screen is a splash. Tap the **TANDEM** logo to reveal a username field — type any name to start. Existing usernames (anyone already saved in localStorage) get a "Welcome back" prompt; new usernames create a fresh account on the spot.

## Environment Variables

Create `.env.local` when you want live integrations:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
```

Optional model overrides:

```bash
OPENAI_MODEL=gpt-5.5
OPENAI_TRANSCRIBE_MODEL=gpt-4o-mini-transcribe
```

Telegram forwarding capture:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
TELEGRAM_ALLOWED_USER_IDS=
TELEGRAM_BOT_USERNAME=
```

For Vercel, set `NEXT_PUBLIC_APP_URL` to the production URL. `TELEGRAM_ALLOWED_USER_IDS` is optional; when set, use comma-separated Telegram numeric user IDs to keep the bot private.
`TELEGRAM_BOT_USERNAME` is optional; Tandem can derive it from `TELEGRAM_BOT_TOKEN`, but setting it avoids an extra Bot API lookup when generating connect links.

Never expose `SUPABASE_SERVICE_ROLE_KEY` in client code. Tandem only uses it inside server routes.

## Supabase

1. Create a Supabase project.
2. Run `supabase/migrations/20260509000000_init_tandem.sql`.
3. Run `supabase/seed.sql`.
4. Create the env vars above.
5. Restart `npm run dev`.

The migration creates:

- `users`, `care_circles`, `care_recipients`, `circle_members`
- `timeline_items`, `tasks`, `documents`
- `capture_events`, `extracted_items`
- `telegram_users`, `care_signals`, `handovers`
- private Storage bucket: `documents`

> Handover v2 (patient-centric page, sessions, acknowledgments, permissions) currently lives in client state + localStorage when running in mock mode. A `handover_sessions` table is on the spec roadmap — until then, the in-memory provider in `components/providers/care-data-provider.tsx` is the source of truth.

## Mock Mode

When Supabase keys are absent, `/api/demo-data` returns local seeded data.

When `OPENAI_API_KEY` is absent, AI routes return realistic mock outputs:

- `/api/ai/extract`
- `/api/ai/handover` (legacy briefing)
- `/api/ai/care-history-chat` (Health page Q&A)
- `/api/ai/meeting`
- `/api/ai/voice`

This keeps the demo stable for offline reviews.

## The Health (Handover) Page

`/handover` is the patient-centric **Health** page (look for the stethoscope icon in the bottom nav). It composes four sections plus a care-team panel:

1. **Patient profile summary** — name, age, relationship, medical conditions, allergies, current medications, emergency contacts, and live counts of active caregivers vs. family members.
2. **Care-history chat** — ask questions about the patient ("What were her last vitals?"); answers come back with cited timeline sources, confidence ratings, and a `mock` badge when running without an OpenAI key.
3. **Generate handover QR** — one-click QR with a 1-hour expiry. While a session is active you see the QR, a live countdown, a real-time **Incoming progress** card (per-tab acknowledgments + checklist X/Y), a **Simulate handover** button, and **Cancel**. Once the session is complete, the QR card collapses into a completion summary with shortcuts to the handover summary and Caregiver Wrapped.
4. **Add to care team** — onboard family members with role-based permission defaults. Permissions are toggled per-member (UI only — enforcement is on the roadmap).
5. **Care team & permissions** — list every member, edit their permissions inline, see access expiry for temporary caregivers, and remove non-primary members.

### Incoming caregiver wizard

Scanning the QR (or pressing **Simulate handover**) opens a 5-tab wizard at `/handover/[id]`:

- **Briefing**, **History**, **Appts**, **Team**, **Checklist**

Each tab has an "I have read" / "I acknowledge" / "I'm ready to start" affordance. Acknowledging a tab auto-advances to the next one. The Checklist tab additionally requires every item to be ticked before its ack button enables. Once all five are acknowledged the view auto-routes to `/handover/[id]/complete`.

### Simulate vs. real handover

Pressing **Simulate handover** marks the session `simulated: true`. The completion screen then shows only **Handover complete** + **Back to handover** — no Caregiver Wrapped card. Real (non-simulated) completions still see Wrapped.

After Wrapped, the departing caregiver can press **End handover** on the final card to archive the completed session — the **Incoming progress** card on `/handover` then disappears and the page returns to the empty-state QR generator.

### Legacy AI briefing

The original one-page AI briefing flow is preserved at `/handover/legacy` for reference.

## Demo Script

1. Splash → tap the **TANDEM** logo → enter a username (or "Sarah" for the seeded account).
2. Pick **Mum** from the patient selector → **Begin care**.
3. Open **Tasks** to show the unclaimed rehab transport.
4. Upload a doctor memo via **Capture** (or tap "Use demo memo"). AI extracts a summary and suggested tasks.
5. Assign transport to Ming and admin follow-up to Lina.
6. Show **Care load** — Rachel has carried most tasks.
7. Show the simulated care signal (no usual morning movement).
8. Open **Health** (the stethoscope tab):
   - Highlight the patient profile and emergency contacts.
   - Ask the chat *"What were her last vitals?"* — show the cited timeline source.
   - Press **Generate handover QR**.
   - Press **Simulate handover** → walk the wizard (auto-advance) → land on the simulated completion screen.
   - Press **Back to handover** — the completion shortcut to **Open handover summary** stays on screen.
9. Generate a real handover, complete it, then open **View Caregiver Wrapped** → tap **End handover** on the final card to clean up.
10. Paste family meeting notes in **Meeting** and convert decisions into tasks.

## Safety Notes

Tandem supports family caregiving coordination and does not provide medical advice. Medication features are reminders and notes only, not clinical recommendations. AI outputs are marked for review before saving. The care-history chat answers strictly from recorded timeline data and surfaces a `not_found` confidence when the answer isn't in the data.

## Demo Auth

The app starts with a lightweight Auth/onboarding screen:

- **Continue as Rachel** forces local demo data and opens the existing Ah Muay care circle with Rachel, Ming, and Lina.
- **Start fresh** forces local demo data with an empty care-recipient list so the onboarding flow can be shown.
- Email magic-link sign-in uses Supabase Auth when `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are configured. Use this path when two people should edit the same shared Supabase care recipient profile.

Supabase Auth currently bootstraps a `public.users` row for the signed-in person. In live mode, the Home profile selector reads the shared Supabase care recipient and profile edits are persisted through `/api/data/care-recipients/[recipientId]`.

For a live Supabase demo:

1. Apply all migrations in `supabase/migrations`, including `20260612000000_add_care_recipient_profile.sql` and `20260613000000_add_care_recipient_relationship.sql`.
2. Run `supabase/seed.sql`.
3. Add `http://localhost:3000/auth/callback` and the deployed `/auth/callback` URL to Supabase Auth redirect URLs.
4. Sign in with the email link instead of using **Continue as Rachel**.

Production-grade care-circle scoping still needs stricter RLS, invite flows, and session-scoped API writes.

## Telegram Bot Setup

1. Create a bot with Telegram `@BotFather`.
2. Add `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, and `NEXT_PUBLIC_APP_URL` to Vercel.
3. Deploy the app.
4. Register the webhook:

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=<NEXT_PUBLIC_APP_URL>/api/telegram/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

Forward an image, screenshot, PDF, or text message to the private bot. Tandem stores the source in Supabase, extracts care details with OpenAI, and sends back a Save All / Ignore preview. Pending items are visible in `/inbox`.

Telegram must be linked from a signed-in Tandem account before forwarded items are accepted. In Settings, use **Connect Telegram** to generate a short-lived `/start <token>` link for the active care recipient. The webhook validates the token, links the Telegram sender to the Tandem user and care circle, then stores future forwarded items against that care circle.

Recommended bot commands:

```text
start - Connect Tandem or show link status
status - Show linked Tandem care space
recipient - Show active care recipient
unlink - Disconnect Telegram from Tandem
```

For production, prefer token-based linking over `TELEGRAM_ALLOWED_USER_IDS`. The allow-list is useful for demos, but every accepted Telegram sender should still resolve through `telegram_users -> users -> circle_members -> care_circles`.

## Project Structure

```text
app/
  api/
    ai/
      extract/                Document extraction
      handover/               Legacy AI briefing
      care-history-chat/      Health-page Q&A with citations
      meeting/                Meeting summarizer
      voice/                  Voice-to-task
    telegram/                 Webhook capture
    demo-data/                Supabase-backed loader with local fallback
  page.tsx                    Splash + patient selector + dashboard
  inbox/                      Forwarded item review queue
  dashboard/                  Family Care Hub
  timeline/                   WhatsApp-like structured feed
  tasks/                      Task board (with handover-active banner)
  capture/                    Image-to-record and voice-to-task
  handover/
    page.tsx                  Patient-centric Health page (4 sections)
    [handoverId]/page.tsx     Incoming caregiver 5-tab wizard
    [handoverId]/complete/    Completion screen (real or simulated)
    legacy/                   Old AI briefing flow
  meeting/                    Meeting assistant
  load/                       Care-load visibility
  settings/                   Demo settings, reset, and Wrapped links
  wrapped/[memberId]/         Caregiver Wrapped experience
components/
  ui/                         shadcn-style primitives
  providers/                  Local demo state provider (members, sessions, etc.)
  handover/                   Health page sections, QR display, incoming wizard
  wrapped/                    Wrapped cards (Cover, Tasks, ThankYou, etc.)
lib/
  ai/                         Schemas, OpenAI helper, mock outputs
  supabase/                   Client/server Supabase helpers
  permissions.ts              Permission types, role defaults, labels
  handover-utils.ts           Auto-fill helpers (briefing, history, …)
  qr-handover.ts              Encrypted QR encode/decode helpers
  home-state.ts               Splash + accounts + selector persistence
  seed-data.ts                Local fallback data
supabase/
  migrations/                 SQL schema
  seed.sql                    Demo data
```

## Development

```bash
npm run dev          # next dev --webpack
npm run build        # production build
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
```
