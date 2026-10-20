import { openTestPostgres } from './postgres.mjs';

let input = '';
for await (const chunk of process.stdin) input += chunk;
const { directory, tokenHash } = JSON.parse(input);
const { db, rpc } = await openTestPostgres(directory);
try {
  const record = await rpc('choghop_practice_load', { p_token_hash: tokenHash });
  process.stdout.write(JSON.stringify({ id: record.id, revision: record.revision, state: record.state }));
} finally { await db.close(); }
