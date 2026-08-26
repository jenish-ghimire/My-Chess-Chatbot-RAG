// LLM Service Abstraction & Interface definitions

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  sources?: Array<{
    documentId: string;
    title: string;
    snippet: string;
    score: number;
  }>;
}

export interface LLMResponse {
  answer: string;
  provider: 'bedrock' | 'openai' | 'mock';
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

/**
 * Placeholder LLM Client Interface for Stage 2 & beyond.
 */
export async function generateResponse(prompt: string, history: ChatMessage[] = []): Promise<LLMResponse> {
  // Stage 1/2 Mock implementation (to be connected with Bedrock / OpenAI in Stage 2)
  return {
    answer: `Received your question: "${prompt}". LLM provider connection is coming in Stage 2.`,
    provider: 'mock',
    model: 'ownerhive-mock-v1',
  };
}
