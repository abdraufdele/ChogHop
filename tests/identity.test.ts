import {describe,expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
import type {User} from '@supabase/supabase-js';
import {walletIdentity} from '../src/auth/identity';
const address='0x4444444444444444444444444444444444444444';
const claims={address,chain:'ethereum',network:'143'};
function user(data:Record<string,unknown>,provider='web3'):User{return {id:'verified-user',identities:[{provider,identity_data:data}]} as unknown as User;}
const subject={sub:`web3:ethereum:${address}`};
describe('verified Supabase Web3 identity shapes',()=>{
  it('accepts signed claims nested by hosted Supabase and retains legacy flat support',()=>{
    expect(walletIdentity(user({...subject,custom_claims:claims}),143)).toEqual({id:'verified-user',wallet:address});
    expect(walletIdentity(user({...subject,...claims}),143).wallet).toBe(address);
  });
  it('rejects wrong network, subject, provider and malformed nested claims',()=>{
    for(const data of [{...subject,custom_claims:{...claims,network:'1'}},{sub:'web3:ethereum:other',custom_claims:claims},{...subject,custom_claims:[]},{...subject,custom_claims:null}])expect(()=>walletIdentity(user(data),143)).toThrow();
    expect(()=>walletIdentity(user({...subject,custom_claims:claims},'email'),143)).toThrow();
  });
  it('rejects conflicting claims and client-editable metadata without a valid identity',()=>{
    expect(()=>walletIdentity(user({...subject,address:'0x5555555555555555555555555555555555555555',custom_claims:claims}),143)).toThrow();
    expect(()=>walletIdentity({id:'verified-user',identities:[],user_metadata:{...subject,custom_claims:claims}} as unknown as User,143)).toThrow();
  });
  it('rejects multiple eligible wallet identities',()=>{
    const u=user({...subject,custom_claims:claims});
    expect(()=>walletIdentity({...u,identities:[...u.identities!,...u.identities!]},143)).toThrow();
  });
});
