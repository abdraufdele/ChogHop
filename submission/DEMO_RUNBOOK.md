# ChogHop: deadline demo runbook

Use a maximum 2:55 video. No genuine holder is available yet. Demonstrate working software without claiming the fixture relay proves live holder acceptance.

## Two environments, clearly labeled

- Public wallet-free practice: https://choghop.vercel.app — real hosted application and saved practice, simulated character and passport. Works on a phone without MetaMask.
- Full local relay: http://127.0.0.1:3000/relay?fixture_role=keeper — actual app routes and SQL, isolated test wallets, simulated ownership and chain observations. The existing fixture banner must stay visible. Never deploy this launcher or bypass ownership on the public holder route.
- Public holder route: https://choghop.vercel.app/relay — real Monad ownership gate. Real sign-in and non-owner rejection were observed; successful real-holder invitation/redemption remains unverified.

## Rehearse once, then record

1. The local launcher is `node e2e/support/dev-preview.mjs`. It changes only child-process configuration, not .env.local. Its database resets when restarted. Keep it running through rehearsal and recording.
2. Open the local Keeper link in Chrome. Use only the supplied fixture controls; no MetaMask is required. Sign in, verify sample Chog 801 and read the chart.
3. In chapter one choose Star, South, Direct, then prepare the signal. These are recording/rehearsal answers, not instructions to coach a usability test.
4. Use the supplied guest wallet address, sign the scoped permission with the fixture bridge and show the invitation's named guest, one move and expiry.
5. Click Pass to test Runner · owner offline. Point out that the acting fixture identity changed and the Keeper session ended; this is a simulation of an offline owner. Sign in as Runner and open the ticket.
6. Read both mapping examples. Select Star and South, then restore the lantern. Show the redeemed ticket and the one passport entry crediting both people.
7. Refresh to show persisted fixture history. Click Return as test Keeper, sign in, reload the run, show the contribution receipt and open The Returning Light. After a Direct first choice, its Keeper answer is Moon/East. You only need to show that the remembered follow-up exists; finishing it is optional for the video.
8. If rehearing already completed a run, create a new run using the UI or restart the fixture launcher before the final take. Do not hide a used ticket or present an old run as fresh.

## Exact recording sequence and narration

| Time | Screen | Narration |
|---|---|---|
| 0:00–0:15 | Public title and observatory | ChogHop turns a Chog into a cooperative adventure passport. The owner prepares a signal; a friend decodes it while the owner is offline. |
| 0:15–0:35 | Public practice; chart clues and role labels | Anyone can learn in wallet-free practice, including on mobile. This character and practice passport are simulated. |
| 0:35–0:45 | Local fixture banner and Keeper identity | For this complete relay demonstration I am using isolated test wallets and mock ownership. A successful real-holder relay has not yet been verified. |
| 0:45–1:10 | Keeper deduction and signal transformation | Two chart clues determine the missing symbol and direction. The Keeper chooses how to transform that signal for the next player. |
| 1:10–1:35 | Named guest ticket; handoff control | This permission names one guest, one action and one run. It expires, can be revoked and is consumed by one correct move. No NFT transfer or spending approval is needed. |
| 1:35–2:00 | Runner identity, environmental examples, solve | The Keeper session has ended. The Runner infers the transformation from examples; a wrong guess does not spend the move. |
| 2:00–2:30 | Stamp reveal, both credits, refresh, owner receipt | One passport entry records both contributions. This history is managed by the application, not minted onchain. The owner also receives a contribution receipt. |
| 2:30–2:45 | Remembered follow-up | The Returning Light chooses its variation from the Chog's previous Keeper choice. This gives the next visit a memory; long-term retention is not yet proven. |
| 2:45–2:55 | Public URL and final disclosure | Built with Next.js, Supabase and Monad. The Chog NFT gates genuine relays; the MVP does not use the $CHOG token. Real sign-in and non-owner rejection work; positive holder acceptance is pending. |

Keep a caption visible during the local portion: **FIXTURE DEMO — test wallets and mock NFT ownership; not a live holder transaction.** Keep built-in mode labels visible. Show one short truthful cut between public and local environments; do not imply it is one live session. Trim loading pauses, not security checks or failures. Do not record API settings, keys, unrelated tabs or wallet recovery screens.

## Capture and submit

1. Use a screen recorder already installed on your PC (Windows Snipping Tool screen recording is sufficient). Record the Chrome page, not the entire desktop; narrate live if your recorder supports microphone, or add narration/captions afterward. Export MP4 and check that it is no longer than three minutes.
2. Upload to your own YouTube as unlisted or Google Drive with viewer access. Test the link in a signed-out browser. Do not paste credentials or private participant information into the video or submission.
3. Use submission/choghop-banner.png and the copy in HOLDER_TEST_AND_SUBMISSION.md. App link: https://choghop.vercel.app. Demo link must be the actual uploaded video, never a placeholder.
4. The GitHub repository is private. Choose either public visibility or arrange organizer access; do not claim judges can read it until verified.
5. Include the disclosure below in Description or Judge Access Instructions. Review the completed hackathon form before its final submission.

## Paste-ready validation disclosure

The public application provides wallet-free practice and a genuine Chog Genesis ownership gate on Monad mainnet. Real wallet login and rejection of a non-owner have been checked. The accompanying complete owner-to-friend video uses explicitly labeled isolated fixture wallets and mock chain observations, exercising the actual application routes and SQL. A consenting genuine holder was unavailable before recording, so successful real-holder invitation and redemption remain pending. Passports are app-managed history, not onchain assets. The MVP does not use the $CHOG fungible token. No holder playtest results, traction or product-market fit are claimed.

## Submission gates still requiring the creator

- Retire the exposed legacy Supabase credential after its replacement has been tested, then request a final public persistence check.
- Test practice and refresh on a physical phone; no wallet extension is needed. If unavailable, disclose that only mobile viewport testing was performed.
- Record, review and upload the actual demo; provide its accessible URL.
- Decide judge access to the source repository and approve the final submission.
- A future consenting holder test remains a release-validation gap; do not disable or fake production ownership to conceal it.
