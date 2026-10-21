import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '../../../auth/server';
import { collectionConfig, appOrigin } from '../../../chain/config';
import { monadCollection } from '../../../chain/collection.server';
import { createRelayService } from '../../../relay/service.server';
import { RelayError } from '../../../relay/errors';
import { isRecord } from '../../../puzzle/grammar';
import type { Hex } from 'viem';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function id(value:unknown):string {
  if (typeof value!=='string' || !uuid.test(value)) throw new RelayError('invalid_request',400);
  return value;
}
export async function POST(request:NextRequest) {
  let applyCookies=(response:NextResponse)=>response;
  try {
    const origin=appOrigin();
    if (request.headers.get('origin')!==origin) throw new RelayError('wrong_origin',403);
    if (!request.headers.get('content-type')?.startsWith('application/json')) throw new RelayError('invalid_request',415);
    const chunks:Uint8Array[]=[]; let length=0;
    const reader=request.body?.getReader();
    if (!reader) throw new RelayError('invalid_request',400);
    while (true) {
      const {done,value}=await reader.read(); if (done) break;
      length+=value.byteLength;
      if (length>4096) {await reader.cancel();throw new RelayError('request_too_large',413);}
      chunks.push(value);
    }
    let body:unknown;
    try {body=JSON.parse(Buffer.concat(chunks).toString('utf8'));} catch {throw new RelayError('invalid_request',400);}
    if (!isRecord(body)) throw new RelayError('invalid_request',400);
    const config=collectionConfig();
    if (!config) throw new RelayError('collection_not_configured',503);
    const auth=await authenticate(request,config.chainId); applyCookies=auth.applyCookies;
    const environment=process.env.CHOGHOP_ENVIRONMENT;
    if (!environment || !['development','production','test'].includes(environment)) throw new RelayError('configuration_unavailable',503);
    const service=createRelayService({config,adapter:monadCollection(config),environment,origin});
    let result:unknown;
    switch(body.operation) {
      case 'start': if(typeof body.tokenId!=='string') throw new RelayError('invalid_token',400); result=await service.start(auth.actor,body.tokenId); break;
      case 'resume':result=await service.resume(auth.actor,id(body.runId));break;
      case 'prepare':
        if(!Number.isSafeInteger(body.revision)) throw new RelayError('invalid_revision',400);
        result=await service.prepare(auth.actor,id(body.runId),body.revision as number,body.action);break;
      case 'challenge':
        if(typeof body.guest!=='string') throw new RelayError('invalid_guest',400);
        result=await service.challenge(auth.actor,id(body.runId),body.guest);break;
      case 'issue':
        if(typeof body.signature!=='string' || !/^0x[a-fA-F0-9]{130}$/.test(body.signature)) throw new RelayError('invalid_signature',400);
        result=await service.issue(auth.actor,id(body.permissionId),body.signature as Hex);break;
      case 'revoke':result=await service.revoke(auth.actor,id(body.permissionId));break;
      case 'invitation':result=await service.guest(auth.actor,id(body.permissionId));break;
      case 'redeem':
        if(!Number.isSafeInteger(body.revision)) throw new RelayError('invalid_revision',400);
        result=await service.redeem(auth.actor,id(body.permissionId),body.revision as number,body.action);break;
      default:throw new RelayError('invalid_request',400);
    }
    return applyCookies(NextResponse.json({result},{headers}));
  } catch(error) {
    return applyCookies(NextResponse.json({error:error instanceof RelayError?error.code:'service_unavailable'},
      {status:error instanceof RelayError?error.status:503,headers}));
  }
}
