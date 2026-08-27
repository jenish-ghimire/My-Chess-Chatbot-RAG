import { Pool, PoolClient } from 'pg';

export interface StoredChunk {
  id: string;
  document_name: string;
  chunk_index: number;
  content: string;
  metadata: Record<string, any>;
  embedding?: number[];
}

export interface SimilarityResult {
  id: string;
  document_name: string;
  content: string;
  metadata: Record<string, any>;
  similarity: number;
}

let pool: Pool | null = null;

/**
 * Returns a singleton PostgreSQL connection pool.
 * Reads DATABASE_URL from environment variables.
 */
export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        'DATABASE_URL is not set. Add your AWS RDS connection string to .env:\n' +
        'DATABASE_URL=postgresql://postgres:PASSWORD@your-rds-endpoint:5432/chess_assistant'
      );
    }
    const isLocal =
      connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

    pool = new Pool({
      connectionString,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected PostgreSQL pool error:', err);
    });
  }
  return pool;
}

/**
 * Initialize the database schema.
 * Creates the pgvector extension and chess_chunks table if not exists.
 */
export async function initSchema(): Promise<void> {
  const db = getPool();
  const client: PoolClient = await db.connect();

  try {
    await client.query('BEGIN');

    // Enable pgvector extension
    await client.query('CREATE EXTENSION IF NOT EXISTS vector');

    // Create main chunks table with VECTOR(1024) for Titan Embed V2
    await client.query(`
      CREATE TABLE IF NOT EXISTS chess_chunks (
        id            TEXT PRIMARY KEY,
        document_name TEXT NOT NULL,
        chunk_index   INTEGER NOT NULL,
        content       TEXT NOT NULL,
        metadata      JSONB DEFAULT '{}',
        embedding     VECTOR(1024),
        created_at    TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Create cosine similarity index for fast vector search
    await client.query(`
      CREATE INDEX IF NOT EXISTS chess_chunks_embedding_idx
      ON chess_chunks
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 50)
    `);

    await client.query('COMMIT');
    console.log('✓ PostgreSQL schema initialized (chess_chunks table ready)');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Upsert a single chunk with its embedding into the chess_chunks table.
 */
export async function upsertChunk(
  chunk: StoredChunk,
  embedding: number[]
): Promise<void> {
  if (!embedding || embedding.length === 0) {
    console.warn(`Skipping chunk ${chunk.id} — empty embedding vector.`);
    return;
  }

  const db = getPool();

  // Format vector as PostgreSQL-compatible string e.g. '[0.1,0.2,...]'
  const vectorStr = `[${embedding.join(',')}]`;

  await db.query(
    `INSERT INTO chess_chunks (id, document_name, chunk_index, content, metadata, embedding)
     VALUES ($1, $2, $3, $4, $5, $6::vector)
     ON CONFLICT (id) DO UPDATE
       SET content       = EXCLUDED.content,
           metadata      = EXCLUDED.metadata,
           embedding     = EXCLUDED.embedding,
           created_at    = NOW()`,
    [
      chunk.id,
      chunk.document_name,
      chunk.chunk_index,
      chunk.content,
      JSON.stringify(chunk.metadata),
      vectorStr,
    ]
  );
}

/**
 * Performs a cosine similarity search against the chess_chunks table.
 * Returns the top-K most semantically relevant chunks.
 */
export async function similaritySearch(
  queryEmbedding: number[],
  topK: number = 3,
  threshold: number = 0.0
): Promise<SimilarityResult[]> {
  if (!queryEmbedding || queryEmbedding.length === 0) {
    throw new Error('Query embedding is empty. Cannot perform similarity search.');
  }

  const db = getPool();
  const vectorStr = `[${queryEmbedding.join(',')}]`;

  const result = await db.query(
    `SELECT
       id,
       document_name,
       content,
       metadata,
       1 - (embedding <=> $1::vector) AS similarity
     FROM chess_chunks
     WHERE 1 - (embedding <=> $1::vector) >= $2
     ORDER BY embedding <=> $1::vector
     LIMIT $3`,
    [vectorStr, threshold, topK]
  );

  return result.rows.map((row) => ({
    id: row.id,
    document_name: row.document_name,
    content: row.content,
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
    similarity: parseFloat(row.similarity),
  }));
}

/**
 * Returns the total number of chunk rows stored in the database.
 */
export async function getChunkCount(): Promise<number> {
  const db = getPool();
  const result = await db.query('SELECT COUNT(*) FROM chess_chunks');
  return parseInt(result.rows[0].count, 10);
}

/**
 * Close the connection pool (call during server shutdown).
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
