import 'server-only';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { NextRequest, NextResponse } from 'next/server';
import { walletIdentity } from './identity';
import { RelayError } from '../relay/errors';

export async function authenticate(request: NextRequest,chainId: number) {
  const {NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:key}=process.env;
  const url=process.env.SUPABASE_URL;
  if (!url || !key) throw new RelayError('auth_unavailable',503);
  const parsed=new URL(url);
  const localTest=process.env.CHOGHOP_ENVIRONMENT==='test' && parsed.hostname==='127.0.0.1';
  if (parsed.protocol!=='https:' && !localTest) throw new RelayError('auth_unavailable',503);
  const updates: {name:string;value:string;options:CookieOptions}[]=[];
  const client=createServerClient(url,key,{global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(8000)})},cookies:{getAll:()=>request.cookies.getAll(),setAll:cookies=>{
    updates.push(...cookies);
    for (const cookie of cookies) request.cookies.set(cookie.name,cookie.value);
  }}});
  const {data,error}=await client.auth.getUser();
  if (error || !data.user) throw new RelayError('sign_in_required',401);
  return {actor:walletIdentity(data.user,chainId),applyCookies:(response:NextResponse)=>{
    for (const {name,value,options} of updates) response.cookies.set(name,value,options);
    return response;
  }};
}
