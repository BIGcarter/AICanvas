import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { query, report_type = 'research_report' } = await req.json();
    
    if (!query) {
      return NextResponse.json(
        { error: 'Missing query parameter' },
        { status: 400 }
      );
    }

    console.log('Deep Research request:', { query, report_type });

    // 调用后端 Deep Research 接口
    const response = await fetch('http://localhost:8000/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, report_type }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Backend research API error:', errorData);
      return NextResponse.json(
        { error: 'Research failed', details: errorData.detail || 'Unknown error' },
        { status: response.status }
      );
    }

    const researchData = await response.json();
    console.log('Research completed:', researchData);

    return NextResponse.json(researchData);

  } catch (error) {
    console.error('Deep Research API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
