import { NextResponse } from 'next/server';
import { generateResponse } from '@/lib/llm';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message payload is required and must be a string.' },
        { status: 400 }
      );
    }

    // Generate response using LLM service (Mock for Stage 1, ready for Bedrock/OpenAI in Stage 2)
    const result = await generateResponse(message);

    return NextResponse.json({
      answer: result.answer,
      provider: result.provider,
      model: result.model,
    });
  } catch (error) {
    console.error('Error in /api/chat route:', error);
    return NextResponse.json(
      { error: 'Internal Server Error processing chat request.' },
      { status: 500 }
    );
  }
}
