# ConferenceX Ops

Thin internal Zeffy → Supabase sync for UofT AI. This is a fresh Next.js repository, separate from the `uoftaiwebsite` / `uoftai.ca` CRA marketing app.

**Zeffy owns registration, checkout, payments, e-tickets, confirmation/reminder emails and check-in.** This app only tracks payment rows internally. No buyer emails, Discord invites, custom checkout, ticket/campaign creation, check-in app, waitlists, badges, sponsor portals, Slack bots, auth SaaS or paid services.

## Run locally now (no accounts needed)

Node.js 24+, npm. Scaffolded with create-next-app, TypeScript, App Router and ESLint; the only added runtime dependency is `@supabase/supabase-js`. Styling is plain CSS, with no external fonts.

```powershell
npm install
Copy-Item .env.example .env.local
# Edit .env.local: set a strong OPS_PASSWORD; leave the other values blank for now.
npm run dev
```

Open <http://localhost:3000/ops>, sign in and see the light-theme sample preview. While Supabase is unconfigured, totals, ticket counts and the latest 50 sales use fictional rows from `lib/sample-data.ts`; both charts use aggregates of the same sample rows. The page and sections are labeled sample data, and all ticket types, prices, dates and buyer details are illustrative. The dataset contains 128 succeeded payments (CAD 6,400 gross) and six other-status payments for UI examples. Configuring Supabase switches cards, summaries and sales to database rows; database errors never fall back to samples. The charts remain labeled sample previews until connected to live aggregates. A completely unset environment still builds and shows login setup instructions. No Supabase account has been created, migration executed, webhook registered, or Vercel project connected/deployed. Restart the dev server after changing env vars.

The **Export CSV / Coming soon** button is intentionally disabled as a UI placeholder. The gated `/api/ops/export` endpoint already exists; connect the button after validating real synced data. Sample rows are never written to Supabase or included in exports; preview data is used only for the UI.

```text
npm test
npm run typecheck
npm run build
```

## Routes and environment

| Route | Purpose |
| --- | --- |
| `/` | Redirect to `/ops` |
| `/ops/login` | Shared password gate; login/logout use server actions |
| `/ops` | Server-rendered totals, succeeded counts by ticket type, latest ~50 sales |
| `/api/ops/export` | Authenticated CSV download of all attendee rows |
| `POST /api/zeffy/webhook` | Verify raw-body signature, process completed/updated payments, upsert |

| Server-only env var | Used for |
| --- | --- |
| `OPS_PASSWORD` | Shared login and signing eight-hour HttpOnly cookies; changing it invalidates sessions |
| `SUPABASE_URL` | Supabase project URL, when created |
| `SUPABASE_SERVICE_ROLE_KEY` | Server database reads/writes; never a browser key |
| `ZEFFY_WEBHOOK_SECRET` | Verify `Zeffy-Signature` |
| `ZEFFY_API_KEY` | Bearer-authenticated GET of payment state for ID-only updates |

Cookies use SameSite=Strict and Secure in production (production login requires HTTPS). CSV checks the same cookie and returns `401` without it. Missing database config returns `503` for export/write operations; no fake sales or successful dropped webhooks. Database failures show an error instead of misleading zero totals.

The handler uses Node HMAC-SHA256 over `{t}.{rawBody}`, constant-time signature comparison and a five-minute timestamp tolerance. Updates fetch `GET https://api.zeffy.com/api/v1/payments/{id}`. Successful upserts return `200`; failures return non-2xx for retry. Reference: [Zeffy API documentation](https://api.zeffy.com/api/docs).

## Remaining work

This checklist is for the whole team; tasks can be picked up independently where dependencies allow. Supabase setup and deployment can wait while local UI work continues.

- [ ] **Connect Supabase when ready.** Create a free project, run `supabase/migrations/001_attendees.sql`, and set the two Supabase env vars. Confirm RLS blocks public reads and server service-role access works (`lib/supabase.ts`).
- [ ] **Confirm Zeffy access and ConferenceX scope.** Set the Zeffy env vars when available and filter incoming payments to the ConferenceX campaign before accepting organization-wide events (`app/api/zeffy/webhook/route.ts`, `lib/zeffy.ts`).
- [ ] **Validate payment mapping with a real test payment.** Check purchaser/attendee identity, email, ticket labels, cents, currency and payment time; retain sanitized sample payloads for tests (`lib/payment-mapping.ts`).
- [ ] **Decide how to count multi-ticket orders.** The current schema stores one row per payment. Confirm whether payment counts are enough or whether quantities and ticket-level records need a follow-up migration (`lib/attendee-types.ts`, `supabase/migrations/`).
- [ ] **Finish refund and status handling.** Validate completed and ID-only updated deliveries, full/partial refunds, and the intended gross versus net revenue labels (`lib/payment-mapping.ts`, `app/ops/page.tsx`).
- [ ] **Finish delivery reliability.** Handle historical duplicate events and out-of-order deliveries without reverting newer payment state. The current unique event field retains only the latest event ID (`app/api/zeffy/webhook/route.ts`, `supabase/migrations/`).
- [ ] **Connect the charts to live data.** Replace the examples in `app/ops/mock-charts.tsx` with server-side aggregates; keep totals and ticket-type counts consistent with the agreed mapping (`lib/attendees.ts`, `app/ops/page.tsx`).
- [ ] **Enable and validate CSV download.** Connect the disabled button to `/api/ops/export`, check all expected rows/columns, retain formula escaping and cookie gating, then remove the Coming soon label (`app/api/ops/export/route.ts`, `lib/csv.ts`).
- [ ] **Check the ops experience.** Verify login/logout, expiry and password rotation, mobile layout, empty/error states, readable charts and server-only fetching (`app/ops/`, `lib/ops-auth.ts`, `lib/security.ts`, `app/globals.css`).
- [ ] **Run integration checks.** Cover invalid/stale signatures, repeated deliveries, ID-only updates, failed API/database requests and refunds. Compare totals and exported rows with Zeffy after a real test payment (`tests/`).
- [ ] **Deploy and subscribe later.** Use a separate Vercel Hobby project for this repository, the Next.js preset and server env vars. Register the public webhook for `payment.completed` and `payment.updated`, then verify the full flow. No account connection or subscription is required for local development.

Mapping assumptions are commented in `lib/payment-mapping.ts`: `amount` is cents; purchaser identity comes from `buyer`; ticket labels come from `items[].rate_title`; `created` is only a paid-time proxy. Missing fields remain null. Currency totals stay separate. Full refunds are excluded from succeeded totals; partial refunds are not deducted from gross revenue.

**Schema limits to verify with a real payment:** the requested unique payment ID means one row per payment, not per ticket/person. Multi-ticket purchases and mixed rates are grouped, so the skeleton explicitly counts succeeded payment rows. Exact ticket quantities require a follow-up mapping/schema decision. `zeffy_event_id` is the webhook event ID (not the campaign ID); it is unique, and repeat current IDs are skipped. Only the latest ID is retained, so historical replay deduplication and out-of-order completed events remain unfinished. The paginated reads are suitable for this small tool, not a transactional snapshot during concurrent writes.

With a real test payment, confirm buyer/rate/amount/currency/time fields, replay the delivery without adding a row, test an ID-only update and refund, then compare dashboard and CSV to Zeffy. Unit tests currently cover signature tampering/replay, session forgery/expiry, mapping and CSV escaping; they do not validate live Zeffy or Supabase.

**Never put secrets in client components, `NEXT_PUBLIC_*`, Git, or the marketing repository.** `.env*` files are ignored except `.env.example`. Database/API modules enforce Next.js server-only imports. Keep the associates' changes inside this ops repository and the thin-sync scope.
