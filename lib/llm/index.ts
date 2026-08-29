import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

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

let bedrockClient: BedrockRuntimeClient | null = null;

function getBedrockClient(): BedrockRuntimeClient {
  const region = process.env.AWS_REGION || 'us-east-1';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('AWS credentials missing.');
  }

  if (!bedrockClient) {
    bedrockClient = new BedrockRuntimeClient({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return bedrockClient;
}

/**
 * Generates a response from the LLM using a provided system prompt.
 * In Stage 5, the system prompt comes from the RAG pipeline (with retrieved context injected).
 */
export async function generateResponse(
  prompt: string,
  history: ChatMessage[] = [],
  systemPrompt?: string
): Promise<LLMResponse> {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const modelId = process.env.BEDROCK_MODEL_ID || 'us.meta.llama3-1-8b-instruct-v1:0';

  // If AWS credentials are not set, return a helpful setup response
  if (!accessKeyId || !secretAccessKey) {
    return {
      answer: `👋 Welcome! I am your Chess AI Assistant.\n\nAWS Bedrock credentials are not configured. Add them to your \`.env\` file.\n\n*Currently running in Local Mock Mode.*`,
      provider: 'mock',
      model: 'local-mock-client',
    };
  }

  // Use provided system prompt (from RAG pipeline) or fall back to a default
  const finalSystemPrompt =
    systemPrompt ||
    `You are the official Chess AI Assistant exclusively dedicated to the chess profile, ratings, and career of Jenish Ghimire. If asked questions unrelated to chess or Jenish, decline politely and invite the user to ask about Jenish's chess profile instead.`;

  try {
    const client = getBedrockClient();
    let requestBody: string;

    // Support both Claude (Anthropic) and Llama 3/3.1 (Meta) payloads
    if (modelId.includes('meta.llama')) {
      let promptText = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n${finalSystemPrompt}<|eot_id|>\n`;

      for (const msg of history) {
        promptText += `<|start_header_id|>${msg.role}<|end_header_id|>\n\n${msg.content}<|eot_id|>\n`;
      }

      promptText += `<|start_header_id|>user<|end_header_id|>\n\n${prompt}<|eot_id|>\n<|start_header_id|>assistant<|end_header_id|>\n\n`;

      requestBody = JSON.stringify({
        prompt: promptText,
        max_gen_len: 1024,
        temperature: 0.7,
        top_p: 0.9,
      });
    } else {
      // Default to Claude Messages API
      const messagesPayload = [
        ...history.map((msg) => ({
          role: msg.role === 'assistant' ? ('assistant' as const) : ('user' as const),
          content: msg.content,
        })),
        { role: 'user' as const, content: prompt },
      ];

      requestBody = JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1024,
        system: finalSystemPrompt,
        messages: messagesPayload,
        temperature: 0.7,
      });
    }

    const command = new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: requestBody,
    });

    const response = await client.send(command);
    const decoder = new TextDecoder('utf-8');
    const responseBody = JSON.parse(decoder.decode(response.body));

    let answer: string;
    if (modelId.includes('meta.llama')) {
      answer = responseBody.generation || 'No response content generated.';
    } else {
      answer = responseBody.content?.[0]?.text || 'No response content generated.';
    }

    return {
      answer,
      provider: 'bedrock',
      model: modelId,
    };
  } catch (error: any) {
    console.error('Error invoking AWS Bedrock model:', error);
    return {
      answer: `⚠️ Error invoking AWS Bedrock (${error.message || 'Unknown error'}). Please verify your credentials and model access.`,
      provider: 'mock',
      model: 'error-fallback',
    };
  }
}
