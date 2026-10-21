import 'server-only';
import { isMark,isRecord } from '../puzzle/grammar';
import { EXPEDITION,FOLLOWUP } from './permission';
import type { PassportEntry,Passport } from './passport';
import { shortWallet } from './passport';
import { RelayError } from './errors';

function entry(value:unknown):PassportEntry {
  if(!isRecord(value)||!isMark(value.keeper_mark)||!isMark(value.signal)||!isMark(value.restoration)||
    ![EXPEDITION,FOLLOWUP].includes(String(value.expedition))||!['direct','reflected'].includes(String(value.keeper_choice))||
    typeof value.run_id!=='string'||typeof value.owner_wallet!=='string'||typeof value.guest_wallet!=='string'||
    typeof value.token_id!=='string'||typeof value.completed_at!=='string') throw new RelayError('incompatible_passport',503);
  const result:PassportEntry={id:Number(value.id),runId:value.run_id,tokenId:value.token_id,collection:String(value.collection_address),chainId:Number(value.chain_id),
    expedition:String(value.expedition),title:value.expedition===EXPEDITION?'The Last Lantern':'The Returning Light',keeperChoice:value.keeper_choice as PassportEntry['keeperChoice'],
    keeperMark:value.keeper_mark,signal:value.signal,restoration:value.restoration,owner:value.owner_wallet,guest:value.guest_wallet,
    completedAt:value.completed_at,environment:String(value.environment),story:''};
  result.story=`Chog #${result.tokenId} carried ${shortWallet(result.owner)}’s ${result.keeperChoice} signal. ${shortWallet(result.guest)} decoded it and restored the ${result.restoration.glyph} lantern facing ${result.restoration.bearing}. The coast found its light again.`;
  return result;
}
export function passportView(value:unknown):Passport {
  if(!isRecord(value)||!Array.isArray(value.entries))throw new RelayError('incompatible_passport',503);
  return {entries:value.entries.map(entry),entry:value.entry?entry(value.entry):null,receipt:value.receipt?entry(value.receipt):null};
}
