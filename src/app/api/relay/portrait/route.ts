import { NextRequest,NextResponse } from 'next/server';
import { createPublicClient,http,parseAbi } from 'viem';
import { collectionConfig } from '../../../../chain/config';
import { tokenNumber } from '../../../../chain/collection.server';
import { limitedMedia,mediaUrl } from '../../../../chain/media.server';
import { isRecord } from '../../../../puzzle/grammar';
export const runtime='nodejs';
const headers={'Cache-Control':'private, max-age=300','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"};
export async function GET(request:NextRequest) {
  try {
    const hosts=(process.env.CHOG_MEDIA_HOSTS??'').split(',').map(s=>s.trim()).filter(Boolean);
    if(!hosts.length)throw new Error('Portrait hosts not configured');
    const config=collectionConfig();if(!config)throw new Error('Missing configuration');
    const id=tokenNumber(request.nextUrl.searchParams.get('token'));
    const client=createPublicClient({transport:http(config.rpc,{retryCount:0,timeout:5000})});
    if(await client.getChainId()!==config.chainId)throw new Error('Wrong chain');
    const uri=await client.readContract({address:config.collection,abi:parseAbi(['function tokenURI(uint256) view returns (string)']),functionName:'tokenURI',args:[id],blockTag:'finalized'});
    const metadata=await limitedMedia(mediaUrl(uri,hosts),65536,['application/json']);
    const json:unknown=JSON.parse(new TextDecoder().decode(metadata.bytes));
    if(!isRecord(json))throw new Error('Invalid metadata');
    const image=await limitedMedia(mediaUrl(json.image,hosts),4*1024*1024,['image/png','image/jpeg','image/webp','image/avif']);
    return new NextResponse(Buffer.from(image.bytes),{headers:{...headers,'Content-Type':image.type}});
  } catch {return NextResponse.json({error:'portrait_unavailable'},{status:404,headers:{'Cache-Control':'no-store'}});}
}
