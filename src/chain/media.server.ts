import 'server-only';
import { isIP } from 'node:net';
import { resolve } from 'node:dns/promises';
import { RelayError } from '../relay/errors';

/** Exact operator allowlist; no redirects, arbitrary proxy, SVG, or private hostnames. */
export function mediaUrl(value: unknown,allowed: readonly string[]): URL {
  if (typeof value!=='string' || value.length>2048) throw new RelayError('portrait_unavailable',404);
  let url:URL;
  try {url=new URL(value);} catch {throw new RelayError('portrait_unavailable',404);}
  if (url.protocol!=='https:' || url.username || url.password || url.port || isIP(url.hostname) ||
    !allowed.includes(url.hostname) || !/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(url.hostname) || url.hostname.endsWith('.local')) throw new RelayError('portrait_unavailable',404);
  return url;
}
function publicV4(ip:string) {
  const [a,b]=ip.split('.').map(Number);
  return a!==undefined&&b!==undefined && a>0 && a<224 && ![10,127,169,172,192,198,203].includes(a) && !(a===100&&b>=64&&b<=127);
}
export async function limitedMedia(url:URL,max:number,types:readonly string[]):Promise<{bytes:Uint8Array;type:string}> {
  // Operator-controlled hosts must resolve publicly; reject IPv6 until the private-range
  // rules and transport pinning are supported. DNS rebinding remains an operator trust boundary.
  const addresses=await resolve(url.hostname,'A');
  if (!addresses.length || !addresses.every(publicV4)) throw new RelayError('portrait_unavailable',404);
  const response=await fetch(url,{redirect:'error',cache:'no-store',signal:AbortSignal.timeout(5000)});
  const type=(response.headers.get('content-type')??'').split(';')[0]!.trim().toLowerCase();
  if (!response.ok || !types.includes(type) || Number(response.headers.get('content-length')??0)>max || !response.body) throw new RelayError('portrait_unavailable',404);
  const chunks:Uint8Array[]=[];let size=0;
  const reader=response.body.getReader();
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();throw new RelayError('portrait_unavailable',404);}chunks.push(value);}
  return {bytes:Buffer.concat(chunks),type};
}
