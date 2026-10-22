import { getAddress, isAddress } from 'viem';
import type { User } from '@supabase/supabase-js';
import type { Actor } from '../relay/service.server';
import { RelayError } from '../relay/errors';

/** Call only with the result of Auth getUser(), never an unverified JWT/session. */
export function walletIdentity(user: User, chainId: number): Actor {
  const identities=(user.identities ?? []).filter(identity => {
    const data=identity.identity_data;
    // Supabase's provider.Claims stores signed wallet fields in custom_claims.
    // Older fixture/legacy identities may be flat; never use user_metadata here.
    const nested=data?.custom_claims;
    if (nested!==undefined && (!nested || typeof nested!=='object' || Array.isArray(nested))) return false;
    const claims=(nested??data) as Record<string,unknown>|undefined;
    if (nested && ['chain','network','address'].some(key=>data?.[key]!==undefined && data[key]!==claims?.[key])) return false;
    return identity.provider==='web3' && claims?.chain==='ethereum' &&
      (typeof claims.network==='string'||typeof claims.network==='number') && Number(claims.network)===chainId &&
      typeof claims.address==='string' && isAddress(claims.address) && data?.sub===`web3:ethereum:${claims.address}`;
  });
  if (identities.length!==1) throw new RelayError('wallet_identity_required',401);
  const data=identities[0]!.identity_data!;
  const claims=(data.custom_claims??data) as Record<string,unknown>;
  return {id:user.id,wallet:getAddress(claims.address as string)};
}
