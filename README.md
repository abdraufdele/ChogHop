# ChogHop

Slices 1–3 implementation: the pure TypeScript **Last Lantern** puzzle engine, illustrated wallet-free practice, persisted run revisions and server-recorded product events. Practice includes Keeper deduction, direct/reflected signal, a simulated invitation, Runner deduction and a sample passport reveal. Supabase configuration and hosted verification are still required; wallet authentication, verified Chogs, live permissions and real passport records are not implemented yet.

## Play locally

```sh
npm ci
# Configure .env.local and apply the Supabase migration first; see supabase/README.md.
npm run dev
```

Open `http://127.0.0.1:3000`. No player wallet, sign-in or chain RPC is needed. The server needs Supabase configured as described in `supabase/README.md` and `.env.example`; missing storage returns a recoverable error rather than silently using memory. Inspect the scene, deduce the missing mark, choose a treatment and prepare the signal. The practice ticket lets you try the Runner role yourself. Decode the received signal using both environmental examples. A completed practice shows a sample passport page; it awards no live NFT history.

The illustration and sample character Pip are original layered SVG. Fredoka and Nunito Sans are bundled and self-hosted via Fontsource, with SIL Open Font License notices in `LICENSES/`. No remote artwork or NFT metadata is used. No audio is included. Reduced-motion preferences disable the signal and stamp animations.

## Run the checks

Use Node **22.19.0** and npm **10.9.3**. Direct tool dependencies are pinned; transitive dependencies are locked in `package-lock.json`.

```sh
npm ci
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
- The engine does **not** enforce participant identity, ownership, expiry, transactional concurrency or award uniqueness. Later API/database slices must load trusted state, authorize the action and atomically compare/update revisions with permission redemption and records.
- No network access, randomness, clock, NFT metadata or collection address is used. These variants are authored puzzle content, not claims about real Chog traits.

The approved product plan remains at `C:\Users\PC\OneDrive\Documents\ChatGPT\chogathon 5\CHOGHOP_PLAN.md`.
