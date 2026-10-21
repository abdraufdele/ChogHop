import { getAddress, isAddress, type Address } from 'viem';
import { monad,monadTestnet } from 'viem/chains';

// Wallet network advertisement uses viem's official network definition. Privileged
// ownership reads still use only MONAD_RPC_URL on the server; no key is exposed.
export function walletChain(chainId:143|10143) { return chainId===143?monad:monadTestnet; }

export type CollectionConfig = {
  chainId: 143 | 10143; collection: Address; rpc: string; deploymentBlock: bigint; logSpan: bigint;
};
export function collectionConfig(env: Record<string,string|undefined> = process.env): CollectionConfig | null {
  const { MONAD_CHAIN_ID: chain, MONAD_RPC_URL: rpc, CHOG_COLLECTION_ADDRESS: collection,
    CHOG_DEPLOYMENT_BLOCK: start, CHOG_COLLECTION_STANDARD: standard } = env;
  if (!chain || !rpc || !collection || !start || !standard) return null;
  if (!['143','10143'].includes(chain) || !isAddress(collection) || standard !== 'ERC721' || !/^\d+$/.test(start)) throw new Error('Invalid or unsupported collection configuration');
  const url = new URL(rpc);
  const localTest=env.CHOGHOP_ENVIRONMENT==='test' && url.hostname==='127.0.0.1';
  if ((url.protocol !== 'https:' && !localTest) || url.username || url.password) throw new Error('HTTPS RPC required');
  const span = env.CHOG_LOG_BLOCK_SPAN ?? '10';
  if (!/^\d+$/.test(span) || BigInt(span)<1n || BigInt(span)>10_000n) throw new Error('Invalid RPC log range');
  return { chainId: Number(chain) as 143 | 10143, rpc, collection: getAddress(collection), deploymentBlock: BigInt(start), logSpan: BigInt(span) };
}
export function appOrigin(env: Record<string,string|undefined> = process.env): string {
  const value = env.CHOGHOP_APP_ORIGIN ?? (env.NODE_ENV === 'production' ? '' : 'http://127.0.0.1:3000');
  const url = new URL(value);
  if (url.origin!==value || (url.protocol!=='https:' && !['127.0.0.1','localhost'].includes(url.hostname))) throw new Error('Invalid app origin');
  return url.origin;
}
