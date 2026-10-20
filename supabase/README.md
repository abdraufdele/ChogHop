# Persisted practice: deployment and recovery

This migration adds only isolated practice runs and practice product events. It does not create live NFT history, wallet identities, guest permissions or passport awards.

## Configure Supabase

1. In the intended Supabase project's SQL editor, execute `migrations/202610200001_persist_practice.sql` once. It runs in one transaction and creates its own private schema, tables, RLS policies and three server-only public RPC functions. It does not modify existing project tables or Supabase-wide default grants. On subsequent deployments, add a new migration; do not rerun this initial migration over existing tables.
2. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` for local development, and as server environment variables in Vercel. Use the project's service-role key or a server secret key. Never put either key into a `NEXT_PUBLIC_` variable, client component, commit, screenshot, analytics payload or chat.
3. Set `CHOGHOP_ENVIRONMENT=development` locally and `production` for the actual release. Tests explicitly use `test`. Keep all three environments separate in reporting; ideally use separate Supabase projects for development and release.
4. Run `npm run build`, then the hosted acceptance suite. In PowerShell: `$env:CHOGHOP_E2E_STORAGE = 'supabase'`, followed by `npm run test:e2e`. Next.js reads `.env.local`; these tests write only practice records tagged `test`. This mode uses the actual Supabase Data API rather than the local test transport.

The server uses native HTTPS fetch to the Supabase Data API. PostgreSQL functions run as the invoking `service_role`; they do not use `SECURITY DEFINER`. RPC execution is explicitly revoked from PUBLIC, anon and authenticated, and granted only to service_role. The private schema is not a browser API schema. Tables have forced RLS; explicit grants and policies permit the server to load/write runs and append/read events. Neither anon nor ordinary authenticated users can call these RPCs or write records directly. Do not add `choghop_private` to the exposed Data API schemas.

On a managed network with an additional trusted certificate authority, start Node with `NODE_EXTRA_CA_CERTS` pointing to the trusted PEM bundle. npm's `--cafile` affects npm only; application HTTPS fetch needs its own trusted Node configuration. Keep certificate verification enabled.

## Atomicity and restoration

The browser holds only a random 256-bit bearer session cookie; the database stores its SHA-256 hash. A reset rotates that token, closes the old run and creates the next run with the same anonymous actor ID. Anonymous continuity does not establish a unique human. Expiry is two hours, enforced by PostgreSQL's clock. Expired or reset runs remain available to the database operator for reporting and recovery; browser access ends.

The server validates the puzzle against the saved content version and proposes a transition. One RPC locks the row, checks the expected revision and expiry, updates state and appends the product event in a single transaction. An event insertion failure rolls the entire change back. Only one completion event can exist per practice run. Failed guesses update the shared rate window without changing the puzzle revision. Refreshes are reads and create no duplicate transition events.

The persisted revision includes the simulated handoff: chart 0, signal prepared 1, Runner accepted 2, completed 3. The pure engine's own revision tracks only puzzle moves. Each row also stores `last-lantern/v1` and schema version 1. Loading reconstructs canonical engine state; incompatible content or corrupted signals fail closed without resetting or replacing saved history. Preserve the v1 content definition while active v1 runs remain. A future rule change requires an explicit version/migration.

Recorded events are `practice_started`, `practice_signal_prepared`, `practice_runner_started`, `practice_completed` and `practice_restarted`, with pseudonymous actor, run/revision, server time, environment, content version and a minimal validated choice/result payload. `practice_started` means the server created a run when the practice screen opened; it is not proof that someone interacted or reasoned through a clue. Assistance and incentives are `unknown`; invitation source is `not_applicable`; records are not seeded. Automated tests have environment `test`. No raw session tokens, signatures, wallet addresses, metadata URLs or request bodies are logged. Do not infer coaching, organic referrals, active minutes or product-market fit from these events.

## Verification limits

`npm test` executes the real migration and functions in PGlite, a PostgreSQL WASM test runtime. It tests grants/RLS, ordered events, rollback, duplicate completion, independent store proposals, expiry, shared rate limits, corrupted content and restoration from a closed on-disk database in a separate Node process. PGlite is a dev dependency and is not imported by the application. The default browser suite runs the real SQL behind a small loopback-only test transport that implements only these RPC calls; it is not Supabase Auth or a production PostgREST server. It must never be deployed. Hosted Data API and multi-connection verification remain required against the actual Supabase project.

Local verification on October 20, 2026: 55 puzzle/database/transport tests, 18 desktop/mobile browser checks in installed Chrome, lint, typecheck and production build passed. The database recovery test closed its on-disk database and restored the prepared run in a separate Node process. Hosted Supabase verification and a cloud backup recovery drill remain pending.

On this PC, bundled Chromium showed repeated stalls on a later browser context's initial page/assets, while the isolated case passed. Use `$env:PLAYWRIGHT_CHANNEL = 'chrome'` for verification here. This selects an isolated automated Chrome profile, not the user's browsing profile. Do not describe an unexecuted hosted check or the stalled bundled-browser suite as passing.

If storage is unavailable, endpoints return 503 and preserve the cookie and saved run. There is no automatic memory fallback. With missing credentials, the saved practice cannot start; use the default browser test transport for local verification until Supabase is configured.

## Backup and export before launch

Enable the Supabase project's available database backup facilities and confirm its retention/restore policy in that project's dashboard. Availability depends on the account; do not assume point-in-time recovery exists.

For an operator-controlled export, use PostgreSQL tools with the connection's standard `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` and `PGSSLMODE` environment variables. Keep passwords out of shell arguments/history and use certificate-verified TLS appropriate to the project's connection. Export the private schema to an access-controlled local destination:

```sh
pg_dump --format=custom --schema=choghop_private --file=choghop-practice.backup
```

Store the backup encrypted with restricted access; it includes pseudonymous run history and hashed bearer tokens. Keep the migration alongside it to recover the public RPC functions and grants. For a recovery drill, use a separate, empty Supabase project: apply the migration, restore **data only** into that project's empty tables, then verify a known run and event order. With its `PG*` environment variables set and its database named `postgres`:

```sh
pg_restore --data-only --single-transaction --exit-on-error --dbname=postgres choghop-practice.backup
```

Do not run this drill against a nonempty production project. A verified cloud backup/recovery drill has not been performed merely because local persistence tests pass. `practice-observations.sql` produces aggregate practice observations and distinguishes pending from ended unfinished runs; run it as an authorized operator. No retention purge is automated in this slice. Decide a retention period and take a verified backup before any manual deletion.
