# ChogHop

Slices 1–4 implementation: the pure TypeScript **Last Lantern** puzzle engine, illustrated wallet-free practice, persisted revisions, Supabase Web3 authentication and a scoped owner-to-guest relay. Local verification uses isolated fixture wallets, chain observations and PostgreSQL; genuine Supabase/Monad acceptance is pending configuration. App-managed NFT passports and owner receipts remain slice 5. Practice stays separate and awards no live history.

## Play locally

```sh
npm ci --legacy-peer-deps
# Configure .env.local and apply the Supabase migration first; see supabase/README.md.
npm run dev
```

Open `http://127.0.0.1:3000`. No player wallet, sign-in or chain RPC is needed. The server needs Supabase configured as described in `supabase/README.md` and `.env.example`; missing storage returns a recoverable error rather than silently using memory. Inspect the scene, deduce the missing mark, choose a treatment and prepare the signal. The practice ticket lets you try the Runner role yourself. Decode the received signal using both environmental examples. A completed practice shows a sample passport page; it awards no live NFT history.

The illustration and sample character Pip are original layered SVG. Fredoka and Nunito Sans are bundled and self-hosted via Fontsource, with SIL Open Font License notices in `LICENSES/`. Practice uses no remote artwork. Configured live portraits use constrained collection metadata, never ownership authority. No audio is included. Reduced-motion preferences disable signal and stamp animations.

## Run the checks

Use Node **22.19.0** and npm **10.9.3**. Direct tool dependencies are pinned; transitive dependencies are locked in `package-lock.json`.

```sh
npm ci --legacy-peer-deps
npm test
npm run lint
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```

If a managed network needs a custom CA, pass its trusted PEM through npm's `--cafile` option. Local certificate bundles and caches are ignored. Certificate verification stays enabled.

The default Playwright suite starts the production app on port 3000 and a loopback PostgreSQL test transport on port 54329. Close unrelated servers on those ports first. It requires no cloud credentials. The transport runs the exact migration and real PostgreSQL functions in PGlite; it is test-only, is not Supabase Auth/PostgREST, and is not a production fallback. The suite runs desktop/mobile Chromium, both treatments, invalid answers, refresh, keyboard controls, a 320px viewport, reduced motion, failed requests, expired sessions, lost successful responses, storage outages and API integrity checks. Screenshots and timing attachments go to ignored `test-results/`. If bundled Chromium cannot launch on a managed PC, `PLAYWRIGHT_CHANNEL=chrome` selects existing Chrome (PowerShell: `$env:PLAYWRIGHT_CHANNEL = 'chrome'`). To test the actual hosted Supabase integration, set `$env:CHOGHOP_E2E_STORAGE = 'supabase'` and rerun with `.env.local` configured; all acceptance records are tagged `test`.

## Practice storage and limitations

Practice state is server-owned in separate private Postgres tables, with an opaque HttpOnly, SameSite=Strict cookie scoped to `/api/practice`. Production cookies are Secure; only the session token's hash is stored. Two-hour expiry and 12-attempt/30-second limits use the database clock and persist across app workers. Browser actions contain a proposed move and expected revision; client completion flags cannot complete a run. Rejected moves leave puzzle state unchanged. Inspecting objects or changing controls makes no server attempt.

Refreshing restores the persisted stage, signal, handoff and completion; the application process holds no practice Map. Each accepted transition and its product event commit in one row-locked database transaction. Content/schema versions are recorded and checked. Unsupported or corrupt saved state fails closed; an outage does not replace a saved run. A reset closes the old run and retains its history. The sample ticket shows inviter, recipient role, character, allowed move and expiry; it issues no wallet permission. Practice has no live wallet, guest-permission or NFT passport records. See `supabase/README.md` for grants/RLS, event definitions, test limits, backup/export and hosted acceptance instructions. The local SQL checks do not establish that a real Supabase project has been configured or a cloud recovery drill has passed.

Automated chart-inspection timings are recorded under local test conditions against the 30-second interaction target. They are not evidence of independent human comprehension, fun, traction or product-market fit. Five independent puzzle playtests remain outstanding.

## Puzzle rules

The chart has three ordered slots and three glyphs: sun, moon, star. Every glyph appears once. The arrow advances one quarter clockwise per slot, including wraparound. Two visible marks uniquely determine the missing glyph and bearing.

The Keeper supplies that mark and chooses **direct** (fixed rotations) or **reflected** (fixed mirror axes). Glyphs use a three-position wheel; arrows use a four-position compass. The two wheels share the treatment but have separate offsets or axes. Preparation transforms the mark into a received signal.

The Runner sees that signal and two environmental **received signal → lantern** examples. The examples uniquely identify a decoding rule. The Runner supplies the inferred lantern glyph and bearing. None of the authored examples directly gives the target glyph or target bearing.

Six hand-authored configurations each support both treatments. The solver independently enumerates 12 possible chart answers and all 24 decoding rules from visible evidence. Tests require one unique chart answer, one decoding rule and one matching restoration for all 12 variant/treatment combinations. This proves solvability within the stated grammar; human playtesting is still needed to assess fun and clarity.

## Integration boundary

- `src/puzzle/engine.ts` proposes immutable transitions: Keeper → Runner → complete. Successful transitions increment revision and return an event. Incorrect actions return an error without advancing state or emitting an event.
- `keeperView` and `runnerView` project only their role's evidence. Keep full runs, authored variants and the solver on the server when real play is integrated. Never authorize a browser-supplied run or completion flag.
- The engine does **not** enforce participant identity, ownership, expiry, transactional concurrency or award uniqueness. The relay service and SQL gateway enforce identity, permissions, revisions and completion uniqueness; passport awards remain slice 5.
- No network access, randomness, clock, NFT metadata or collection address is used. These variants are authored puzzle content, not claims about real Chog traits.

The approved product plan remains at `C:\Users\PC\OneDrive\Documents\ChatGPT\chogathon 5\CHOGHOP_PLAN.md`.

## Live relay setup and limits

Open `/relay` after configuring the server. The default unconfigured screen labels the mock collection state and refuses live actions. Supply the variables in `.env.example`: rotated server-only Supabase service key, public publishable key, canonical app origin, Monad RPC/chain ID, actual collection address, ERC721 standard and deployment block. Enable Ethereum Web3 in Supabase Auth and allowlist the actual app URLs. Apply both SQL migrations in order. No sample address is treated as a real collection. Existing EOA wallets and ERC-721 collections are currently supported; other standards fail closed.

Connect an injected wallet, sign the login message, enter your Chog token ID and verify ownership. Prepare the chart, name a different wallet, then sign the separate EIP-712 permission. It binds app origin/environment, chain/collection/token, expedition/run, signal hash/revision, ownership generation, nonce, allowed move, one-use budget and server-clock expiry. The collection anchors the signing domain; no custom contract, transaction or NFT approval is involved. Send the invitation link yourself. Its named guest signs in independently and solves the Runner stage while the owner is offline. Wrong deductions keep the move unused. Twelve attempts per thirty seconds are enforced across workers. Refresh restores the run and the owner's active invitation/revoke control.

PostgreSQL enforces one active permission and one successful guest contribution per NFT per expedition. Owners can revoke unused invitations or change the prepared signal, ending earlier permissions. Redemption atomically rechecks scope, expiry, revocation, revision and ownership generation, consumes the permission, saves both contributors and appends completion. Completion records support slice 5; they are not passport awards. Private tables have forced RLS and explicit grants. Browser roles cannot invoke the privileged RPC. Verified wallet identity comes from Auth `getUser()` identities, never editable user metadata. No raw signatures or credentials are stored in events.

A token's first use establishes a finalized ownership checkpoint before any permission can exist. Every later issuance/redemption scans all intervening ERC-721 transfers and checks historical `ownerOf` at that checkpoint. A monotonic generation invalidates away-and-back transfers. Each request scans at most eight provider-sized log windows and persists progress. Incomplete, unsupported, reorged or unavailable history fails closed. Default log span: ten blocks; raise it only to the configured provider's supported range. After long inactivity, repeat the selection/action to continue synchronization. Confirm archival/log access and finalized block tags against the real collection before advertising live permissions as transfer-safe. Checks observe finalized state, not pending transactions; Monad and PostgreSQL cannot form one atomic transaction, so a transfer after observation cannot be synchronously prevented. Previously valid completions remain recorded.

Portraits accept only exact operator-allowlisted public HTTPS hosts, 64 KiB JSON and 4 MiB raster images. Redirects, SVG, credentials, literal IPs, data/IPFS URLs and unsupported hosts are rejected. Missing portraits retain token identity. Allowlisted domains remain an operator trust boundary, including DNS rebinding; never allow arbitrary user domains. Portraits cannot authorize a move.

The isolated browser transport simulates Auth and Monad while running the actual SQL. It is never a production fallback or evidence of genuine Supabase Auth, production PostgREST concurrency or real holder acceptance. Relay fixture journeys are skipped in hosted mode; perform the genuine two-wallet acceptance manually after supplying configuration. Wallet/RPC outages preserve saved progress. Live passport/receipt and full analytics funnel remain pending.

Wallet pins: wagmi 3.7.8, viem 2.57.7, TanStack Query 5.104.5, Supabase JS 2.118.0 and SSR 0.12.7. The environment selects Monad mainnet or testnet; wallet network advertisements use viem's corresponding public network definition, while authoritative reads use only the server's configured RPC. Vite 8.3.4 is explicitly pinned for Vitest. Use the recorded `--legacy-peer-deps` install mode with the lockfile; type/runtime/browser checks verify this selected combination.
