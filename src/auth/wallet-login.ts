import type { EthereumWallet } from '@supabase/supabase-js';

/** Supabase signs through request(); wallet event methods are optional at runtime. */
export function walletForSignIn(provider: unknown): EthereumWallet {
  if (!provider || typeof provider !== 'object' || !('request' in provider) || typeof provider.request !== 'function') {
    throw new Error('wallet_provider_missing');
  }
  const wallet: Record<string, unknown> = { request: provider.request.bind(provider) };
  for (const name of ['on', 'removeListener'] as const) {
    const method = name in provider ? (provider as Record<string, unknown>)[name] : undefined;
    if (typeof method === 'function') wallet[name] = method.bind(provider);
  }
  return wallet as unknown as EthereumWallet;
}

export class WalletSignInError extends Error {}

/** Show fixed, actionable copy; never display raw provider responses or signatures. */
export function walletSignInError(error: unknown): WalletSignInError {
  const record = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  const cause = record.cause && typeof record.cause === 'object' ? record.cause as Record<string, unknown> : {};
  const message = [record.message, cause.message].filter(v => typeof v === 'string').join(' ');
  let text = 'Wallet sign-in could not finish. Reconnect your selected wallet and try signing in again.';
  if (record.code === 4001 || cause.code === 4001 || /reject|denied|declined|4001/i.test(message)) {
    text = 'Sign-in signature declined. No session was created. Try signing in again when you are ready.';
  } else if (/uri.*not allowed|domain.*not allowed|signed for another app|redirect.*not allowed/i.test(message)) {
    text = 'Sign-in URL is not allowed by Supabase. Open choghop.vercel.app/relay and retry. The app owner must allow that URL in Supabase Auth.';
  } else if (/wallet_provider_missing|no compatible.*wallet/i.test(message)) {
    text = 'The selected wallet is unavailable. Open this page in its browser and connect that wallet again.';
  } else if (record.status === 429 || /rate.?limit|too many requests/i.test(message)) {
    text = 'Too many sign-in attempts. Wait a few minutes before signing in again.';
  } else if (/provider.*disabled|web3.*disabled/i.test(message)) {
    text = 'Wallet sign-in is disabled in Supabase. The app owner must enable Ethereum Web3 sign-in.';
  } else if (/api.?key|invalid.*key/i.test(message)) {
    text = 'Wallet sign-in configuration was rejected. The app owner must check the Supabase public key.';
  } else if (/fetch|network|timed? ?out|timeout/i.test(message)) {
    text = 'The wallet sign-in service could not be reached. Check your connection and retry signing in.';
  } else if (/signature.*invalid|invalid.*signature/i.test(message)) {
    text = 'The sign-in signature could not be verified. Reconnect the intended wallet and sign a fresh login message.';
  } else if (/chain|network.*switch/i.test(message)) {
    text = 'The wallet could not switch to the configured Monad network. Select Monad in your wallet and retry signing in.';
  }
  return new WalletSignInError(text);
}
