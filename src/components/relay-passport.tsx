'use client';

import type { Passport } from '../relay/passport';
import { shortWallet } from '../relay/passport';
import { RoleIcon,SignalMark } from './symbols';
import { FOLLOWUP } from '../relay/permission';

export function RelayPassport({passport}:{passport:Passport}) {
  const entry=passport.entry??passport.entries.at(-1);
  if(!entry)return <section className="passport-page" aria-label="Chog passport"><h3>A story waiting for its first light.</h3><p>No stamps yet. Finish a shared expedition to record both contributions here.</p><p className="passport-disclaimer">App-managed NFT history · separate from practice.</p></section>;
  const returning=entry.expedition===FOLLOWUP;
  return <div className="relay-journal">
    <section className="passport-page earned-passport" aria-label={`Passport entry for Chog #${entry.tokenId}`}>
      <div className="passport-topline">CHOG #{entry.tokenId} / EXPEDITION PASSPORT <span>{returning?'02':'01'}</span></div>
      <svg className="passport-stamp" viewBox="0 0 180 180" fill="none" role="img" aria-label={`${entry.title} earned stamp`}>
        <circle cx="90" cy="90" r="78" stroke="currentColor" strokeWidth="2"/><circle cx="90" cy="90" r="69" stroke="currentColor" strokeDasharray="2 5"/>
        <text x="90" y="48" textAnchor="middle" fill="currentColor" fontSize="11" letterSpacing="2">{returning?'RETURNING LIGHT':'SHARED LIGHT'}</text>
        <path d="M70 76h40l6 49H64Zm8 0V64a12 12 0 0 1 24 0v12m-18 13 6 12-6 12-6-12Zm-22 38h56" stroke="currentColor" strokeWidth="2"/>
        {returning?<path d="M115 64a14 14 0 0 1 5-23 13 13 0 1 0 9 24" transform="translate(12 30)" stroke="currentColor"/>:<path d="m51 63 3-8 3 8 8 3-8 3-3 8-3-8-8-3Z" stroke="currentColor"/>}
        <text x="90" y="149" textAnchor="middle" fill="currentColor" fontSize="10" letterSpacing="2">KEPT TOGETHER</text>
      </svg>
      <div className="passport-story"><span>THE TIDELIGHT OBSERVATORY</span><h3>{entry.title}</h3><p>{entry.story}</p></div>
      <div className="passport-byline"><span title={entry.owner}><RoleIcon role="keeper"/> Keeper: {shortWallet(entry.owner)}</span><span title={entry.guest}><RoleIcon role="runner"/> Runner: {shortWallet(entry.guest)}</span></div>
      <details className="passport-addresses"><summary>Contributor wallets</summary><dl><dt>Keeper</dt><dd>{entry.owner}</dd><dt>Runner</dt><dd>{entry.guest}</dd></dl></details>
      <p className="passport-date">Recorded {new Date(entry.completedAt).toLocaleString()} · entry {entry.id}</p>
      <p className="passport-disclaimer">App-managed history associated with this NFT.<br/>Not an onchain stamp. {entry.environment==='test'?'Test record · not live history.':''}</p>
    </section>
    {passport.receipt&&<section className="owner-receipt" aria-label="Owner contribution receipt"><div className="role-label keeper-label"><RoleIcon role="keeper"/> RETURNED TO THE KEEPER</div><h3>Your contribution, returned.</h3><p>You prepared a {passport.receipt.keeperChoice} signal with Chog #{passport.receipt.tokenId}. {shortWallet(passport.receipt.guest)} decoded it and brought the light home.</p><div className="receipt-marks"><div><span>YOU SENT</span><SignalMark mark={passport.receipt.signal}/></div><span aria-hidden="true">→</span><div><span>YOUR FRIEND RESTORED</span><SignalMark mark={passport.receipt.restoration}/></div></div><p className="tray-caption">One shared record, credited to both wallets. Your Chog’s choice is remembered.</p></section>}
    <section className="passport-timeline" aria-label="Chog adventure timeline"><h3>A little history of light.</h3><ol>{passport.entries.map(item=><li key={item.id}><span className="timeline-seal" aria-hidden="true">{item.expedition===FOLLOWUP?'02':'01'}</span><div><strong>{item.title}</strong><p>{item.keeperChoice} signal · {item.restoration.glyph} lantern · {new Date(item.completedAt).toLocaleDateString()}</p></div></li>)}</ol></section>
  </div>;
}
