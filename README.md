# ChogHop

Slice 1: the pure TypeScript **Last Lantern** puzzle engine. No browser application, wallet integration, database, permissions or passport awards exist yet.

## Run the checks

Use Node **22.19.0** and npm **10.9.3**. Direct tool dependencies are pinned; transitive dependencies are locked in `package-lock.json`.

```sh
npm ci
npm test
npm run lint
npm run typecheck
```

If a managed network needs a custom CA, pass its trusted PEM through npm's `--cafile` option. Local certificate bundles and caches are ignored. Certificate verification stays enabled.

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
