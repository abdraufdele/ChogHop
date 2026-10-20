import type { KeeperView, RunnerView } from '../puzzle/engine';
import type { Mark, Treatment } from '../puzzle/grammar';

type Base = Readonly<{ mode: 'practice'; runId: string; contentVersion: string; expiresAt: number; revision: number }>;
export type PracticeSnapshot = Base & (
  | Readonly<{ stage: 'keeper'; puzzle: KeeperView }>
  | Readonly<{ stage: 'handoff'; prepared: Mark; signal: Mark; treatment: Treatment }>
  | Readonly<{ stage: 'runner'; puzzle: RunnerView }>
  | Readonly<{ stage: 'complete'; restoration: Mark; signal: Mark; treatment: Treatment }>
);
export type PracticeReply = Readonly<{
  snapshot?: PracticeSnapshot;
  error?: string;
  restarted?: boolean;
}>;
