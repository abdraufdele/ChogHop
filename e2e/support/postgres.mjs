import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';

const functions = {
  choghop_relay: ['p_operation', 'p_actor_id', 'p_wallet', 'p_payload'],
  choghop_practice_start: ['p_token_hash', 'p_previous_token_hash', 'p_run_id', 'p_actor_id', 'p_environment'],
  choghop_practice_load: ['p_token_hash'],
  choghop_practice_commit: ['p_token_hash', 'p_expected_revision', 'p_state', 'p_event', 'p_payload', 'p_error'],
};

/** Test-only Supabase-style transport. Runs the real migration and PostgreSQL functions. */
export async function openTestPostgres(directory) {
  const db = new PGlite(directory);
  await db.waitReady;
  const installed = await db.query("select to_regclass('choghop_private.practice_runs') as name");
  if (!installed.rows[0].name) {
    await db.exec('create role anon nologin; create role authenticated nologin; create role service_role nologin;');
    await db.exec(await readFile(new URL('../../supabase/migrations/202610200001_persist_practice.sql', import.meta.url), 'utf8'));
  }
  const relay = await db.query("select to_regclass('choghop_private.relay_assets') as name");
  if (!relay.rows[0].name) await db.exec(await readFile(new URL('../../supabase/migrations/202610200002_guest_permissions.sql', import.meta.url), 'utf8'));
  const rpc = async (name, args) => {
    const fields = functions[name];
    if (!fields) throw new Error('Unknown test RPC');
    return db.transaction(async tx => {
      await tx.exec('set local role service_role');
      const parameters = fields.map((_, i) => `$${i + 1}`).join(',');
      const values = fields.map(field => {
        const value = args[field];
        return typeof value === 'object' && value !== null ? JSON.stringify(value) : value;
      });
      const result = await tx.query(`select public.${name}(${parameters}) as result`, values);
      return result.rows[0].result;
    });
  };
  return { db, rpc };
}
