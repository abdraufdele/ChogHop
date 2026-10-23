# ChogHop release checklist

## Prepared locally

- Reviewed application and MIT license are committed.
- Vercel build/install commands are recorded in `vercel.json`; deploy the Next.js app, never the fixture launcher.
- `.env.local` is ignored by Git and must remain local. Do not paste credentials into chat, issues, videos or this checklist.
- Migrations 0001–0003 are operator-confirmed applied; no new migration or reapplication is required.
- Prior verification: 87 unit/database tests, 28 desktop/mobile browser checks and separate 320px/1440px fixture handoff checks passed. These are not hosted holder acceptance results.

## Account and configuration prerequisites

- [x] GitHub CLI authentication verified as abdraufdele; initial repository visibility is private.
- [x] Reviewed branch pushed to private repository https://github.com/abdraufdele/ChogHop (default branch: codex/puzzle-engine).
- [x] Personal Vercel account abdraufdele selected; choghop project created and linked.
- [x] Supabase project confirmed; Ethereum sign-in toggle verified enabled in the Web3 Wallet provider settings.
- [ ] Previously shared service-role credential has been rotated; enter the replacement directly into private Vercel settings.
- [x] Public Supabase publishable key is configured; operator reported successful real-wallet sign-in.
- [x] Public-chain preflight passed: mainnet, collection bytecode, ERC721 interface, finalized block/historical interface read and recent Transfer logs. Holder-specific historical ownerOf remains pending.
- [x] Configured collection has code and supports ERC721. The fallback public RPC returned no code immediately before the configured deployment block and code at that block.

## Deployment

1. Import the repository into Vercel using the Next.js preset and the repository root.
2. Use Node 22.x; compare the actual hosted runtime/build output with the local verification setup.
3. Enter the real service/chain settings listed in `.env.example`, using `CHOGHOP_ENVIRONMENT=production` for final release. Never enable `CHOGHOP_FIXTURE_PREVIEW` there.
4. Choose a stable HTTPS origin. Set `CHOGHOP_APP_ORIGIN` to that exact origin without trailing slash and configure the corresponding Supabase Site/allowed application URLs.
5. Redeploy after environment changes. Keep rehearsal/production configuration and records distinct.
6. Check public access in an unauthenticated browser. Do not submit an inaccessible protected preview URL.

## Before inviting the holder

- [x] Public practice completed and restored after refresh, including a fresh 320px browser session.
- [x] Deployed practice completed at 320px using keyboard radio controls; 320px and 390px layouts had no horizontal overflow. This is viewport emulation, not a physical-phone claim.
- [x] Operator confirmed real-wallet sign-in and the expected rejection for genuine Chog #801, whose finalized owner was independently checked to be different.
- [x] Deployed holder page says HOLDER RELAY; inspected page had no fixture bridge script or test-actor label. Practice is visibly simulated.
- [ ] Owner has the public app/source links, short instructions, actual Runner wallet address and optional recording consent request.
- [ ] Fresh invitations are created on the final origin, not copied from localhost or another hostname.

## Genuine holder acceptance record

Fill this in only from observations. Do not put private credentials or signatures here.

| Item | Observation |
|---|---|
| Commit and deployment URL | Pending |
| Date/time/timezone | Pending |
| Network and collection | Pending |
| Consenting holder's token ID | Pending |
| Real owner sign-in and verified ownership | Pending |
| Scoped invitation to a different real wallet | Pending |
| Owner signs out; guest completes independently | Pending |
| One passport entry, both contributors, survives refresh | Pending |
| Owner receipt and remembered follow-up | Pending |
| Unused revoked/expired invitation rejected | Pending |
| Limitations and follow-up issues | Pending |

The NFT remains with its owner. This flow requires identity/permission signatures, not an NFT transfer or spending approval. Live Monad/hosted Supabase verification remains pending until this checklist is observed on the deployed app.

## Preparation observations — October 22, 2026

- Git working tree was clean at preparation start. No Git remote or linked Vercel project was present, Vercel CLI was unavailable, and GitHub CLI API authentication returned 401. Owner account access and destination repository are required before upload/deployment.
- The configured RPC worked using Node's system CA store with TLS verification enabled. The configured provider did not establish the old deployment boundary; the supplied fallback public RPC did. Only pass/fail observations were printed; no configuration values or secrets were logged.
- The Supabase publishable key was absent from local configuration. A public Auth-health request without a key returned 401, so hosted Auth configuration/Web3 enablement remain unverified. No service-role credential was used for the checks.
- The owner must rotate the previously shared service-role credential and enter the replacement into private hosting settings. No `.env.local` edit was made.
- Vercel install/build settings are prepared locally. Deployment, canonical-origin configuration, real-wallet sign-in/non-holder rejection and genuine-holder acceptance are not yet completed.

Local preparation verification on October 22: lint, typecheck and production build passed. `.env.local` is absent from tracked files and its Git path history. A limited literal credential-pattern scan of tracked HEAD found no matches; this is not a comprehensive secret audit. No deployment or hosted wallet acceptance has occurred.

## Hosting setup continuation — October 22, 2026

- Vercel CLI 65.1.0 authenticated as abdraufdele; choghop project creation and linking verified. GitHub CLI authentication also verified.
- Vercel CLI unexpectedly appended an OIDC-token section to .env.local during linking. That generated section was removed without printing its value or changing existing settings. Future deployment steps must not pull development environment settings.
- The existing local publishable key uses SUPABASE_PUBLISHABLE_KEY; production must expose the same public key under the application-required NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY name.
- The operator explicitly chose to retain the previously shared service-role credential for this deployment. It is stored only as a server-side Production Secret; no NEXT_PUBLIC service credential exists. Credential rotation remains outstanding.
- No public deployment or real-wallet acceptance is claimed by these account/setup checks.

Deployment preparation verification: all 87 tests, lint and typecheck passed again; slice 6 is committed as aee9d55. Vercel project runtime is confirmed 22.x and the assigned production hostname is choghop.vercel.app. Required Production environment variable names are configured; the public publishable key is mapped from its existing local name without editing the file. Source deployment attempts failed before upload with fetch/socket errors. Git-based fallback requires the owner to approve the Vercel GitHub App for only ChogHop. No hosted practice/console acceptance is claimed yet.

## First production smoke check — October 22, 2026

- Saved and reloaded GitHub App settings: Vercel has Only select repositories enabled with exactly abdraufdele/ChogHop selected (installation 174195050).
- Connected repository production deployment dpl_GEBpCtHWFfcqgny8er394cdMXc33 built commit 3c761fa and reached Ready. Public alias: https://choghop.vercel.app. Hosted runtime is Node 22.x (Vercel selected 22.23.4 / npm 10.9.9, rather than the local exact patch pins).
- Hosted direct practice completed in Chrome; hosted reflected practice completed in the extension-free in-app browser. Both revealed the correctly labeled practice passport. No real NFT history was awarded.
- Chrome reload initially showed a network-recovery state; Reload practice restored the completed saved run. Chrome logged wallet-extension conflicts; filtering extension-source entries showed no app errors. The extension-free reflected-flow console returned no errors.
- Supabase Site URL should be https://choghop.vercel.app and Redirect URLs should include https://choghop.vercel.app/**. Operator confirmation of those settings and real-wallet/holder acceptance remain pending.
- Service role remains a server-only Production Secret at the operator explicit request; credential rotation remains outstanding. No local environment-file edit was made during production deployment or smoke checks.

## Holder-readiness configuration — October 22, 2026

- Supabase Site URL saved as https://choghop.vercel.app and redirect allowlist saved with https://choghop.vercel.app/**. The saved values were observed in the dashboard; Ethereum sign-in was already enabled in the provider detail panel.
- Live /relay initially displayed Mock collection. Boolean configuration validation identified a collection-standard mismatch; corrected only Vercel Production CHOG_COLLECTION_STANDARD to the adapter-supported ERC721 value, then rebuilt. Local .env.local remains unchanged, so the local mismatch must be resolved by the operator separately if using live mode locally.
- Deployment dpl_GNBQ8rs6NDfxC9N2g3JErYE75qX2 now serves the public alias with HOLDER RELAY and the wallet sign-in entry. This verifies configuration and rendering, not genuine ownership, wallet authentication or invitation redemption.
- The operator has no consenting holder/friend recruited yet. HOLDER_TEST_AND_SUBMISSION.md contains an unsent invitation draft, the real acceptance procedure, feedback questions and honest demo/submission drafts. Real login signatures and holder acceptance remain pending.

## Wallet login hardening

- Login now accepts request-only EIP-1193 providers and binds event methods only when they exist. Raw provider/Auth messages and signed data are never echoed into the UI.
- Added specific fixed copy for URI/domain rejection, declined signatures, missing providers, rate limits, disabled Web3, invalid public-key configuration, network errors, invalid signatures and chain-switch failures.
- Supabase Auth log for the earlier failed attempt reported a disallowed signed-message URI and localhost referrer; this is not proof of the exact browser URL. The operator reports adding the production URL and wildcard. A fresh real signature on the canonical production origin is still required.
- Verification: 91 unit/database tests and 30 desktop/mobile Playwright checks passed, including the precise URI-rejection case. Lint, typecheck and production build passed. These tests use isolated fixture wallets and PostgreSQL; genuine live login and holder-to-friend acceptance are not claimed.
- No environment-file edits or credential output were made for this fix.

## Pre-volunteer checks and identity compatibility

- The operator supplied a real public sign-in address and reported reaching Chog token selection. A finalized ownerOf read established that genuine Chog #801 exists and has a different owner. The operator retry returned wallet_identity_required before NFT ownership comparison; non-owner rejection is therefore still Pending.
- Public Supabase Auth source establishes that wallet claims are nested under identity_data.custom_claims: https://github.com/supabase/auth/blob/master/internal/api/provider/provider.go and https://github.com/supabase/auth/blob/master/internal/api/web3.go. The parser now reads that verified identity shape, retains compatible flat identities, and rejects wrong network/provider/subject, malformed or conflicting claims and ambiguous identities. Editable user_metadata is never used as identity proof. Fixtures now emit the hosted shape.
- The broad administrative user-list diagnostic was rejected by automatic review and was not executed. The fix used public provider source and isolated regression tests; no other users were inspected.
- Fresh public practice at 320px passed Keeper/Runner completion, keyboard radios, stage-heading focus, persistence after refresh, visible simulation labels and no horizontal overflow. The completion and holder entry also fit 390px. The extension-free console returned no errors. Viewport overrides were reset.
- Volunteer handout now contains links, a proposed real Runner address awaiting confirmation, separate login/permission explanations, a direct-reply problem-report process and an explicit recording choice. Participants, consent and scheduling remain pending.
- The previously shared service credential remains in use at the operator prior request. Rotation is not marked complete; the operator must perform the credential change and enter the replacement privately before treating that original release requirement as met.

Identity compatibility verification: all 95 unit/database tests, all 30 desktop/mobile browser checks, lint, typecheck and production build passed with nested-claim fixtures. The subsequent operator production retry confirmed the expected non-owner rejection. No migration or local environment edit is required.

## Confirmed pre-holder outcome

- Production identity fix 1999ad0 reached Ready at https://choghop.vercel.app. After refresh, the operator retried genuine Chog #801 and reported: This wallet is not the verified current owner of this Chog. This completes the real sign-in/non-owner rejection gate; it is not successful holder authorization.
- Public site, configuration, practice/persistence, mobile viewport/keyboard, real sign-in, non-owner rejection and visible non-fixture holder entry have now passed the recorded pre-volunteer checks. No new migrations are required.
- Still human-dependent: confirm the proposed Runner address before an invitation is signed; recruit a consenting genuine holder and record their own token ID/public address; arrange the session and optional recording consent; complete the holder-to-friend positive acceptance. Create fresh 30-minute invitations only during the session on the canonical origin.
- Credential rotation remains an outstanding original release requirement: the existing service-role key was retained at the operator earlier instruction. No replacement has been provided or claimed.

## Credential replacement deployment — October 23, 2026

- Operator reported saving the replacement credential directly in Vercel Production. Redeployed without reading or printing credential values; `.env.local` was not modified.
- Deployment dpl_GVPRU6Y8hRdSR5JDEiP8x2kVYywK reached Ready and serves https://choghop.vercel.app (deployment URL: https://choghop-3p0t4l5hp-abdraufdele.vercel.app).
- A fresh public practice completed Keeper signal preparation, Runner handoff and correct restoration; its explicitly simulated passport returned after refresh. This exercises hosted database reads and writes with the deployed configuration. No real NFT award was created.
- Browser error entries were limited to the existing MetaMask provider conflict with another wallet extension; no application-source errors appeared in the inspected log. A single-wallet-extension browser profile remains recommended for the real session.
- Credential retirement is not confirmed: creating/replacing a key does not revoke the exposed legacy service-role key. The operator must deactivate the legacy key after migrating any other consumers, then the public database flow must be checked again.
- Operator selected a different Runner address, still to be supplied. Their report that they do not have a phone/holder is awaiting clarification; physical-device testing and genuine-holder acceptance remain pending. No new migrations or code changes were required.
