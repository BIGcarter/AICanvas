import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // 调用后端取消端点
    const response = await fetch('http://localhost:8000/cancel-research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Backend cancel API error: ${response.statusText}`);
    }

    const result = await response.json();
    return NextResponse.json(result);

  } catch (error) {
    console.error('Cancel research API call failed:', error);
    return NextResponse.json(
      { error: 'Failed to cancel research', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
