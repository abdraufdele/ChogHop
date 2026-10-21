import { getAddress, isAddress } from 'viem';
import type { User } from '@supabase/supabase-js';
import type { Actor } from '../relay/service.server';
import { RelayError } from '../relay/errors';

/** Call only with the result of Auth getUser(), never an unverified JWT/session. */
export function walletIdentity(user: User, chainId: number): Actor {
  const identities=(user.identities ?? []).filter(identity => {
    const data=identity.identity_data;
    return identity.provider==='web3' && data?.chain==='ethereum' && Number(data.network)===chainId &&
      typeof data.address==='string' && isAddress(data.address) && data.sub===`web3:ethereum:${data.address}`;
  });
  if (identities.length!==1) throw new RelayError('wallet_identity_required',401);
  return {id:user.id,wallet:getAddress(identities[0]!.identity_data!.address as string)};
}
