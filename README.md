# ChogHop

Slices 1–5 implementation: the **Last Lantern** puzzle engine, illustrated wallet-free practice, persisted revisions, Supabase Web3 authentication, scoped owner-to-guest relay, app-managed NFT passport and owner contribution receipt. **The Returning Light** continues from the Chog's recorded Keeper choice. Local verification uses isolated fixture wallets, chain observations and PostgreSQL; genuine Supabase/Monad acceptance remains pending. Practice stays separate and awards no live history.

## Play locally

For a wallet-free fixture preview of the full relay, run `node e2e/support/dev-preview.mjs` and open `http://127.0.0.1:3000/`. This starts Next dev, an in-memory PostgreSQL fixture and a local test-wallet bridge, overriding configuration only in child-process environments. It does not change `.env.local`. Ports 3000, 3001 and 54329 must be free. Records reset on restart; never deploy this test launcher.

Start practice at `/`, then Keeper at `/relay?fixture_role=keeper`. The page labels the acting test wallet and supplies sample Chog `801` and the correct guest address. Sign in, solve the Keeper chart, prepare the signal and sign one guest move. Click **Pass to test Runner · owner offline**: it signs the Keeper out, changes the fixture account and opens the invitation. Sign in as Runner, open the ticket and infer the lantern from both examples. No URL editing, extension or real wallet is needed. The offline owner is a simulation of this browser session ending; other browser profiles are independent. The invitation, Runner and earned passport share one route. Use **Return as test Keeper** to sign back in, resume the saved run, read the owner receipt and open the follow-up. Fixture actor switching clears local fixture auth/connection state. Each launcher start gets a new bridge identity, so stale fixture sessions are cleared after a restart while unrelated cookies are retained. Records reset when the launcher restarts.

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
- The engine does **not** enforce participant identity, ownership, expiry, transactional concurrency or award uniqueness. The relay service and SQL gateway enforce identity, permissions, revisions, completion and passport uniqueness.
- No network access, randomness, clock, NFT metadata or collection address is used. These variants are authored puzzle content, not claims about real Chog traits.

The approved product plan remains at `C:\Users\PC\OneDrive\Documents\ChatGPT\chogathon 5\CHOGHOP_PLAN.md`.

## Live relay setup and limits

Open `/relay` after configuring the server. The default unconfigured screen labels the mock collection state and refuses live actions. Supply the variables in `.env.example`: rotated server-only Supabase service key, public publishable key, canonical app origin, Monad RPC/chain ID, actual collection address, ERC721 standard and deployment block. Enable Ethereum Web3 in Supabase Auth and allowlist the actual app URLs. Apply migrations 0001, 0002 and 0003 in order. No sample address is treated as a real collection. Existing EOA wallets and ERC-721 collections are currently supported; other standards fail closed.

Connect an injected wallet, sign the login message, enter your Chog token ID and verify ownership. Prepare the chart, name a different wallet, then sign the separate EIP-712 permission. It binds app origin/environment, chain/collection/token, expedition/run, signal hash/revision, ownership generation, nonce, allowed move, one-use budget and server-clock expiry. The collection anchors the signing domain; no custom contract, transaction or NFT approval is involved. Send the invitation link yourself. Its named guest signs in independently and solves the Runner stage while the owner is offline. Wrong deductions keep the move unused. Twelve attempts per thirty seconds are enforced across workers. Refresh restores the run and the owner's active invitation/revoke control.

PostgreSQL enforces one active permission and one successful guest contribution per NFT per expedition. Owners can revoke unused invitations or change the prepared signal, ending earlier permissions. Redemption atomically rechecks scope, expiry, revocation, revision and ownership generation, consumes the permission, saves both contributors, awards the passport and appends completion. Private tables have forced RLS and explicit grants. Browser roles cannot invoke the privileged RPC. Verified wallet identity comes from Auth `getUser()` identities, never editable user metadata. No raw signatures or credentials are stored in events.

A token's first use establishes a finalized ownership checkpoint before any permission can exist. Every later issuance/redemption scans all intervening ERC-721 transfers and checks historical `ownerOf` at that checkpoint. A monotonic generation invalidates away-and-back transfers. Each request scans at most eight provider-sized log windows and persists progress. Incomplete, unsupported, reorged or unavailable history fails closed. Default log span: ten blocks; raise it only to the configured provider's supported range. After long inactivity, repeat the selection/action to continue synchronization. Confirm archival/log access and finalized block tags against the real collection before advertising live permissions as transfer-safe. Checks observe finalized state, not pending transactions; Monad and PostgreSQL cannot form one atomic transaction, so a transfer after observation cannot be synchronously prevented. Previously valid completions remain recorded.

Portraits accept only exact operator-allowlisted public HTTPS hosts, 64 KiB JSON and 4 MiB raster images. Redirects, SVG, credentials, literal IPs, data/IPFS URLs and unsupported hosts are rejected. Missing portraits retain token identity. Allowlisted domains remain an operator trust boundary, including DNS rebinding; never allow arbitrary user domains. Portraits cannot authorize a move.

The isolated browser transport simulates Auth and Monad while running the actual SQL. It is never a production fallback or evidence of genuine Supabase Auth, production PostgREST concurrency or real holder acceptance. Relay fixture journeys are skipped in hosted mode; perform the genuine two-wallet acceptance manually after supplying configuration and migration 0003. Wallet/RPC outages preserve saved progress. The full analytics funnel and deployed holder acceptance remain pending.

Wallet pins: wagmi 3.7.8, viem 2.57.7, TanStack Query 5.104.5, Supabase JS 2.118.0 and SSR 0.12.7. The environment selects Monad mainnet or testnet; wallet network advertisements use viem's corresponding public network definition, while authoritative reads use only the server's configured RPC. Vite 8.3.4 is explicitly pinned for Vitest. Use the recorded `--legacy-peer-deps` install mode with the lockfile; type/runtime/browser checks verify this selected combination.

## Passport, receipt and remembered follow-up

After migrations 0001 and 0002, apply `supabase/migrations/202610210003_passport_and_followup.sql` once. It adds the passport, backfills previously saved qualifying completions using their original contributor/date fields, and extends the existing permission gateway without editing either applied migration. A database constraint enforces one entry per `(run, chain, collection, token)`. Passport insertion runs inside the completion transaction: if it fails, the move, permission consumption, completion and event roll back. Repeated award delivery is idempotent. The owner receipt is a projection of the same immutable entry, so it cannot award a second stamp.

The passport shows the actual owner and guest wallets, prepared treatment/signal, restored lantern/bearing, chapter and server completion time. It survives refresh and remains associated with the NFT after transfers. Original contributors retain their story; a newly verified current owner can use **Read Chog passport** to inspect its token history. Only the recorded Keeper receives the owner receipt. Records are app-managed, not onchain. Fixture records are labeled test data. Practice never contributes passport entries.

The original Keeper can open **The Returning Light** while still verified as owner. The database chooses authored variant `last-lantern-02` after a recorded direct choice and `last-lantern-03` after reflected. These are equivalent, solver-verified configurations with different visible charts. The remembered choice appears in the room. Browser-supplied choices/variant IDs cannot select the continuation. One continuation per first run is enforced by a unique parent-run constraint; refresh/repeated starts recover it. Its guest scope and contribution budget use a separate expedition identity, and it earns its own chapter stamp. No third chapter or unlimited retention claim is implied.

Live solo completion is deliberately unavailable: an owner cannot redeem their own invitation. Tests race an owner/solo attempt against the named guest and assert exactly one qualifying shared entry. No separate solo-completion feature was added. Replays, competing guest redemptions, duplicate awards, award failure rollback and upgrade/backfill are checked against the actual SQL. Full cloud recovery and genuine holder journeys remain release gates.


## Release preparation and acceptance

Migrations 0001, 0002 and 0003 are applied in the intended Supabase project, as confirmed by the operator on October 21, 2026. Slice 6 introduces no migration. The fixture launcher applies those same files to its isolated in-memory PostgreSQL database. This confirmation does not substitute for hosted end-to-end acceptance.

Practice is a simulated solo walkthrough with original sample art, separate cookies, tables and product events. It issues no wallet permission and earns no holder passport. Fixture relay uses public test wallets and simulated Auth/Monad responses with real application routes and SQL; all scenes and earned records are labeled. An unconfigured collection shows a mock label and cannot issue holder permissions. Metadata images may be unavailable; token identity remains visible. No production traction, live ownership success or human usability study is claimed.

For a real-holder rehearsal, stop the fixture launcher, configure the canonical application origin, Supabase Web3 authentication, actual collection/RPC/deployment block and server-only credentials as described above, then build and start the normal application. The owner connects an existing EOA holding a Chog and verifies its token ID. After preparing a signal, they enter the friend's actual wallet and sign the scoped permission. The friend opens the invitation on the canonical origin in their own browser/wallet, signs in, checks the named guest and expiry, and solves without the owner online. Return as owner to verify the receipt and remembered second chapter. Live Monad verification and this genuine two-wallet acceptance remain pending.

A permission ends after its one correct redemption, server-clock expiry, owner revocation, a changed signal/revision, or a detected ownership-generation change (including transfer away and back). An incorrect answer does not consume the move. Expired/revoked tickets remain readable and direct the guest to request a fresh invitation. A declined signature authorizes nothing. Network failures preserve selected answers and saved runs; retry the action or reload the saved run if the response was lost. Server checks remain authoritative even if browser clocks or displayed states differ.

Holder passports, immutable contributor records, receipts, runs and events live in private Supabase Postgres tables with RLS and server-only grants. A receipt projects the same shared entry, and the DB prevents duplicate awards. A passport is app-managed NFT history, not an onchain stamp, transferable asset or token reward. The two authored chapters are the complete content set; no third chapter, audio, hint ladder or contribution replay has been added. CSS motion honors reduced motion; all information is available without animation or sound. Production deployment and authentic holder verification are separate release gates.


### Slice 6 verification

The production desktop/mobile suite covers both practice treatments, refreshed runs, the owner-offline relay and follow-up, empty passports, loading feedback, rejected signatures, network failures, and expired/revoked tickets. Presentation-only ended-ticket cases use explicit response fixtures; permission enforcement and award races are tested separately against the real SQL. The mobile action tray stays in document flow so it cannot cover the clue controls. Browser screenshots are written to ignored `test-results/`.

With the fixture preview running, `node e2e/support/check-preview.mjs` separately checks the actual one-button Keeper logout and Runner switch at 1440px and 320px, keyboard focus, reduced motion, stale-session cleanup and preservation of unrelated cookies. This script requires installed Chrome and uses only disposable local fixture records. Stop the preview before `npm run test:e2e`, which owns ports 3000 and 54329. The checked body, muted, ticket, action and success foreground/background pairs exceed 4.5:1 contrast; this is not a claim of a formal accessibility audit.


Verified October 21, 2026: **87 unit/database tests**, **28 production desktop/mobile browser checks**, lint, typecheck and production build passed. The separate preview check passed at **1440px and 320px**, including stale fixture session cleanup, unrelated-cookie preservation, keyboard focus, owner logout, Runner handoff, passport award, reduced motion and no horizontal clipping. Mobile screenshots were inspected. All chain/Auth responses in these runs were fixtures; genuine Monad holder and hosted Supabase end-to-end acceptance remain pending. Migration 0003 being applied is operator-confirmed, not an independently observed hosted acceptance result.
