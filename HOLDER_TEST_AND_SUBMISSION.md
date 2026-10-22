# ChogHop holder test and submission kit

Status: deployed at https://choghop.vercel.app. A consenting real holder and friend have not yet been recruited. Do not claim genuine holder acceptance or product-market fit until observed.

## Message you can send

> Hi! I built ChogHop for Chogathon: a small cooperative puzzle where your Chog carries a signal to a friend and keeps a shared adventure passport. Would you help test it for about 10–15 minutes? You keep your NFT; there is no transfer, spending approval or token payment in this flow. You sign in, solve the Keeper chart, and authorize one named friend to restore one lantern. You can then sign out while your friend finishes. Start with the wallet-free practice at https://choghop.vercel.app. If interested, we only need your public wallet address, Chog token ID and your friend's public wallet address. Recording is optional and needs your consent.

This is a draft for you to send. No outreach has been sent by Codex.

## Before the session

1. Confirm the holder consents to testing. Obtain separate permission before recording or publishing their wallet address, voice or screen.
2. Record the public holder address, genuine Chog Genesis token ID and a different friend's public address. Never request seed phrases, private keys or raw signed messages.
3. Both use separate browser profiles/devices. Use a profile with one active wallet extension to avoid the observed Chrome provider conflict.
4. Start at https://choghop.vercel.app and try practice first. Practice uses a sample character and creates no live NFT history.
5. The holder opens https://choghop.vercel.app/relay. It must say HOLDER RELAY; stop if it says MOCK COLLECTION or FIXTURE RELAY. Use Monad mainnet, chain 143.

## Real holder and friend acceptance

1. Holder connects their existing wallet and approves the sign-in message. Wallet actions and signatures are performed by their owner.
2. Holder enters their Chog token ID. The server must verify current ownership on Monad; a non-holder must be rejected.
3. Holder reads both chart clues, deduces the missing glyph/bearing and prepares either Direct or Reflected treatment. Avoid revealing the answer while testing comprehension.
4. Holder enters the friend's exact public address, checks the run/action/expiry, and signs the separate scoped guest permission.
5. Copy the fresh invitation generated on the public HTTPS site. Do not reuse localhost tickets, expired fixture invitations or another participant's link.
6. Holder signs out. Friend opens the invitation in their own browser, signs in with the named wallet, reads the environmental examples and submits a deduction. A wrong answer should not spend the permission.
7. After success, verify one app-managed passport entry for that NFT in this run, with both Keeper and Runner attributed. Refresh and confirm it persists. Reopening/retrying the used invitation must not add another entry.
8. Holder returns with their wallet, reloads the saved run and checks their contribution receipt. Start the remembered follow-up and confirm it reflects the previous Keeper treatment.
9. With a separate unused invitation, test revoke or expiry and confirm it cannot be redeemed. Do not transfer an NFT solely for this test; transfer away-and-back is already covered by automated fixture tests, not claimed as live acceptance.
10. Record commit/deployment, date/time WAT, token ID, observed outcomes and any errors in RELEASE_CHECKLIST.md. Mark untested steps Pending.

## Feedback to ask after play

- What did you think the Keeper and Runner each had to do?
- Where did you hesitate, and what did you expect to happen?
- Could you explain how the two clues led to your answer?
- Would you invite a friend for another chapter? Why or why not?
- What would make your Chog's passport worth returning to?

Capture a short anonymous observation per participant: completion or dropout stage, approximate time, hints needed, bugs, and whether they would return. Record observed behavior separately from their opinions. Share a small honest summary with judges; never invent user counts or treat product events as proof of demand. Obtain consent before sharing identifiable wallet activity. No external feedback system is required for this MVP.

## Demo recording: maximum 3 minutes

| Time | Show | Say |
|---|---|---|
| 0:00–0:15 | Observatory and ChogHop title | One Chog, two people: an owner prepares a clue, a friend completes the adventure while the owner is offline. |
| 0:15–0:35 | Wallet-free practice and both chart clues | Anyone can learn without buying an NFT or connecting a wallet. |
| 0:35–1:05 | Real holder sign-in and verified Chog | Ownership gates the genuine relay and anchors its shared history. Never label fixtures as real. |
| 1:05–1:35 | Keeper deduction, transformation, scoped ticket | The friend gets one action in one run, with an expiry. No NFT transfer or spending approval. |
| 1:35–2:10 | Owner signs out; named friend solves from examples | Demonstrate the owner-offline handoff, using two browser profiles. |
| 2:10–2:40 | Passport, refresh, owner receipt, remembered follow-up | Both contributions are attributed; the app-managed history remembers the Keeper's choice. |
| 2:40–2:55 | Public link and limitations | Monad, Supabase and Next.js. Passport history is offchain. State any remaining acceptance gaps. |

Record genuine wallet steps only after successful acceptance and recording consent. If you only have a fixture recording, label it clearly throughout and disclose that genuine-holder validation is pending. Edit waiting time for clarity, but do not present cuts or fixture accounts as proof of a real signature or verification. Keep secrets, wallet recovery material and unrelated tabs out of frame.

## Submission copy draft

**Name:** ChogHop

**Description:** ChogHop turns a Chog NFT into a shared adventure passport. Its owner deduces a signal and grants one named friend permission to complete a puzzle while the owner is offline. The result records both contributions and influences the next chapter. Wallet-free practice teaches the loop before ownership is required.

**Novelty:** A scoped, asynchronous owner-to-friend puzzle handoff anchored to a verified Chog, with remembered choices and attributed app-managed history. Do not claim an industry-first invention.

**Fun:** Environmental deduction, visible signal transformations and a lantern/passport reveal; demonstrate these in the video.

**Retention:** A follow-up uses the Chog's previous Keeper choice. Returning-player demand remains a hypothesis to validate.

**Clarity:** Immediate practice, chart/lantern role symbols, a ticket naming the guest/action/expiry, and visible simulation labels.

**Execution:** Automated permission/race/transfer/passport checks and deployed practice verification are recorded in RELEASE_CHECKLIST.md. Genuine holder acceptance remains pending until observed.

**Chog integration:** Chog NFT ownership is required to create a genuine relay and associate its history. The friend does not need to own a Chog. The MVP does not use the $CHOG fungible token.

**Links:** Public app https://choghop.vercel.app ; source https://github.com/abdraufdele/ChogHop (currently private: arrange judge access or choose public visibility before submission); demo video link Pending.

**License:** MIT for original project code; bundled font licenses are preserved.

Before submitting, check the current hackathon form for its exact required fields, repository-access requirements and upload limits. Submission is not yet sent. The video and genuine holder test still need human participants.
