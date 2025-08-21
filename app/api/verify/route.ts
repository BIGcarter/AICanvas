import { NextRequest, NextResponse } from 'next/server';

function buildChatUrl(baseUrlRaw: string): string {
  const base = baseUrlRaw.replace(/\/$/, '');
  if (/\/chat\/completions$/.test(base)) return base;
  if (/\/v\d+(?:beta)?$/.test(base)) return `${base}/chat/completions`;
  if (/\/openai$/.test(base)) return `${base}/v1/chat/completions`;
  return `${base}/v1/chat/completions`;
}

export async function POST(req: NextRequest) {
  try {
    const { baseUrl, apiKey, model } = await req.json();
    if (!baseUrl || !model) {
      return NextResponse.json({ ok: false, error: { message: 'Missing baseUrl or model' } }, { status: 400 });
    }
    const url = buildChatUrl(baseUrl);
    const upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'ping' }],
        stream: false,
        temperature: 0,
        max_tokens: 1,
      }),
    });

    const data = await upstream.json().catch(async () => ({ raw: await upstream.text() }));
    if (!upstream.ok) {
      const msg = data?.error?.message || upstream.statusText || 'Upstream error';
      return NextResponse.json({ ok: false, error: { message: msg } }, { status: upstream.status || 502 });
    }

    // For OpenAI compat, expect choices array
    const ok = Array.isArray((data as any)?.choices);
    return NextResponse.json({ ok, sample: ok ? (data as any)?.choices?.[0] : data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: { message: e?.message || 'Unexpected error' } }, { status: 500 });
  }
}


