import { NextRequest, NextResponse } from 'next/server';
import { practiceStore } from '../../../practice/store.server';
import { isRecord } from '../../../puzzle/grammar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const COOKIE = 'choghop_practice';
const headers = { 'Cache-Control': 'no-store' };

function start(restarted: boolean) {
  const session = practiceStore.start();
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
  const id = request.cookies.get(COOKIE)?.value;
  const snapshot = id ? practiceStore.resume(id) : undefined;
  return snapshot ? NextResponse.json({ snapshot }, { headers }) : start(Boolean(id));
}

export async function DELETE(request: NextRequest) {
  if (wrongOrigin(request)) return NextResponse.json({ error: 'wrong_origin' }, { status: 403, headers });
  const id = request.cookies.get(COOKIE)?.value;
  if (id) practiceStore.remove(id);
  return start(false);
}

export async function POST(request: NextRequest) {
  if (wrongOrigin(request)) return NextResponse.json({ error: 'wrong_origin' }, { status: 403, headers });
  if (!request.headers.get('content-type')?.startsWith('application/json')) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 415, headers });
  }
  const id = request.cookies.get(COOKIE)?.value;
  if (!id) return NextResponse.json({ error: 'session_expired' }, { status: 410, headers });
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
    const body: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!isRecord(body)) return NextResponse.json({ error: 'invalid_request' }, { status: 400, headers });
    const result = practiceStore.submit(id, body.revision, body.action);
    if (!result.ok) return NextResponse.json({ error: result.error, ...('snapshot' in result ? { snapshot: result.snapshot } : {}) }, { status: result.status, headers });
    return NextResponse.json({ snapshot: result.snapshot }, { headers });
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400, headers });
  }
}
