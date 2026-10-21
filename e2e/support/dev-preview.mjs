// Local preview only: real app routes and SQL, isolated chain/auth and public test wallets.
// Never deploy this launcher. No .env files are written or read by this script.
import { createServer, request } from 'node:http';
import { connect } from 'node:net';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { hexToString } from 'viem';
import { ownerAccount, guestAccount, collection } from './relay-fixtures.mjs';

const origin = 'http://127.0.0.1:3000';
const cwd = fileURLToPath(new URL('../../', import.meta.url));
const env = { ...process.env, SUPABASE_URL: 'http://127.0.0.1:54329',
  SUPABASE_SERVICE_ROLE_KEY: 'choghop-test-key', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'choghop-test-key',
  CHOGHOP_ENVIRONMENT: 'test', CHOGHOP_FIXTURE_PREVIEW: '1', CHOGHOP_APP_ORIGIN: origin,
  MONAD_CHAIN_ID: '10143', MONAD_RPC_URL: 'http://127.0.0.1:54329/chain',
  CHOG_COLLECTION_ADDRESS: collection, CHOG_COLLECTION_STANDARD: 'ERC721',
  CHOG_DEPLOYMENT_BLOCK: '0', CHOG_MEDIA_HOSTS: '', CHOGHOP_TEST_DB_PORT: '54329' };
// An in-memory fixture database on every launch, regardless of inherited settings.
delete env.CHOGHOP_TEST_DATA_DIR;
const children = [];
// A restarted in-memory Auth fixture cannot recognize the previous launch's cookies.
const bridgeId=randomUUID();
const provider = `(() => {
  const selected = new URL(location.href).searchParams.get('fixture_role');
  const previous = localStorage.getItem('choghop.fixture.role');
  const role = selected === 'runner' ? 'runner' : selected === 'keeper' ? 'keeper' : previous || 'keeper';
  if (previous !== role || localStorage.getItem('choghop.fixture.bridge') !== '${bridgeId}') {
    for (const cookie of document.cookie.split(';')) {
      const name = cookie.trim().split('=')[0];
      if (name.startsWith('sb-127-')) document.cookie = name + '=; Max-Age=0; Path=/; SameSite=Lax';
    }
    for (const key of Object.keys(localStorage)) if (key.startsWith('wagmi')) localStorage.removeItem(key);
  }
  localStorage.setItem('choghop.fixture.role', role);
  localStorage.setItem('choghop.fixture.bridge', '${bridgeId}');
  window.choghopFixtureWallet = { on() {}, removeListener() {},
    async request({method, params = []}) {
      const response = await fetch('/__fixture/wallet', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({role, method, params})});
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      return result;
    }
  };
})();`;

const server = createServer(async (req, res) => {
  if (req.url === '/__fixture/wallet.js' && req.method === 'GET') {
    res.writeHead(200, {'Content-Type':'application/javascript', 'Cache-Control':'no-store'}).end(provider); return;
  }
  if (req.url === '/__fixture/wallet') {
    if (req.method !== 'POST' || req.headers.origin !== origin) { res.writeHead(403).end(); return; }
    try {
      const chunks=[]; let size=0;
      for await (const chunk of req) { size+=chunk.length; if(size>8192) {res.writeHead(413).end();return;} chunks.push(chunk); }
      const {role, method, params=[]}=JSON.parse(Buffer.concat(chunks).toString());
      if(role!=='keeper' && role!=='runner') throw new Error('Choose a fixture role');
      const account=role==='keeper'?ownerAccount:guestAccount;
      let result;
      if(method==='eth_accounts'||method==='eth_requestAccounts') result=[account.address];
      else if(method==='eth_chainId') result='0x279f';
      else if(method==='wallet_switchEthereumChain'||method==='wallet_addEthereumChain') result=null;
      else if(method==='personal_sign') {
        const message=hexToString(params[0]);
        if(!message.startsWith('127.0.0.1:3000 wants you to sign in')) throw new Error('Only local fixture sign-in is supported');
        result=await account.signMessage({message});
      } else if(method==='eth_signTypedData_v4') {
        const data=JSON.parse(params[1]);
        if(data.domain.name!=='ChogHop' || Number(data.domain.chainId)!==10143 || data.domain.verifyingContract.toLowerCase()!==collection) throw new Error('Only fixture invitations are supported');
        delete data.types.EIP712Domain;
        result=await account.signTypedData(data);
      } else throw new Error('Unsupported fixture wallet method');
      res.writeHead(200,{'Content-Type':'application/json', 'Cache-Control':'no-store'}).end(JSON.stringify(result));
    } catch { res.writeHead(400,{'Content-Type':'application/json'}).end('{"error":"Fixture wallet request rejected"}'); }
    return;
  }
  const upstream=request({hostname:'127.0.0.1',port:3001,path:req.url,method:req.method,
    headers:{...req.headers,'accept-encoding':'identity'}}, response=>{
    const headers={...response.headers};
    if(response.headers['content-type']?.includes('text/html')) {
      const chunks=[];
      response.on('data',chunk=>chunks.push(chunk));
      response.on('end',()=>{
        delete headers['content-length']; delete headers['content-encoding']; delete headers.etag;
        headers['cache-control']='no-store';
        const html=Buffer.concat(chunks).toString().replace('<head>','<head><script src="/__fixture/wallet.js"></script>');
        res.writeHead(response.statusCode,headers).end(html);
      });
    } else {res.writeHead(response.statusCode,headers);response.pipe(res);}
  });
  upstream.on('error',()=>{if(!res.headersSent)res.writeHead(503);res.end('Fixture preview is starting. Refresh in a moment.');});
  req.pipe(upstream);
});
// Forward Next's own development hot-reload connection.
server.on('upgrade',(req,socket,head)=>{
  const upstream=connect(3001,'127.0.0.1',()=>{
    upstream.write(`${req.method} ${req.url} HTTP/${req.httpVersion}\r\n${Object.entries(req.headers).map(([key,value])=>`${key}: ${value}`).join('\r\n')}\r\n\r\n`);
    upstream.write(head);socket.pipe(upstream).pipe(socket);
  });
  upstream.on('error',()=>socket.destroy());socket.on('error',()=>upstream.destroy());
});
server.listen(3000,'127.0.0.1',()=>{
  for(const args of [['e2e/support/rpc-server.mjs'],['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3001']]) {
    const child=spawn(process.execPath,args,{cwd,env,stdio:'inherit',windowsHide:true});
    children.push(child);
    child.on('exit',()=>stop());
  }
  console.log(`Wallet-free fixture preview: ${origin}\nKeeper: ${origin}/relay?fixture_role=keeper\nGuest fixture address: ${guestAccount.address}`);
});
server.on('error',error=>{console.error(`Fixture preview could not start: ${error.code}`);stop();});
let stopping=false;
function stop() {if(stopping)return;stopping=true;for(const child of children)child.kill();server.close();setTimeout(()=>process.exit(0),500).unref();}
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,stop);
