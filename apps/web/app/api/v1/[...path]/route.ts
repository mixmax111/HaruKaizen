import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getBackendBaseUrl(): string {
  const url =
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://127.0.0.1:8002/api/v1';
  return url.replace(/\/+$/, '');
}

async function proxyRequest(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const subPath = path ? path.join('/') : '';
  const search = req.nextUrl.search;
  const backendBase = getBackendBaseUrl();
  const targetUrl = `${backendBase}/${subPath}${search}`;

  const forwardHeaders = new Headers(req.headers);
  forwardHeaders.delete('host');

  try {
    const hasBody = !['GET', 'HEAD'].includes(req.method.toUpperCase());
    const body = hasBody ? await req.arrayBuffer() : undefined;

    const res = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body,
      redirect: 'manual',
    });

    const responseHeaders = new Headers(res.headers);
    responseHeaders.delete('set-cookie');

    const nextResponse = new NextResponse(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
    });

    // Inoltra correttamente tutti i cookie Set-Cookie ricevuti dal backend NestJS
    const rawHeaders: any = res.headers;
    const cookies: string[] =
      typeof rawHeaders.getSetCookie === 'function'
        ? rawHeaders.getSetCookie()
        : (res.headers.get('set-cookie') ? [res.headers.get('set-cookie')!] : []);

    for (const cookie of cookies) {
      nextResponse.headers.append('set-cookie', cookie);
    }

    return nextResponse;
  } catch (error: any) {
    console.error(`[API Proxy Error] Fallita chiamata a ${targetUrl}:`, error.message);
    return NextResponse.json(
      {
        error: {
          code: 'BACKEND_GATEWAY_ERROR',
          message: `Impossibile raggiungere il backend HaruKaizen su ${targetUrl}: ${error.message}`,
        },
      },
      { status: 502 }
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
export const OPTIONS = proxyRequest;

