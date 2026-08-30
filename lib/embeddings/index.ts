import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

export interface VectorEmbedding {
  id: string;
  vector: number[];
  text: string;
  metadata: Record<string, any>;
}

let bedrockClient: BedrockRuntimeClient | null = null;

function getBedrockClient(): BedrockRuntimeClient {
  if (!bedrockClient) {
    const region = process.env.MY_AWS_REGION || process.env.AWS_REGION || 'us-east-1';
    const accessKeyId = process.env.MY_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.MY_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS credentials missing. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in your .env file.');
    }

    bedrockClient = new BedrockRuntimeClient({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return bedrockClient;
}

/**
 * Generates a vector embedding for a given text string using
 * Amazon Titan Text Embeddings V2 (1024 dimensions).
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const modelId = process.env.BEDROCK_EMBEDDING_MODEL_ID || 'amazon.titan-embed-text-v2:0';

  const client = getBedrockClient();

  // Titan Embed V2 has a 8192 token limit — truncate if needed
  const truncatedText = text.slice(0, 8000);

  const command = new InvokeModelCommand({
    modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      inputText: truncatedText,
      dimensions: 1024,
      normalize: true,
    }),
  });

  const response = await client.send(command);
  const decoder = new TextDecoder('utf-8');
  const body = JSON.parse(decoder.decode(response.body));

  if (!body.embedding || !Array.isArray(body.embedding)) {
    throw new Error('Invalid embedding response from Titan model. Expected body.embedding array.');
  }

  return body.embedding as number[];
}

/**
 * Generates embeddings for a batch of texts, with optional delay to avoid rate limits.
 */
export async function generateEmbeddingsBatch(
  texts: string[],
  delayMs: number = 200
): Promise<number[][]> {
  const embeddings: number[][] = [];
  for (let i = 0; i < texts.length; i++) {
    try {
      const embedding = await generateEmbedding(texts[i]);
      embeddings.push(embedding);
      if (i < texts.length - 1 && delayMs > 0) {
        await new Promise((res) => setTimeout(res, delayMs));
      }
    } catch (err) {
      console.error(`Failed to embed chunk at index ${i}:`, err);
      embeddings.push([]); // push empty vector on failure — will be skipped on insert
    }
  }
  return embeddings;
}
