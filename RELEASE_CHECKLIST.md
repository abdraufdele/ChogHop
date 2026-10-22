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
- [ ] Supabase project is confirmed; Ethereum Web3 sign-in is enabled.
- [ ] Previously shared service-role credential has been rotated; enter the replacement directly into private Vercel settings.
- [ ] Public Supabase publishable key is available from the same project.
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

- [ ] Public practice completes and refresh restores progress.
- [ ] Mobile/keyboard controls work on the deployed version.
- [ ] A real non-holder wallet can sign in; it cannot claim another wallet's Chog.
- [ ] No fixture account or mock collection is presented as genuine ownership.
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
