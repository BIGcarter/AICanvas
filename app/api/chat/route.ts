import { NextRequest, NextResponse } from 'next/server';

function buildChatUrl(baseUrlRaw: string): string {
  const base = baseUrlRaw.replace(/\/$/, '');
  // If already has /chat/completions
  if (/\/chat\/completions$/.test(base)) return base;
  // If ends with /v1 or /v1beta etc.
  if (/\/v\d+(?:beta)?$/.test(base)) return `${base}/chat/completions`;
  // Some providers put openai compat under /openai
  if (/\/openai$/.test(base)) return `${base}/v1/chat/completions`;
  // Default
  return `${base}/v1/chat/completions`;
}

export async function POST(req: NextRequest) {
  try {
    const { baseUrl, apiKey, model, messages, temperature, top_p, max_tokens } = await req.json();
    if (!baseUrl || !model) {
      return NextResponse.json({ error: { message: 'Missing baseUrl or model' } }, { status: 400 });
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
        stream: true,
        ...(temperature !== undefined ? { temperature } : {}),
        ...(top_p !== undefined ? { top_p } : {}),
        ...(max_tokens !== undefined ? { max_tokens } : {}),
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const errText = await upstream.text().catch(() => upstream.statusText);
      return NextResponse.json({ error: { message: errText || 'Upstream error' } }, { status: upstream.status || 502 });
    }

    const readable = new ReadableStream({
      async start(controller) {
        const reader = upstream.body!.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) controller.enqueue(value);
          }
        } catch (e) {
          // ignore
        } finally {
          controller.close();
        }
      },
    });

    return new NextResponse(readable, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'Transfer-Encoding': 'chunked',
        // Allow client to read in browser
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: { message: e?.message || 'Unexpected error' } }, { status: 500 });
  }
}


