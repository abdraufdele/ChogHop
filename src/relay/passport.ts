import type { Mark,Treatment } from '../puzzle/grammar';

export type PassportEntry = {
  id: number; runId: string; tokenId: string; collection: string; chainId: number;
  expedition: string; title: string; keeperChoice: Treatment; keeperMark: Mark;
  signal: Mark; restoration: Mark; owner: string; guest: string;
  completedAt: string; environment: string; story: string;
};
export type Passport = { entries: PassportEntry[]; entry: PassportEntry|null; receipt: PassportEntry|null };
export const shortWallet=(wallet:string)=>`${wallet.slice(0,6)}…${wallet.slice(-4)}`;
