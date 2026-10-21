'use client';

import { useEffect, useRef, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { EthereumWallet } from '@supabase/supabase-js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http, useConnection, useConnect, useConnectors, useDisconnect, useSignTypedData, useSwitchChain } from 'wagmi';
import { injected } from 'wagmi/connectors';
import type { EIP1193Provider } from 'viem';
import { walletChain } from '../chain/config';
import { permissionData, type Scope } from '../relay/permission';
import { EXPEDITION,FOLLOWUP } from '../relay/permission';
import type { Passport } from '../relay/passport';
import { RelayPassport } from './relay-passport';
import { MarkPicker } from './practice';
import { Observatory } from './observatory';
import { RoleIcon, SignalMark } from './symbols';
import type { KeeperView, RunnerView } from '../puzzle/engine';
import type { Bearing, Glyph, Treatment } from '../puzzle/grammar';

export type RelaySettings = {chainId:143|10143;supabaseUrl:string;publishableKey:string;configured:boolean;collection:string;test?:boolean;fixtureWallet?:boolean};
type Snapshot={runId:string;revision:number;stage:string;puzzle:KeeperView|RunnerView|null;chart?:KeeperView;tokenId:string;status?:string;owner?:string;guest?:string;expiresAt?:number;permissionId?:string;expedition:string;memoryChoice:'direct'|'reflected'|null;passport:Passport|null};
const messages:Record<string,string>={
  ownership_syncing:'Checking the Chog’s transfer history. Select it again to continue from the saved checkpoint.',
  ownership_rpc_unavailable:'The ownership check couldn’t reach Monad. Your saved run is safe. Try again shortly.',
  ownership_unverified:'This wallet is not the verified current owner of this Chog.',
  ownership_changed:'This Chog changed hands. The old invitation has ended. Its current owner can begin again.',
  signal_changed:'The Keeper prepared a new signal. Ask for a fresh invitation.',
  scope_mismatch:'This invitation belongs to a different signal or app configuration. Ask for a fresh invitation.',
  changed:'The invitation ended because the signal or ownership changed.', revoked:'The owner closed this invitation.',
  expired:'This invitation has expired. Ask the Keeper for a fresh one.',challenge_expired:'The signing ticket expired. Prepare a fresh invitation.',
  wrong_guest:'This invitation is for another wallet. Connect the wallet named on your ticket.',
  sign_in_required:'Sign in with the wallet you want to use for this expedition.',
  wallet_identity_required:'Sign in again on the configured Monad network to prove your wallet.',
  stale_revision:'This run moved on in another tab. Reload the saved run before making another move.',
  incorrect_keeper:'Check both chart clues: each glyph appears once, and the arrow turns clockwise.',
  incorrect_runner:'The lantern is still quiet. Compare your glyph and arrow with both examples.',
  active_permission_exists:'This Chog already has an active invitation. Revoke it before issuing another.',
  different_guest_required:'Invite a different wallet. This expedition needs a Keeper and a Runner.',
  too_many_attempts:'Give the lantern 30 seconds, then try your deduction again.',
  budget_used:'This Chog has already contributed to this expedition.',redeemed:'This invitation has already been used.',
  invalid_guest:'Enter the friend’s full Ethereum wallet address.',token_not_found:'No Chog was found at that token ID.',
  complete_first:'Finish this shared expedition before opening its next chapter.',
  no_further_chapter:'You’ve reached the end of these two little expeditions. Both stories stay in the passport.',
  passport_not_ready:'The passport is waiting for a correct shared completion. Your saved run is safe.',
};

export function Relay({settings}: {settings:RelaySettings}) {
  const [query]=useState(()=>new QueryClient());
  const [config]=useState(()=>{
    const chain=walletChain(settings.chainId);
    // No client chain reads. Ownership uses only the configured server RPC.
    // Only the local development launcher selects this dedicated provider. Installed
    // wallet extensions and their discovery announcements must not replace it.
    const connector=settings.fixtureWallet?injected({target:{id:'choghop-fixture',name:'ChogHop Test Wallet',
      provider:()=>typeof window==='undefined'?undefined:(window as Window & {choghopFixtureWallet?:EIP1193Provider}).choghopFixtureWallet}}):injected();
    return createConfig({chains:[chain],connectors:[connector],multiInjectedProviderDiscovery:!settings.fixtureWallet,transports:{143:http(),10143:http()},ssr:true});
  });
  return <WagmiProvider config={config}><QueryClientProvider client={query}><RelayRoom settings={settings}/></QueryClientProvider></WagmiProvider>;
}
function RelayRoom({settings}:{settings:RelaySettings}) {
  const connection=useConnection(),connect=useConnect(),connectors=useConnectors(),disconnect=useDisconnect();
  const switchChain=useSwitchChain(),sign=useSignTypedData();
  const [client]=useState(()=>settings.supabaseUrl && settings.publishableKey ? createBrowserClient(settings.supabaseUrl,settings.publishableKey):null);
  const [signedIn,setSignedIn]=useState(false),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [invite,setInvite]=useState(''),[runId,setRunId]=useState(''),[snapshot,setSnapshot]=useState<Snapshot|null>(null);
  const [token,setToken]=useState(''),[guest,setGuest]=useState(''),[permission,setPermission]=useState(''),[link,setLink]=useState('');
  const [glyph,setGlyph]=useState<Glyph|null>(null),[bearing,setBearing]=useState<Bearing>('north'),[treatment,setTreatment]=useState<Treatment>('direct');
  const [inspection,setInspection]=useState('');
  const [journal,setJournal]=useState<Passport|null>(null);
  const objective=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{if(snapshot?.stage)objective.current?.focus();},[snapshot?.stage,snapshot?.runId]);
  useEffect(()=>{
    const params=new URLSearchParams(location.search);setInvite(params.get('invite')??'');setRunId(params.get('run')??'');setReady(true);
    if(!client)return;
    // Client state only controls the UI. The API independently calls getUser for every action.
    const {data}=client.auth.onAuthStateChange((_event,session)=>setSignedIn(Boolean(session)));
    return ()=>data.subscription.unsubscribe();
  },[client]);
  async function request(operation:string,extra:Record<string,unknown>={}) {
    const response=await fetch('/api/relay',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation,...extra}),cache:'no-store',signal:AbortSignal.timeout(30_000)});
    const body=await response.json();
    if(!response.ok || body.error) throw new Error(body.error??'network');
    return body.result;
  }
  async function work(action:()=>Promise<void>) {
    setBusy(true);setError('');
    try{await action();}catch(e){const code=e instanceof Error?e.message:'';setError(messages[code]??'That step couldn’t finish. Your saved run is safe. If you declined the signature, try again when you’re ready.');}
    finally{setBusy(false);}
  }
  async function login() {
    if(!client || !connection.connector)throw new Error('sign_in_required');
    if(connection.chainId!==settings.chainId)await switchChain.mutateAsync({chainId:settings.chainId});
    const provider=await connection.connector.getProvider() as EIP1193Provider;
    const wallet={address:connection.address!,request:provider.request.bind(provider),on:provider.on.bind(provider),removeListener:provider.removeListener.bind(provider)} as unknown as EthereumWallet;
    const {error}=await client.auth.signInWithWeb3({chain:'ethereum',wallet,statement:'Sign in to ChogHop. This does not authorize a guest move.',options:{signInWithEthereum:{chainId:settings.chainId,nonce:crypto.randomUUID().replaceAll('-','')}}});
    if(error)throw error;
    setSignedIn(true);
  }
  async function open() {
    const result=await request(invite?'invitation':runId?'resume':'start',invite?{permissionId:invite}:runId?{runId}:{tokenId:token});
    setSnapshot(result);setRunId(result.runId);setJournal(null);if(result.permissionId)setPermission(result.permissionId);
    if(!invite){history.replaceState(null,'',`/relay?run=${result.runId}`);setPermission(result.permissionId??'');setLink(result.permissionId?`${location.origin}/relay?invite=${result.permissionId}`:'');}
  }
  const keeper=snapshot?.puzzle && 'clues'in snapshot.puzzle?snapshot.puzzle:null;
  const runner=snapshot?.puzzle && 'examples'in snapshot.puzzle?snapshot.puzzle:null;
  return <div className="site-shell relay-shell"><header className="site-header"><a className="wordmark" href="/">ChogHop</a><a className="practice-anchor" href="/">Wallet-free practice ↗</a></header>
    <main><div className="chapter-intro"><div><p className="eyebrow">THE MIDNIGHT EXPEDITION CLUB · LIVE RELAY</p><h1>A light worth<br/><span>passing on.</span></h1></div><div className="intro-copy"><p>One Chog. Two people.<br/>A Keeper’s signal, a Runner’s deduction.</p></div></div>
    {settings.test&&<p className="notice-message">Isolated test environment · wallets, chain observations and records are test fixtures. No genuine Chog is being verified.</p>}
    {!settings.configured?<section className="relay-setup"><h2>The live observatory is waiting.</h2><p>Mock collection adapter · no real Chog has been verified. Live invitations are unavailable until the collection, Monad RPC and wallet authentication are configured.</p><a className="primary-button" href="/">Play wallet-free practice ↗</a></section>:<div className="expedition-layout"><div><Observatory live returning={snapshot?.expedition===FOLLOWUP} stage={snapshot?.stage??'keeper'} selected={glyph} onInspect={setInspection} interactive={ready}/><div className="scene-note"><p>{inspection==='chart'?'Each glyph appears once. Follow the arrow through both chart clues.':inspection==='lens'?'The Keeper’s treatment changes the signal. Both examples follow the same transformation.':inspection==='lanterns'?'Choose a glyph and bearing. An incorrect deduction leaves the guest move unused.':'Follow the chart, then pass the light to a friend.'}</p></div><p className="relay-identity">{snapshot?`Chog #${snapshot.tokenId} · ${settings.collection}`:'Select a Chog by its token ID.'}<br/>Portrait unavailable until validated collection metadata is configured.</p></div>
    <section className="action-panel" aria-label="Live relay" aria-busy={busy}>{snapshot&&<TokenPortrait key={snapshot.tokenId} tokenId={snapshot.tokenId}/>}<div className="role-label"><RoleIcon role={invite?'runner':'keeper'}/>{invite?'RUNNER / THE LANTERN':'KEEPER / THE CHART'}</div>
      {!signedIn?<><h2>{invite?'Your invitation is waiting.':'Bring your Chog along.'}</h2><p className="objective-copy">Sign in with an existing wallet. Login and guest authorization use separate signatures. No token approval or transaction is requested.</p>{connection.address?<><p className="relay-address">Connected: {connection.address}</p><button className="primary-button" disabled={busy} onClick={()=>void work(login)}>Sign in to ChogHop</button></>:connectors.map(connector=><button className="primary-button" key={connector.uid} disabled={busy||!ready} onClick={()=>void work(async()=>{await connect.mutateAsync({connector});})}>Connect {connector.name}</button>)}{!connectors.length&&ready&&<p>Open this page in a browser with an Ethereum wallet installed.</p>}</>:
      <><p className="relay-address">Wallet: {connection.address??'Saved authenticated session'}</p>{!snapshot?<><h2>{invite?'Open your invitation.':runId?'Your saved signal awaits.':'Choose your Chog.'}</h2>{!invite&&!runId&&<label className="relay-field">Chog token ID<input inputMode="numeric" value={token} onChange={e=>setToken(e.target.value)} placeholder="Token ID"/></label>}<button className="primary-button" disabled={busy} onClick={()=>void work(open)}>{busy?'Checking the observatory…':invite?'Open invitation':runId?'Resume saved run':'Verify and select Chog'}</button></>:
      <><h2 ref={objective} tabIndex={-1}>{snapshot.stage==='complete'?'The coast has its light.':invite?'Read the Keeper’s signal.':keeper?'Complete the chart.':'Your signal is ready.'}</h2>
      {snapshot.memoryChoice&&<p className="returning-memory">CHAPTER 02 / THE RETURNING LIGHT<br/>Your Chog remembers its {snapshot.memoryChoice} signal. This chart begins to the {snapshot.memoryChoice==='direct'?'east':'south'}.</p>}
      {invite&&<div className="invitation-ticket"><p className="ticket-kicker">ONE GUEST MOVE · CHOG #{snapshot.tokenId}</p><dl><dt>Invited by</dt><dd>{snapshot.owner}</dd><dt>Named guest</dt><dd>{snapshot.guest}</dd><dt>Allowed move</dt><dd>Restore one lantern in this run</dd><dt>Expires</dt><dd>{snapshot.expiresAt?new Date(snapshot.expiresAt*1000).toLocaleString():''}</dd></dl><p>Status: {snapshot.status}</p><p>The Keeper can be offline. This pass ends after one correct move, expiry, revocation, or a detected transfer or signal change.</p></div>}
      {keeper&&<><p className="objective-copy">{keeper.rule}</p><div className="chart-clues">{([0,1,2] as const).map(slot=>slot===keeper.missingSlot?<div className="chart-clue missing-clue" key={slot}><span>SLOT {slot+1}</span><strong>?</strong></div>:<div className="chart-clue" key={slot}><span>SLOT {slot+1}</span><SignalMark mark={keeper.clues.find(clue=>clue.slot===slot)!.mark}/></div>)}</div></>}
      {runner&&<><div className="received-signal"><span>RECEIVED SIGNAL</span><SignalMark mark={runner.signal}/></div>{invite&&<><p className="objective-copy">{runner.rule}</p><div className="example-strip">{runner.examples.map((example,index)=><div className="transform-example" key={index}><SignalMark mark={example.signal}/><span>→</span><SignalMark mark={example.lantern}/></div>)}</div></>}</>}
      {(keeper||(invite&&runner&&snapshot.status==='active'))&&<form onSubmit={e=>{e.preventDefault();void work(async()=>{const result=await request(invite?'redeem':'prepare',{runId:snapshot.runId,permissionId:invite,revision:snapshot.revision,action:{type:invite?'restore':'prepare',mark:{glyph,bearing},treatment}});if(invite){await open();}else {setSnapshot(result);setPermission('');setLink('');}});}}><MarkPicker glyph={glyph} bearing={bearing} onGlyph={setGlyph} onBearing={setBearing} disabled={busy}/>{keeper&&<fieldset className="treatment-options"><legend>Send the signal through</legend>{(['direct','reflected'] as const).map(value=><label key={value}><input type="radio" name="treatment" checked={treatment===value} onChange={()=>setTreatment(value)}/><span>{value}</span></label>)}</fieldset>}<div className="bottom-action-tray"><button className="primary-button" disabled={busy||!glyph}>{invite?'Restore the lantern':'Prepare the signal'} ↗</button><p className="tray-caption">{invite?'An incorrect answer does not spend your move.':'Your friend will infer your transformation from the room.'}</p></div></form>}
      {!invite&&runner&&<><label className="relay-field">Friend’s wallet address<input value={guest} onChange={e=>setGuest(e.target.value)} placeholder="0x…" autoComplete="off"/></label><button className="primary-button" disabled={busy||!guest} onClick={()=>void work(async()=>{
        const challenge=await request('challenge',{runId:snapshot.runId,guest}) as {permissionId:string;scope:Scope};
        if(!connection.address || connection.address.toLowerCase()!==challenge.scope.owner.toLowerCase())throw new Error('sign_in_required');
        if(connection.chainId!==settings.chainId)await switchChain.mutateAsync({chainId:settings.chainId});
        const signature=await sign.mutateAsync(permissionData(challenge.scope));
        const issued=await request('issue',{permissionId:challenge.permissionId,signature});
        setPermission(issued.permissionId);setLink(issued.inviteUrl);
      })}>Sign one guest move ↗</button><p className="tray-caption">One named friend · one run · one correct move · 30 minutes</p>{link&&<div className="invitation-ticket"><label className="relay-field">Share this invitation<input readOnly value={link} onFocus={e=>e.target.select()}/></label><a className="text-button" href={link}>Open invitation ↗</a></div>}{permission&&<button className="text-button" disabled={busy} onClick={()=>void work(async()=>{await request('revoke',{permissionId:permission});setLink('');setPermission('');})}>Revoke invitation</button>}</>}
      {(snapshot.passport||journal)&&<RelayPassport passport={snapshot.passport??journal!}/>}
      {!invite&&snapshot.stage==='complete'&&snapshot.expedition===EXPEDITION&&<button className="primary-button" disabled={busy} onClick={()=>void work(async()=>{
        const result=await request('followup',{runId:snapshot.runId});setSnapshot(result);setRunId(result.runId);setGlyph(null);setBearing('north');setPermission('');setLink('');setJournal(null);
        history.replaceState(null,'',`/relay?run=${result.runId}`);
      })}>Open The Returning Light ↗</button>}
      {!invite&&!snapshot.passport&&<button className="text-button" disabled={busy} onClick={()=>void work(async()=>setJournal(await request('history',{tokenId:snapshot.tokenId})))}>Read Chog passport</button>}
      {invite&&snapshot.status&&snapshot.stage!=='complete'&&messages[snapshot.status]&&<p className="notice-message">{messages[snapshot.status]}</p>}
      {!invite&&runner&&<button className="text-button" disabled={busy} onClick={()=>{if(snapshot.chart)setSnapshot({...snapshot,puzzle:snapshot.chart});}}>Change signal · ends the current invitation</button>}
      <button className="text-button" disabled={busy} onClick={()=>void work(open)}>Reload saved run ↻</button></>}
      <button className="text-button" disabled={busy} onClick={()=>void work(async()=>{await client?.auth.signOut();disconnect.mutate();setSignedIn(false);setSnapshot(null);setJournal(null);setPermission('');setLink('');})}>Sign out</button></>}
      <div className="feedback-region" aria-live="polite">{error&&<p className="error-message" role="alert">{error}</p>}</div>
    </section></div>}</main><footer className="site-footer"><span>CHOGHOP / SMALL ADVENTURES TOGETHER</span><span>APP-MANAGED HISTORY · MONAD ONLY</span></footer></div>;
}

function TokenPortrait({tokenId}:{tokenId:string}) {
  const [failed,setFailed]=useState(false);
  return <figure className="token-portrait">{!failed&&<img src={`/api/relay/portrait?token=${encodeURIComponent(tokenId)}`} alt={`Portrait of Chog #${tokenId}`} width="96" height="96" onError={()=>setFailed(true)}/>}<figcaption><strong>Chog #{tokenId}</strong><br/>{failed?'Portrait unavailable. Token identity is retained.':'Collection portrait · ownership checked separately.'}</figcaption></figure>;
}
