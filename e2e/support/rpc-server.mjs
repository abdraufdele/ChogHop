import { createServer } from 'node:http';
import { openTestPostgres } from './postgres.mjs';
import { authFixture,chainFixture } from './relay-fixtures.mjs';

// Loopback-only and test-only. Never deploy as a replacement for Supabase.
const { db, rpc } = await openTestPostgres(process.env.CHOGHOP_TEST_DATA_DIR);
const port = Number(process.env.CHOGHOP_TEST_DB_PORT ?? 54329);
const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin','http://127.0.0.1:3000');
  res.setHeader('Access-Control-Allow-Headers','authorization,apikey,content-type,x-client-info,x-supabase-api-version');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  if(req.method==='OPTIONS'){res.writeHead(204).end();return;}
  if (req.method === 'GET' && req.url === '/health') { res.end('test-postgres-ready'); return; }
  if(req.url==='/chain'){
    const chunks=[];for await(const chunk of req)chunks.push(chunk);
    try{const result=JSON.stringify(chainFixture(JSON.parse(Buffer.concat(chunks).toString())));res.writeHead(200,{'Content-Type':'application/json'}).end(result);}
    catch(error){console.error('Isolated chain fixture:',error.message);res.writeHead(500).end();}return;
  }
  if (req.headers.apikey !== 'choghop-test-key') { res.writeHead(401).end(); return; }
  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 8192) { res.writeHead(413).end(); return; }
      chunks.push(chunk);
    }
    const body=chunks.length?JSON.parse(Buffer.concat(chunks).toString('utf8')):{};
    const name=req.url?.match(/^\/rest\/v1\/rpc\/(choghop_practice_\w+|choghop_relay)$/)?.[1];
    const result=req.url?.startsWith('/auth/v1/')?await authFixture(req,body):name&&req.method==='POST'?await rpc(name,body):null;
    if(result===null){res.writeHead(404).end();return;}
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(result));
  } catch {
    res.writeHead(500, { 'Content-Type': 'application/json' }).end('{"error":"test_rpc_failed"}');
  }
});
server.listen(port, '127.0.0.1', () => console.log(`PostgreSQL test adapter: http://127.0.0.1:${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  server.close(async () => { await db.close(); process.exit(0); });
});
