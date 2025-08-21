import { NextRequest, NextResponse } from 'next/server';

function buildModelsUrl(baseUrlRaw: string): string {
  const clean = baseUrlRaw.replace(/\/$/, '');
  // If base already ends with /v{n}[beta], just append /models
  if (/\/v\d+(?:beta)?$/.test(clean)) {
    return `${clean}/models`;
  }
  // If it already contains /models, assume full endpoint
  if (/\/models(\/.+)?$/.test(clean)) {
    return clean;
  }
  // Default OpenAI-compatible
  return `${clean}/v1/models`;
}

export async function POST(req: NextRequest) {
  try {
    const { baseUrl, apiKey } = await req.json();
    if (!baseUrl || typeof baseUrl !== 'string') {
      return NextResponse.json({ error: { message: 'Missing baseUrl' } }, { status: 400 });
    }

    const url = buildModelsUrl(baseUrl);
    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      // Don't forward credentials
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return NextResponse.json({ error: { message: data?.error?.message || resp.statusText } }, { status: resp.status });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: { message: e?.message || 'Unexpected error' } }, { status: 500 });
  }
}


