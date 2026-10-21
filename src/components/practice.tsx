'use client';

import { useEffect, useRef, useState } from 'react';
import { BEARINGS, GLYPHS } from '../puzzle/grammar';
import type { Bearing, Glyph, Mark, Treatment } from '../puzzle/grammar';
import type { KeeperView } from '../puzzle/engine';
import type { PracticeReply, PracticeSnapshot } from '../practice/types';
import { GlyphIcon, Pip, RoleIcon, SignalMark } from './symbols';
import { Observatory } from './observatory';

const messages: Record<string, string> = {
  incorrect_keeper: 'That mark doesn’t fit the chart. Check both the missing glyph and the clockwise arrow rule.',
  incorrect_runner: 'The light is still quiet. Check your lantern and arrow against both examples.',
  stale_revision: 'This practice moved on in another tab. We’ve brought you to its latest step.',
  session_expired: 'This practice session has ended. Start a fresh practice to light the lantern again.',
  too_many_attempts: 'Give the lantern a moment. Wait 30 seconds, then try your deduction again.',
  wrong_stage: 'That step has already moved on. Reload this practice to pick up where you left off.',
  network: 'The observatory couldn’t be reached. Your choices are still here. Try again when your connection returns.',
  storage_unavailable: 'Your saved practice can’t be reached just now. Your choices are still here. Please try again; we won’t replace your saved run.',
  incompatible_content: 'Your saved practice needs a field-note check. We’ve kept it safe. Please try again after the observatory is updated.',
};

export function MarkPicker({ glyph, bearing, onGlyph, onBearing, disabled }: {
  glyph: Glyph | null; bearing: Bearing; onGlyph: (glyph: Glyph) => void; onBearing: (bearing: Bearing) => void; disabled: boolean;
}) {
  return <div className="mark-picker">
    <fieldset disabled={disabled}><legend>Choose a glyph</legend><div className="glyph-options">
      {GLYPHS.map(value => <label key={value} className="glyph-option"><input type="radio" name="glyph" value={value} checked={glyph === value} onChange={() => onGlyph(value)} /><span><GlyphIcon glyph={value} />{value}</span></label>)}
    </div></fieldset>
    <fieldset disabled={disabled}><legend>Point the arrow</legend><div className="bearing-options">
      {BEARINGS.map((value, i) => <label key={value}><input type="radio" name="bearing" value={value} checked={bearing === value} onChange={() => onBearing(value)} /><span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M12 20V4m-6 6 6-6 6 6" transform={`rotate(${i * 90} 12 12)`} /></svg>{value}</span></label>)}
    </div></fieldset>
  </div>;
}

function PassportStamp() {
  return <svg className="passport-stamp" viewBox="0 0 180 180" fill="none" aria-hidden="true">
    <circle cx="90" cy="90" r="78" stroke="currentColor" strokeWidth="2" /><circle cx="90" cy="90" r="70" stroke="currentColor" strokeDasharray="2 5" />
    <path id="stamp-curve" d="M37 92a53 53 0 1 1 106 0" /><text fill="currentColor" fontSize="12" letterSpacing="2"><textPath href="#stamp-curve" startOffset="50%" textAnchor="middle">THE LAST LANTERN</textPath></text>
    <path d="M70 72h40l6 51H64Zm8 0V62a12 12 0 0 1 24 0v10m-42 53h60" stroke="currentColor" strokeWidth="2" /><path d="m90 83 7 15-7 12-7-12Z" fill="currentColor" /><path d="M52 139h76" stroke="currentColor" /><text x="90" y="153" textAnchor="middle" fill="currentColor" fontSize="10" letterSpacing="2">PRACTICE</text>
  </svg>;
}

export function Practice({ initial }: { initial: KeeperView }) {
  const [snapshot, setSnapshot] = useState<PracticeSnapshot | null>(null);
  const [interactive, setInteractive] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [glyph, setGlyph] = useState<Glyph | null>(null);
  const [bearing, setBearing] = useState<Bearing>('north');
  const [treatment, setTreatment] = useState<Treatment>('direct');
  const [inspection, setInspection] = useState('');
  const [expired, setExpired] = useState(false);
  const objective = useRef<HTMLHeadingElement>(null);
  const previousStage = useRef('keeper');
  const stage = snapshot?.stage ?? 'keeper';
  const keeper = snapshot?.stage === 'keeper' ? snapshot.puzzle : initial;

  useEffect(() => {
    setInteractive(true);
    const controller = new AbortController();
    fetch('/api/practice', { cache: 'no-store', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12_000)]) })
      .then(async response => {
        const reply: PracticeReply = await response.json();
        if (!response.ok) { setError(messages[reply.error ?? ''] ?? messages.network!); return; }
        if (!reply.snapshot) throw new Error('network');
        setSnapshot(reply.snapshot);
        if (reply.restarted) setNotice('Your earlier practice ended. A fresh chart is ready.');
      })
      .catch(() => { if (!controller.signal.aborted) setError(messages.network!); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (stage !== previousStage.current) {
      objective.current?.focus();
      previousStage.current = stage;
    }
  }, [stage]);

  async function request(action?: unknown, reset = false) {
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/practice', {
        method: reset ? 'DELETE' : action ? 'POST' : 'GET', cache: 'no-store',
        headers: action ? { 'Content-Type': 'application/json' } : {},
        ...(action ? { body: JSON.stringify({ revision: snapshot?.revision, action }) } : {}),
        signal: AbortSignal.timeout(12_000),
      });
      const reply: PracticeReply = await response.json();
      if (reply.snapshot) setSnapshot(reply.snapshot);
      if (!response.ok) {
        setExpired(reply.error === 'session_expired');
        setError(messages[reply.error ?? ''] ?? 'That move couldn’t be read. Please try again.');
      } else {
        setExpired(false);
        setInspection('');
        if (reset || reply.snapshot?.stage !== stage) { setGlyph(null); setBearing('north'); }
        if (reset) { setTreatment(snapshot?.stage === 'complete' && snapshot.treatment === 'direct' ? 'reflected' : 'direct'); setNotice('A fresh practice. The sea is waiting.'); }
      }
    } catch { setError(messages.network!); }
    finally { setBusy(false); }
  }

  function inspect(object: 'chart' | 'lens' | 'lanterns') {
    const copy = {
      chart: stage === 'keeper' ? 'Two chart marks survived. Each glyph belongs in one slot; the arrows turn clockwise as you read right.' : 'The Keeper’s chart stays with the Keeper. Read the received signal and the two examples beside the lanterns.',
      lens: stage === 'keeper' ? 'The lens can turn or reflect the signal. Your choice changes the rule the Runner will infer.' : 'Each etched example shows a received signal on the left and its matching lantern on the right. One rule must explain both.',
      lanterns: stage === 'complete' ? 'The lantern and the Keeper’s signal now agree. A warm light reaches the sea.' : 'Sun, moon, star. Each lantern can face north, east, south or west. The right glyph and bearing restore the light.',
    };
    setInspection(copy[object]);
  }

  const chosen: Mark | null = glyph ? { glyph, bearing } : null;
  return <>
    <a className="skip-link" href="#objective">Skip to puzzle</a>
    <div className="site-shell">
      <header className="site-header"><a className="wordmark" href="/" aria-label="ChogHop home"><RoleIcon role="runner" />ChogHop<span className="brand-star" aria-hidden="true">✦</span></a><div className="club-name">MIDNIGHT EXPEDITION CLUB</div><a className="practice-anchor" href="#objective">Enter the observatory <span aria-hidden="true">↗</span></a></header>
      <main>
        <section className="chapter-intro" aria-labelledby="chapter-title"><div><div className="eyebrow"><span className="tiny-star" aria-hidden="true" /> EXPEDITION 001 <span className="eyebrow-rule" /> A LITTLE MYSTERY FOR TWO</div><h1 id="chapter-title">The Last <span>Lantern.</span></h1></div><div className="intro-copy"><span className="practice-badge">WALLET-FREE PRACTICE</span><p>The lighthouse has gone quiet.{' '}<br />One Keeper. One Runner.{' '}<br /><span>A small signal can bring it home.</span></p></div></section>
        <div className="expedition-layout">
          <div className="scene-column"><Observatory stage={stage} selected={glyph} onInspect={inspect} interactive={interactive} />
            <div className="scene-note" role="status" aria-live="polite"><span className="note-index">FIELD NOTE /</span><p>{inspection || 'Explore the chart, lens and lanterns. Everything you need is already in the room.'}</p></div>
            <div className="practice-disclosure"><Pip /><p><strong>Meet Pip, your practice companion.</strong><br />An original sample character. You’ll try both roles yourself; no wallet, NFT or real invitation is involved.</p></div>
          </div>
          <section className={`action-panel stage-${stage}`} aria-label="Practice puzzle" aria-busy={busy}>
            <ol className="journey-steps" aria-label="Practice progress">
              {[['keeper', 'Chart'], ['handoff', 'Handoff'], ['runner', 'Light']].map(([key, label], i) => <li key={key} aria-current={stage === key ? 'step' : undefined} className={['keeper', 'handoff', 'runner', 'complete'].indexOf(stage) >= i ? 'reached' : ''}><span>{String(i + 1).padStart(2, '0')}</span>{label}</li>)}
            </ol>
            {stage === 'keeper' && <>
              <div className="role-label keeper-label"><RoleIcon role="keeper" /> YOU ARE THE KEEPER</div>
              <h2 id="objective" ref={objective} tabIndex={-1}>Read the missing mark.</h2><p className="objective-copy">Two clues survived the storm. What belongs in the torn space?</p>
              <div className="chart-evidence" aria-label="Damaged star chart">{([0, 1, 2] as const).map(slot => { const clue = keeper.clues.find(c => c.slot === slot); return <div key={slot} className={`chart-slot ${clue ? '' : 'missing-slot'}`}><span className="slot-number">0{slot + 1}</span>{clue ? <SignalMark mark={clue.mark} compact /> : <><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" aria-hidden="true"><path d="m6 2 8 5 8-4 4 12-5 10-10 5-7-9 4-8Z" strokeDasharray="3 4" /></svg><span className="missing-copy">torn away</span></>}</div>; })}</div>
              <p className="rule-note">{keeper.rule}</p>
              <form onSubmit={event => { event.preventDefault(); if (chosen) void request({ type: 'prepare', mark: chosen, treatment }); }}>
                <MarkPicker glyph={glyph} bearing={bearing} onGlyph={setGlyph} onBearing={setBearing} disabled={busy} />
                <fieldset className="treatment-picker" disabled={busy}><legend>How will you send it?</legend><div>{(['direct', 'reflected'] as const).map(value => <label key={value}><input type="radio" name="treatment" value={value} checked={treatment === value} onChange={() => setTreatment(value)} /><span><strong>{value === 'direct' ? 'Direct' : 'Reflected'}</strong><small>{value === 'direct' ? 'Turn the two wheels' : 'Mirror the two wheels'}</small></span></label>)}</div></fieldset>
                <div className="action-tray"><button className="primary-button" disabled={busy || !chosen || !snapshot || expired} type="submit">{busy ? 'Opening the chart…' : 'Prepare the signal'}<span aria-hidden="true">↗</span></button><span className="tray-caption">Your move makes the Runner’s clue.</span></div>
              </form>
            </>}
            {snapshot?.stage === 'handoff' && <>
              <div className="role-label keeper-label"><RoleIcon role="keeper" /> SIGNAL PREPARED</div><h2 id="objective" ref={objective} tabIndex={-1}>A little light to pass on.</h2>
              <div className="signal-transformation" aria-label="Your mark transformed into the received signal"><SignalMark mark={snapshot.prepared} /><span className="transform-bridge"><span>{snapshot.treatment === 'direct' ? 'TURNED' : 'REFLECTED'}</span><svg viewBox="0 0 54 18" fill="none" stroke="currentColor" aria-hidden="true"><path d="M0 9h50m-8-7 8 7-8 7" /></svg></span><SignalMark mark={snapshot.signal} /></div>
              <div className="invitation-ticket"><div className="ticket-topline">A PRACTICE INVITATION <span>№ 001</span></div><div className="ticket-character"><Pip /><div><strong>Pip</strong><span>Original sample character</span></div></div><dl><div><dt>From</dt><dd>You, the Keeper</dd></div><div><dt>To</dt><dd>You, trying the Runner role</dd></div><div><dt>Allowed move</dt><dd>One lantern restoration</dd></div><div><dt>Ends</dt><dd>{new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos' }).format(snapshot.expiresAt)} WAT · this practice session</dd></div></dl><p>Simulated handoff. No wallet permission is issued.</p></div>
              <p className="objective-copy">In a real relay, your friend starts here, with your signal and a different view of the room.</p><div className="action-tray"><button className="primary-button" disabled={busy || expired} onClick={() => void request({ type: 'accept_ticket' })}>Take the Runner role <span aria-hidden="true">↗</span></button></div>
            </>}
            {snapshot?.stage === 'runner' && <>
              <div className="role-label runner-label"><RoleIcon role="runner" /> YOU ARE THE RUNNER</div><h2 id="objective" ref={objective} tabIndex={-1}>Follow the signal home.</h2><p className="objective-copy">The lens changed the mark. Infer its rule from two etched examples.</p>
              <div className="received-signal"><span>RECEIVED SIGNAL</span><SignalMark mark={snapshot.puzzle.signal} /></div>
              <div className="environment-examples"><div className="examples-heading"><span>RECEIVED SIGNAL</span><span>MATCHING LANTERN</span></div>{snapshot.puzzle.examples.map((example, i) => <div className="example-pair" key={i}><SignalMark mark={example.signal} compact /><span className="example-arrow" aria-label="maps to">→</span><SignalMark mark={example.lantern} compact /></div>)}</div>
              <details className="rule-details"><summary>The wheels and their rule</summary><p>{snapshot.puzzle.rule}</p></details>
              <form onSubmit={event => { event.preventDefault(); if (chosen) void request({ type: 'restore', mark: chosen }); }}><MarkPicker glyph={glyph} bearing={bearing} onGlyph={setGlyph} onBearing={setBearing} disabled={busy} /><div className="action-tray"><button className="primary-button" type="submit" disabled={busy || !chosen || expired}>{busy ? 'Listening for the light…' : 'Restore the lantern'}<span aria-hidden="true">↗</span></button><span className="tray-caption">Trying an answer won’t spend your move.</span></div></form>
            </>}
            {snapshot?.stage === 'complete' && <>
              <div className="role-label runner-label"><RoleIcon role="runner" /> THE LIGHT IS HOME</div><h2 id="objective" ref={objective} tabIndex={-1}>A small shared story.</h2><div className="passport-page"><div className="passport-topline">EXPEDITION PASSPORT <span>01</span></div><PassportStamp /><div className="passport-story"><span>THE TIDELIGHT OBSERVATORY</span><h3>The Last Lantern</h3><p>You prepared a {snapshot.treatment} signal with Pip, then restored the {snapshot.restoration.glyph} lantern facing {snapshot.restoration.bearing}. The coast found its light again.</p></div><div className="passport-byline"><span><RoleIcon role="keeper" /> Keeper: you</span><span><RoleIcon role="runner" /> Runner: you</span></div><p className="passport-disclaimer">Practice preview · you played both roles.<br />No live passport entry or NFT history was created.</p></div><button className="primary-button" disabled={busy} onClick={() => void request(undefined, true)}>Try the other treatment <span aria-hidden="true">↗</span></button><p className="tray-caption">Same room. A different way to send the light.</p>
            </>}
            <div className="feedback-region" aria-live="polite" aria-atomic="true">{error && <div className="error-message" role="alert"><p>{error}</p>{expired ? <button className="text-button" disabled={busy} onClick={() => void request(undefined, true)}>Start fresh practice →</button> : <button className="text-button" disabled={busy} onClick={() => void request()}>Reload practice →</button>}</div>}{notice && <p className="notice-message">{notice}</p>}</div>
            {!snapshot && !busy && !error && <button className="text-button" onClick={() => void request()}>Open practice →</button>}
          </section>
        </div>
        <p className="relay-entry"><a className="practice-anchor" href="/relay">Bring a real Chog into the relay ↗</a></p>
        <details className="field-guide"><summary><span>FIRST TIME AT THE CLUB?</span> A field guide to this little relay <span aria-hidden="true">+</span></summary><div><p><strong>Keeper / the chart.</strong> Deduce the missing glyph and arrow. Choose a direct or reflected treatment to prepare the received signal.</p><p><strong>Runner / the lantern.</strong> Use the two environmental examples to infer how the received signal maps back to a lantern and its bearing. Each example follows the same rule.</p><p><strong>This is practice.</strong> You try both roles with a sample character. Your run is saved separately from live history and can be resumed in this browser for two hours. The live relay requires configured wallet authentication and collection ownership checks. NFT passport entries arrive in slice 5.</p></div></details>
      </main>
      <footer className="site-footer"><span>ChogHop <span className="footer-dot">/</span> MADE FOR SMALL ADVENTURES TOGETHER</span><span>PRACTICE ONLY · NO WALLET REQUIRED</span></footer>
    </div>
  </>;
}
