import { describe, expect, it } from 'vitest';
import { walletForSignIn, walletSignInError } from '../src/auth/wallet-login';

describe('wallet sign-in compatibility and safe errors',()=>{
  it('accepts request-only wallets and retains provider method context',async()=>{
    const provider={marker:'selected wallet',async request(){return this.marker;}};
    expect(await walletForSignIn(provider).request({method:'eth_accounts'})).toBe('selected wallet');
    expect(walletForSignIn(provider)).not.toHaveProperty('on');
    expect(walletForSignIn({...provider,on:null,removeListener:'unsupported'})).not.toHaveProperty('removeListener');
  });
  it('binds event methods when a wallet supplies them',()=>{
    const provider={marker:42,request(){},on(){return this.marker;},removeListener(){return this.marker;}};
    const wallet=walletForSignIn(provider) as unknown as {on:()=>number;removeListener:()=>number};
    expect(wallet.on()).toBe(42);expect(wallet.removeListener()).toBe(42);
    expect(()=>walletForSignIn({})).toThrow('wallet_provider_missing');
  });
  it('identifies a rejected signing URI and nested wallet rejection',()=>{
    expect(walletSignInError(new Error('Signed Ethereum message is using URI which is not allowed on this server, message was signed for another app')).message).toContain('Sign-in URL is not allowed');
    expect(walletSignInError({cause:{code:4001}}).message).toContain('signature declined');
  });
  it('gives actionable service errors without echoing arbitrary response data',()=>{
    expect(walletSignInError({status:429}).message).toContain('Too many sign-in attempts');
    expect(walletSignInError(new Error('fetch failed')).message).toContain('could not be reached');
    expect(walletSignInError(new Error('provider is disabled')).message).toContain('disabled in Supabase');
    const raw='private signed payload and secret credential';
    expect(walletSignInError(new Error(raw)).message).not.toContain(raw);
  });
});
