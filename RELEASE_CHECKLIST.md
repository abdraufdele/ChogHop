# ChogHop release checklist

## Prepared locally

- Reviewed application and MIT license are committed.
- Vercel build/install commands are recorded in `vercel.json`; deploy the Next.js app, never the fixture launcher.
- `.env.local` is ignored by Git and must remain local. Do not paste credentials into chat, issues, videos or this checklist.
- Migrations 0001–0003 are operator-confirmed applied; no new migration or reapplication is required.
- Prior verification: 87 unit/database tests, 28 desktop/mobile browser checks and separate 320px/1440px fixture handoff checks passed. These are not hosted holder acceptance results.

## Account and configuration prerequisites

- [ ] GitHub authentication works and the destination repository/visibility are confirmed.
- [ ] Push the reviewed branch to the intended repository.
- [ ] Vercel account/team and project are selected by the owner.
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
