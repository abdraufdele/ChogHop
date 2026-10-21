import { beforeEach,describe,expect,it,vi } from 'vitest';
vi.mock('server-only',()=>({}));
const rpc=vi.hoisted(()=>({getChainId:vi.fn(),getBlock:vi.fn(),readContract:vi.fn(),getLogs:vi.fn()}));
vi.mock('viem',async original=>({...await original<typeof import('viem')>(),createPublicClient:()=>rpc}));
import { monadCollection,tokenNumber,type Asset } from '../src/chain/collection.server';
import { collectionConfig,type CollectionConfig } from '../src/chain/config';
import { mediaUrl,limitedMedia } from '../src/chain/media.server';
import { resolve } from 'node:dns/promises';
vi.mock('node:dns/promises',()=>({resolve:vi.fn()}));
const owner=`0x${'11'.repeat(20)}`,other=`0x${'22'.repeat(20)}`,hash=`0x${'55'.repeat(32)}`;
const config:CollectionConfig={chainId:10143,collection:`0x${'44'.repeat(20)}`,rpc:'https://rpc.invalid',deploymentBlock:0n,logSpan:10n};
const asset:Asset={id:'fixture',generation:1,cursor:10,block_hash:hash,owner_wallet:owner,synced_at:null};
beforeEach(()=>{
  vi.resetAllMocks();rpc.getChainId.mockResolvedValue(10143);
  rpc.getBlock.mockImplementation(async(args:{blockNumber?:bigint})=>({number:args.blockNumber??100n,hash}));
  rpc.readContract.mockImplementation(async(args:{functionName:string})=>args.functionName==='supportsInterface'?true:owner);
  rpc.getLogs.mockResolvedValue([]);
});
describe('Monad ownership history adapter',()=>{
  it('baselines a never-used token at a finalized block before any permission can exist',async()=>{
    expect(await monadCollection(config).scan(7n,{...asset,cursor:-1,owner_wallet:null,block_hash:null,generation:0})).toMatchObject({cursor:'100',owner,transfers:0,complete:true});
    expect(rpc.getLogs).not.toHaveBeenCalled();
  });
  it('scans bounded windows and persists incremental progress without claiming ownership is fresh',async()=>{
    const result=await monadCollection(config).scan(7n,asset);
    expect(result).toMatchObject({expected:'10',cursor:'90',complete:false,transfers:0});
    expect(rpc.getLogs).toHaveBeenCalledTimes(8);
    const first=rpc.getLogs.mock.calls[0]![0] as {fromBlock:bigint;toBlock:bigint};
    expect(first).toMatchObject({fromBlock:11n,toBlock:20n});
    expect(rpc.readContract).toHaveBeenLastCalledWith(expect.objectContaining({blockNumber:90n,functionName:'ownerOf'}));
  });
  it('counts both legs of an away-and-back transfer, even with unchanged final ownerOf',async()=>{
    rpc.getBlock.mockImplementation(async(args:{blockNumber?:bigint})=>({number:args.blockNumber??20n,hash}));
    rpc.getLogs.mockResolvedValue([{removed:false,blockNumber:11n,args:{to:other}},{removed:false,blockNumber:12n,args:{to:owner}}]);
    expect(await monadCollection(config).scan(7n,asset)).toMatchObject({transfers:2,owner,complete:true,cursor:'20'});
  });
  it('fails closed on wrong chain, incomplete logs, reorg, removed logs, unsupported standard and RPC failure',async()=>{
    rpc.getChainId.mockResolvedValueOnce(143);
    await expect(monadCollection(config).scan(7n,asset)).rejects.toMatchObject({code:'ownership_rpc_unavailable'});
    rpc.getBlock.mockResolvedValueOnce({number:100n,hash}).mockResolvedValueOnce({number:10n,hash:'different'});
    await expect(monadCollection(config).scan(7n,asset)).rejects.toMatchObject({code:'ownership_rpc_unavailable'});
    rpc.readContract.mockImplementation(async(args:{functionName:string})=>args.functionName==='supportsInterface'?true:other);
    await expect(monadCollection(config).scan(7n,asset)).rejects.toMatchObject({code:'ownership_rpc_unavailable'});
    rpc.readContract.mockResolvedValueOnce(false);
    await expect(monadCollection(config).scan(7n,asset)).rejects.toMatchObject({code:'ownership_rpc_unavailable'});
    rpc.getChainId.mockRejectedValueOnce(new Error('RPC down'));
    await expect(monadCollection(config).scan(7n,asset)).rejects.toMatchObject({code:'ownership_rpc_unavailable'});
  });
  it('validates collection configuration and uint256 token identities; never invents a collection',()=>{
    expect(collectionConfig({})).toBeNull();
    expect(()=>collectionConfig({MONAD_CHAIN_ID:'1',MONAD_RPC_URL:'https://rpc.invalid',CHOG_COLLECTION_ADDRESS:config.collection,CHOG_DEPLOYMENT_BLOCK:'0',CHOG_COLLECTION_STANDARD:'ERC721'})).toThrow();
    for(const invalid of ['-1','01','1e3','1.5',String(2n**256n),'',7])expect(()=>tokenNumber(invalid)).toThrow();
    expect(tokenNumber('0')).toBe(0n);
  });
});
describe('constrained collection media',()=>{
  it('rejects arbitrary URLs, credentials, protocols, ports, localhost and nonallowlisted hosts',()=>{
    for(const url of ['http://assets.example/a','https://assets.example:444/a','https://user:pass@assets.example/a','https://127.0.0.1/a','https://evil.example/a','data:image/svg+xml,a','ipfs://anything']) expect(()=>mediaUrl(url,['assets.example'])).toThrow();
    expect(mediaUrl('https://assets.example/7.png',['assets.example']).href).toBe('https://assets.example/7.png');
  });
  it('bounds streamed bodies, refuses SVG and redirects, and rejects private DNS responses',async()=>{
    vi.mocked(resolve).mockResolvedValue(['104.16.0.1']);
    const fetchMock=vi.fn();vi.stubGlobal('fetch',fetchMock);
    const url=new URL('https://assets.example/a');
    try{
      fetchMock.mockResolvedValue(new Response('x'.repeat(20),{headers:{'Content-Type':'image/png'}}));
      await expect(limitedMedia(url,10,['image/png'])).rejects.toThrow();
      fetchMock.mockResolvedValue(new Response('<svg/>',{headers:{'Content-Type':'image/svg+xml'}}));
      await expect(limitedMedia(url,100,['image/png'])).rejects.toThrow();
      fetchMock.mockResolvedValue(new Response('png',{headers:{'Content-Type':'image/png'}}));
      expect(await limitedMedia(url,100,['image/png'])).toMatchObject({type:'image/png'});
      expect(fetchMock).toHaveBeenLastCalledWith(url,expect.objectContaining({redirect:'error'}));
      vi.mocked(resolve).mockResolvedValue(['127.0.0.1']);
      await expect(limitedMedia(url,100,['image/png'])).rejects.toThrow();
    }finally{vi.unstubAllGlobals();}
  });
});
