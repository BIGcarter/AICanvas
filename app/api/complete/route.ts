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
    const { baseUrl, apiKey, model, messages, temperature, top_p, max_tokens } = await req.json();
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
        messages: messages || [],
        stream: false,
        ...(temperature !== undefined ? { temperature } : {}),
        ...(top_p !== undefined ? { top_p } : {}),
        ...(max_tokens !== undefined ? { max_tokens } : {}),
      }),
    });

    const data = await upstream.json().catch(async () => ({ raw: await upstream.text() }));
    if (!upstream.ok) {
      const msg = (data as any)?.error?.message || upstream.statusText || 'Upstream error';
      return NextResponse.json({ ok: false, error: { message: msg }, raw: data }, { status: upstream.status || 502 });
    }

    const text = (data as any)?.choices?.[0]?.message?.content ?? (data as any)?.choices?.[0]?.text ?? '';
    return NextResponse.json({ ok: true, text, raw: data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: { message: e?.message || 'Unexpected error' } }, { status: 500 });
  }
}


