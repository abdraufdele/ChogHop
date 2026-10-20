import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { StorageUnavailable, supabaseRpc } from '../src/persistence/rpc.server';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe('server-only Supabase transport', () => {
  it('requires explicit configuration and never silently substitutes memory', async () => {
    vi.stubEnv('SUPABASE_URL', ''); vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    await expect(supabaseRpc('choghop_practice_load', {})).rejects.toBeInstanceOf(StorageUnavailable);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('uses no-store POST RPC with service credentials only in headers', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://project.supabase.co'); vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key');
    const fetcher = vi.fn().mockResolvedValue(new Response('null', { status: 200 })); vi.stubGlobal('fetch', fetcher);
    expect(await supabaseRpc('choghop_practice_load', { p_token_hash: 'test-hash' })).toBeNull();
    expect(fetcher).toHaveBeenCalledWith(new URL('https://project.supabase.co/rest/v1/rpc/choghop_practice_load'), expect.objectContaining({
      method: 'POST', cache: 'no-store', headers: expect.objectContaining({ apikey: 'test-service-key' }), body: '{"p_token_hash":"test-hash"}',
    }));
  });
  it('does not expose upstream errors or secrets and rejects non-test plaintext hosts', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://project.supabase.co'); vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-private-secret');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('server error with test-private-secret', { status: 500 })));
    await expect(supabaseRpc('choghop_practice_load', {})).rejects.toThrow('Practice storage unavailable');
    vi.stubEnv('SUPABASE_URL', 'http://remote.example');
    await expect(supabaseRpc('choghop_practice_load', {})).rejects.toBeInstanceOf(StorageUnavailable);
  });
});
