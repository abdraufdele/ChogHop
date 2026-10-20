import { createServer } from 'node:http';
import { openTestPostgres } from './postgres.mjs';

// Loopback-only and test-only. Never deploy as a replacement for Supabase.
const { db, rpc } = await openTestPostgres(process.env.CHOGHOP_TEST_DATA_DIR);
const port = Number(process.env.CHOGHOP_TEST_DB_PORT ?? 54329);
const server = createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') { res.end('test-postgres-ready'); return; }
  if (req.headers.apikey !== 'choghop-test-key') { res.writeHead(401).end(); return; }
  try {
    const name = req.url?.match(/^\/rest\/v1\/rpc\/(choghop_practice_\w+)$/)?.[1];
    if (!name || req.method !== 'POST') { res.writeHead(404).end(); return; }
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 8192) { res.writeHead(413).end(); return; }
      chunks.push(chunk);
    }
    const result = await rpc(name, JSON.parse(Buffer.concat(chunks).toString('utf8')));
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(result));
  } catch {
    res.writeHead(500, { 'Content-Type': 'application/json' }).end('{"error":"test_rpc_failed"}');
  }
});
server.listen(port, '127.0.0.1', () => console.log(`PostgreSQL test adapter: http://127.0.0.1:${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  server.close(async () => { await db.close(); process.exit(0); });
});
