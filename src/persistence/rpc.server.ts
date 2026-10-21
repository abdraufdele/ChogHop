import 'server-only';

export type RpcName = 'choghop_practice_start' | 'choghop_practice_load' | 'choghop_practice_commit' | 'choghop_relay';
export type Rpc = (name: RpcName, args: Record<string, unknown>) => Promise<unknown>;
export class StorageUnavailable extends Error {
  constructor() { super('Practice storage unavailable'); }
}

/** Service credentials never enter client modules, analytics, thrown responses or logs. */
export const supabaseRpc: Rpc = async (name, args) => {
  const origin = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!origin || !key) throw new StorageUnavailable();
  try {
    const url = new URL(origin);
    const localTest = process.env.CHOGHOP_ENVIRONMENT === 'test' && url.hostname === '127.0.0.1';
    if (url.protocol !== 'https:' && !localTest) throw new StorageUnavailable();
    const response = await fetch(new URL(`/rest/v1/rpc/${name}`, url), {
      method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(8_000),
      headers: { 'Content-Type': 'application/json', apikey: key, ...(key.startsWith('sb_secret_') ? {} : { Authorization: `Bearer ${key}` }) },
      body: JSON.stringify(args),
    });
    if (!response.ok) throw new StorageUnavailable();
    return await response.json();
  } catch { throw new StorageUnavailable(); }
};
