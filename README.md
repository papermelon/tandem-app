# Tandem

Tandem is a mobile-first family caregiving coordination MVP for adult children caring for an ageing parent. It combines a warm family feed, task ownership, AI-assisted capture, handovers, meeting summaries, care-load visibility, and simulated reassurance signals.

The app runs locally without Supabase or OpenAI keys. Missing environment variables automatically enable seeded local data and mock AI responses.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui-style components
- Supabase Auth, Postgres, and Storage ready
- OpenAI API routes with mock fallback
- Vercel-ready environment variables

## Local Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard).

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
```

For Vercel, set `NEXT_PUBLIC_APP_URL` to the production URL. `TELEGRAM_ALLOWED_USER_IDS` is optional; when set, use comma-separated Telegram numeric user IDs to keep the bot private.

Never expose `SUPABASE_SERVICE_ROLE_KEY` in client code. Tandem only uses it inside server routes.

## Supabase

1. Create a Supabase project.
2. Run `supabase/migrations/20260509000000_init_tandem.sql`.
3. Run `supabase/seed.sql`.
4. Create the env vars above.
5. Restart `npm run dev`.

The migration creates:

- `users`
- `care_circles`
- `care_recipients`
- `circle_members`
- `timeline_items`
- `tasks`
- `documents`
- `capture_events`
- `extracted_items`
- `telegram_users`
- `care_signals`
- `handovers`
- private Storage bucket: `documents`

## Mock Mode

When Supabase keys are absent, `/api/demo-data` returns local seeded data.

When `OPENAI_API_KEY` is absent, AI routes return realistic mock outputs:

- `/api/ai/extract`
- `/api/ai/handover`
- `/api/ai/meeting`
- `/api/ai/voice`

This keeps the demo stable for hackathon judging.

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

## Demo Script

1. Open Tandem dashboard for Ah Muay.
2. Show upcoming rehab and unclaimed transport task.
3. Upload doctor memo in Capture, or tap “Use demo memo”.
4. AI extracts summary and suggests tasks.
5. Assign transport to Ming and admin follow-up to Lina.
6. Show care load visibility: Rachel has carried most tasks.
7. Show simulated care signal: no usual morning movement.
8. Generate 7-day handover.
9. Paste family meeting notes and convert decisions into tasks.

## Safety Notes

Tandem supports family caregiving coordination and does not provide medical advice. Medication features are reminders and notes only, not clinical recommendations. AI outputs are marked for review before saving.

## Project Structure

```text
app/
  api/ai/*        OpenAI routes with mock fallback
  api/telegram    Telegram webhook capture
  api/demo-data   Supabase-backed data loader with local fallback
  inbox/          Forwarded item review queue
  dashboard/      Family Care Hub
  timeline/       WhatsApp-like structured feed
  tasks/          Task board/list
  capture/        Image-to-record and voice-to-task
  handover/       Handover generator
  meeting/        Meeting assistant
  load/           Care-load visibility
  settings/       Demo settings and reset
components/
  ui/             shadcn-style primitives
  providers/      Local demo state provider
lib/
  ai/             Schemas, OpenAI helper, mock outputs
  supabase/       Client/server Supabase helpers
  seed-data.ts    Local fallback data
supabase/
  migrations/     SQL schema
  seed.sql        Demo data
```
