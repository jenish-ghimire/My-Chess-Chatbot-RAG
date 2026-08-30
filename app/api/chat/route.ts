import { NextResponse } from 'next/server';
import { generateResponse } from '@/lib/llm';
import { retrieveContext, buildRAGSystemPrompt, extractSources } from '@/lib/rag';
import { logChatInteraction } from '@/lib/vector/db';

export async function POST(req: Request) {
  const requestStartTime = Date.now();

  try {
    const body = await req.json();
    const { message } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message payload is required and must be a string.' },
        { status: 400 }
      );
    }

    // Extract visitor info from request headers
    const userAgent = req.headers.get('user-agent') || undefined;

    // ── Stage 5: Full RAG Pipeline ──────────────────────────────
    let context;
    let ragSystemPrompt: string | undefined;
    let sources: ReturnType<typeof extractSources> = [];

    try {
      const topK = parseInt(process.env.TOP_K_CHUNKS || '5', 10);
      const threshold = parseFloat(process.env.RETRIEVAL_THRESHOLD || '0.3');

      context = await retrieveContext(message, topK, threshold);
      ragSystemPrompt = buildRAGSystemPrompt(context);
      sources = extractSources(context);

      console.log(
        `[RAG] Query: "${message.slice(0, 60)}..." → ${context.retrievedChunks.length} chunks retrieved in ${context.searchTimeMs}ms`
      );
    } catch (ragError: any) {
      console.warn('[RAG] Vector search failed, falling back to direct LLM:', ragError.message);
    }

    // Step 2: Send the RAG-augmented prompt to the LLM
    const result = await generateResponse(message, [], ragSystemPrompt);

    const responseTimeMs = Date.now() - requestStartTime;

    // ── Log the interaction asynchronously (non-blocking) ──────
    logChatInteraction({
      userQuery: message,
      assistantAnswer: result.answer,
      sourcesCited: sources.map((s) => ({ title: s.title, score: s.score })),
      chunksRetrieved: context?.retrievedChunks.length || 0,
      searchTimeMs: context?.searchTimeMs,
      responseTimeMs,
      provider: result.provider,
      model: result.model,
      userAgent,
    }).catch(() => {}); // Fire-and-forget — never block the response

    return NextResponse.json({
      answer: result.answer,
      provider: result.provider,
      model: result.model,
      sources,
      rag: context
        ? {
            chunksRetrieved: context.retrievedChunks.length,
            searchTimeMs: context.searchTimeMs,
          }
        : null,
    });
  } catch (error) {
    console.error('Error in /api/chat route:', error);
    return NextResponse.json(
      { error: 'Internal Server Error processing chat request.' },
      { status: 500 }
    );
  }
}
