import 'server-only';
import { createPublicClient, http, parseAbi, parseAbiItem, zeroAddress, type Address } from 'viem';
import type { CollectionConfig } from './config';
import { RelayError } from '../relay/errors';

export type Asset = { id: string; generation: number; cursor: number; block_hash: string | null; owner_wallet: string | null; synced_at: string | null };
export type Observation = { expected: string; cursor: string; hash: string; owner: string | null; transfers: number; complete: boolean };
export type CollectionAdapter = {
  label: 'verified-rpc' | 'mock';
  scan(tokenId: bigint, asset: Asset): Promise<Observation>;
};
const abi = parseAbi(['function ownerOf(uint256) view returns (address)', 'function supportsInterface(bytes4) view returns (bool)']);
const transfer = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)');

/** Eight bounded log windows per request; checkpoint is persisted, never metadata-derived. */
export function monadCollection(config: CollectionConfig): CollectionAdapter {
  const client = createPublicClient({ transport: http(config.rpc, { timeout: 8_000, retryCount: 0 }) });
  return { label: 'verified-rpc', async scan(tokenId, asset) {
    try {
      if (await client.getChainId()!==config.chainId) throw new Error('Wrong network');
      const supported = await client.readContract({ address: config.collection, abi, functionName: 'supportsInterface', args: ['0x80ac58cd'] });
      if (!supported) throw new Error('Unsupported collection');
      const head = await client.getBlock({ blockTag: 'finalized' });
      const expected = BigInt(asset.cursor);
      if (head.number===null || head.number<expected) throw new Error('Finality unavailable');
      // No permission can exist before an asset's first ownership checkpoint.
      // Baseline at a finalized block instead of replaying years of pre-app history.
      // Every subsequent grant scans ALL intervening transfers from this checkpoint.
      if (!asset.block_hash && asset.owner_wallet===null && asset.generation===0) {
        const owner=await client.readContract({address:config.collection,abi,functionName:'ownerOf',args:[tokenId],blockNumber:head.number});
        if (!head.hash || owner.toLowerCase()===zeroAddress) throw new RelayError('token_not_found',404);
        return {expected:String(expected),cursor:String(head.number),hash:head.hash,owner:owner.toLowerCase(),transfers:0,complete:true};
      }
      if (expected>=config.deploymentBlock && asset.block_hash) {
        const checkpoint=await client.getBlock({ blockNumber: expected });
        if (checkpoint.hash!==asset.block_hash) throw new Error('History changed');
      }
      let cursor=expected, owner=asset.owner_wallet, count=0;
      for (let window=0; window<8 && cursor<head.number; window++) {
        const from=cursor+1n, to=from+config.logSpan-1n<head.number ? from+config.logSpan-1n : head.number;
        const logs=await client.getLogs({ address: config.collection, event: transfer, args: {tokenId}, fromBlock: from, toBlock: to, strict: true });
        for (const log of logs) {
          if (log.removed || log.blockNumber===null) throw new Error('Unfinalized log');
          owner=log.args.to.toLowerCase()===zeroAddress ? null : log.args.to.toLowerCase(); count++;
        }
        cursor=to;
      }
      // ownerOf and history must agree at the same checkpoint, including burn handling.
      if (owner) {
        const actual=await client.readContract({ address: config.collection, abi, functionName:'ownerOf', args:[tokenId], blockNumber:cursor });
        if (actual.toLowerCase()!==owner) throw new Error('Incomplete transfer history');
      } else if (count===0 && cursor===head.number) {
        // A missing mint log must never turn a positive ownerOf into verified ownership.
        throw new RelayError('token_not_found',404);
      }
      const block=await client.getBlock({ blockNumber:cursor });
      if (!block.hash) throw new Error('Checkpoint unavailable');
      return { expected:String(expected), cursor:String(cursor), hash:block.hash, owner, transfers:count, complete:cursor===head.number };
    } catch (error) {
      if (error instanceof RelayError) throw error;
      throw new RelayError('ownership_rpc_unavailable',503);
    }
  } };
}
export function assetKey(config: Pick<CollectionConfig,'chainId'|'collection'>, token: string, environment: string, expedition = 'last-lantern/v1') {
  return `${environment}:${config.chainId}:${config.collection.toLowerCase()}:${token}:${expedition}`;
}
export function tokenNumber(value: unknown): bigint {
  if (typeof value!=='string' || !/^(0|[1-9]\d{0,77})$/.test(value) || BigInt(value)>=2n**256n) throw new RelayError('invalid_token',400);
  return BigInt(value);
}
export const normalizeWallet = (wallet: Address) => wallet.toLowerCase();
