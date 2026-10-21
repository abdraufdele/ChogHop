import { keccak256, stringToHex, type Address, type Hex } from 'viem';
import type { RunnerRun } from '../puzzle/engine';

export const EXPEDITION = 'last-lantern/v1';
export type Scope = {
  id: string; runId: string; owner: Address; guest: Address; collection: Address;
  tokenId: string; chainId: number; environment: string; origin: string;
  revision: number; signalHash: Hex; generation: number; nonce: Hex;
  issuedAt: number; expiresAt: number;
};
export function signalHash(run: RunnerRun): Hex {
  return keccak256(stringToHex(JSON.stringify([EXPEDITION, run.variantId, run.keeperMark, run.treatment, run.signal])));
}
/** An app permission only: no transaction, approval, transfer, or login authority. */
export function permissionData(scope: Scope) {
  return {
    domain: { name: 'ChogHop', version: '1', chainId: scope.chainId, verifyingContract: scope.collection },
    primaryType: 'GuestMove' as const,
    types: { GuestMove: [
      { name: 'origin', type: 'string' }, { name: 'environment', type: 'string' },
      { name: 'owner', type: 'address' }, { name: 'guest', type: 'address' },
      { name: 'tokenId', type: 'uint256' }, { name: 'expedition', type: 'string' },
      { name: 'runId', type: 'string' }, { name: 'action', type: 'string' },
      { name: 'revision', type: 'uint256' }, { name: 'signalHash', type: 'bytes32' },
      { name: 'generation', type: 'uint256' }, { name: 'nonce', type: 'bytes32' },
      { name: 'issuedAt', type: 'uint256' }, { name: 'expiresAt', type: 'uint256' },
      { name: 'uses', type: 'uint256' },
    ] },
    message: {
      origin: scope.origin, environment: scope.environment, owner: scope.owner, guest: scope.guest,
      tokenId: BigInt(scope.tokenId), expedition: EXPEDITION, runId: scope.runId,
      action: 'lantern.restore', revision: BigInt(scope.revision), signalHash: scope.signalHash,
      generation: BigInt(scope.generation), nonce: scope.nonce, issuedAt: BigInt(scope.issuedAt),
      expiresAt: BigInt(scope.expiresAt), uses: 1n,
    },
  };
}
