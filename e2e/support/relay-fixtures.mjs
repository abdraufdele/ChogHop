import { randomBytes,randomUUID } from 'node:crypto';
import { encodeAbiParameters,verifyMessage,zeroAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { parseSiweMessage } from 'viem/siwe';

// Test server only. Never imported by src/. These keys control no genuine assets.
export const ownerAccount=privateKeyToAccount(`0x${'11'.repeat(32)}`);
export const guestAccount=privateKeyToAccount(`0x${'22'.repeat(32)}`);
export const collection=`0x${'44'.repeat(20)}`;
const hash=`0x${'55'.repeat(32)}`;
const users=new Map(),sessions=new Map();
function identity(address) {
  if(!users.has(address.toLowerCase())){
    const id=randomUUID();
    users.set(address.toLowerCase(),{id,aud:'authenticated',role:'authenticated',created_at:new Date().toISOString(),app_metadata:{provider:'web3',providers:['web3']},user_metadata:{},
      identities:[{id:randomUUID(),identity_id:randomUUID(),user_id:id,provider:'web3',identity_data:{sub:`web3:ethereum:${address}`,custom_claims:{address,chain:'ethereum',network:'10143'}}}]});
  }
  return users.get(address.toLowerCase());
}
export async function authFixture(req,body) {
  if(req.url==='/auth/v1/token?grant_type=web3'&&req.method==='POST'){
    const parsed=parseSiweMessage(body.message);
    if(parsed.chainId!==10143 || parsed.domain!=='127.0.0.1:3000' || !parsed.address || !await verifyMessage({address:parsed.address,message:body.message,signature:body.signature}))throw new Error('Invalid test wallet proof');
    const user=identity(parsed.address);
    const token=[Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'),Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600,aud:'authenticated'})).toString('base64url'),randomBytes(32).toString('base64url')].join('.');
    sessions.set(token,user);
    return {access_token:token,token_type:'bearer',expires_in:3600,refresh_token:randomBytes(32).toString('hex'),user};
  }
  const user=sessions.get(req.headers.authorization?.replace(/^Bearer /,''));
  if(!user)throw new Error('Invalid test session');
  if(req.url==='/auth/v1/user')return user;
  if(req.url?.startsWith('/auth/v1/logout'))return {};
  throw new Error('Unknown test auth request');
}
export function chainFixture(body) {
  const {method,params=[]}=body;
  let result;
  if(method==='eth_chainId')result='0x279f';
  else if(method==='eth_getBlockByNumber') result={number:params[0]==='finalized'?'0xa':params[0],hash,parentHash:hash,transactions:[],timestamp:'0x1',gasLimit:'0x1c9c380',gasUsed:'0x0',extraData:'0x',nonce:'0x0000000000000000',miner:zeroAddress,difficulty:'0x0',size:'0x1'};
  else if(method==='eth_call'){
    const data=params[0].data;
    if(data.startsWith('0x01ffc9a7'))result=encodeAbiParameters([{type:'bool'}],[true]);
    else if(data.startsWith('0x6352211e'))result=encodeAbiParameters([{type:'address'}],[ownerAccount.address]);
    else if(data.startsWith('0xc87b56dd'))result=encodeAbiParameters([{type:'string'}],['https://assets.invalid/fixture.json']);
    else throw new Error(`Unsupported fixture call selector ${data.slice(0,10)}`);
  }else if(method==='eth_getLogs'){
    const filter=params[0],from=BigInt(filter.fromBlock),to=BigInt(filter.toBlock);
    result=from<=1n&&to>=1n?[{address:collection,topics:[filter.topics[0],`0x${'0'.repeat(64)}`,`0x${ownerAccount.address.slice(2).toLowerCase().padStart(64,'0')}`,filter.topics[3]],data:'0x',blockNumber:'0x1',transactionHash:hash,blockHash:hash,transactionIndex:'0x0',logIndex:'0x0',removed:false}]:[];
  }else throw new Error('Unsupported fixture RPC');
  return {jsonrpc:'2.0',id:body.id,result};
}
