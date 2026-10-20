import { NextRequest, NextResponse } from 'next/server';
import { practiceStore } from '../../../practice/store.server';
import { isRecord } from '../../../puzzle/grammar';
import { IncompatibleRecord } from '../../../persistence/record';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const COOKIE = 'choghop_practice';
const headers = { 'Cache-Control': 'no-store' };

function unavailable(error: unknown) {
  return NextResponse.json({ error: error instanceof IncompatibleRecord ? 'incompatible_content' : 'storage_unavailable' }, { status: 503, headers });
}

async function start(restarted: boolean, previousId?: string) {
  const session = await practiceStore.start(previousId);
  const response = NextResponse.json({ snapshot: session.snapshot, restarted }, { headers });
  response.cookies.set(COOKIE, session.id, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict',
    path: '/api/practice', maxAge: 7200,
  });
  return response;
}

function wrongOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  // Next may normalize nextUrl.hostname to localhost behind its local server.
  // Host retains the incoming authority, including its port.
  return origin !== null && origin !== `${request.nextUrl.protocol}//${request.headers.get('host')}`;
}

export async function GET(request: NextRequest) {
  try {
    const id = request.cookies.get(COOKIE)?.value;
    const snapshot = id ? await practiceStore.resume(id) : undefined;
    return snapshot ? NextResponse.json({ snapshot }, { headers }) : await start(Boolean(id), id);
  } catch (error) { return unavailable(error); }
}

export async function DELETE(request: NextRequest) {
  if (wrongOrigin(request)) return NextResponse.json({ error: 'wrong_origin' }, { status: 403, headers });
  try { return await start(false, request.cookies.get(COOKIE)?.value); }
  catch (error) { return unavailable(error); }
}

export async function POST(request: NextRequest) {
  if (wrongOrigin(request)) return NextResponse.json({ error: 'wrong_origin' }, { status: 403, headers });
  if (!request.headers.get('content-type')?.startsWith('application/json')) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 415, headers });
  }
  const id = request.cookies.get(COOKIE)?.value;
  if (!id) return NextResponse.json({ error: 'session_expired' }, { status: 410, headers });
  let body: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) return NextResponse.json({ error: 'invalid_request' }, { status: 400, headers });
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2048) {
        await reader.cancel();
        return NextResponse.json({ error: 'request_too_large' }, { status: 413, headers });
      }
      chunks.push(value);
    }
    body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch { return NextResponse.json({ error: 'invalid_request' }, { status: 400, headers }); }
  if (!isRecord(body)) return NextResponse.json({ error: 'invalid_request' }, { status: 400, headers });
  try {
    const result = await practiceStore.submit(id, body.revision, body.action);
    if (!result.ok) return NextResponse.json({ error: result.error, ...('snapshot' in result ? { snapshot: result.snapshot } : {}) }, { status: result.status, headers });
    return NextResponse.json({ snapshot: result.snapshot }, { headers });
  } catch (error) { return unavailable(error); }
}
