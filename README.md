# ChogHop

Slices 1–2: the pure TypeScript **Last Lantern** puzzle engine and a playable Next.js arrival screen. Practice includes the Keeper deduction, direct/reflected signal, simulated invitation, Runner deduction and a clearly labeled sample passport reveal. Wallet authentication, verified Chogs, live permissions, durable runs and real passport records are not implemented yet.

## Play locally

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:3000`. Practice is on the arrival screen; no wallet, chain RPC or credentials are needed. Inspect the scene, deduce the missing mark, choose a treatment and prepare the signal. The practice ticket lets you try the Runner role yourself. Decode the received signal using both environmental examples. A completed practice shows a sample passport page; it awards no live entry.

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

Playwright starts the production build on port 3000, or reuses a server already there. Close unrelated servers on that port first. The suite runs desktop and mobile Chromium, both treatments, invalid answers, refresh, keyboard controls, a 320px viewport, reduced motion, failed requests, expired sessions and API integrity checks. Screenshots and timing attachments go to ignored `test-results/`. If bundled Chromium cannot launch on a managed PC, `PLAYWRIGHT_CHANNEL=chrome` selects an existing Chrome installation (PowerShell: `$env:PLAYWRIGHT_CHANNEL = 'chrome'`).

## Practice storage and limitations

Practice state is server-owned, bounded to 256 process-local sessions and expires after two hours. An opaque, HttpOnly, SameSite=Strict cookie scoped to `/api/practice` identifies the session. Production cookies are Secure. Browser actions contain a proposed move and expected revision; client completion flags cannot complete a run. Rejected moves leave the current state unchanged. A modest server limit allows 12 attempts per 30 seconds. Inspecting objects or changing controls makes no server attempt.

Refreshing resumes while the same server process retains the session. Restarts, capacity eviction, different server instances or expiry can reset practice; the UI explains the reset. This is **not durable storage or a production multi-instance deployment**. Persisted runs and product events belong to slice 3. Practice has no Supabase tables, wallet records or passport awards and cannot write live history. Its ticket is explicitly simulated, with the inviter, recipient role, sample character, move and expiry shown.

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
