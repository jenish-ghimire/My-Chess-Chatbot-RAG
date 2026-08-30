import { getPool } from '../lib/vector/db';

async function createChatLogsTable() {
  const db = getPool();

  console.log('Creating chat_logs table...');

  await db.query(`
    CREATE TABLE IF NOT EXISTS chat_logs (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id        TEXT,
      user_query        TEXT NOT NULL,
      assistant_answer  TEXT NOT NULL,
      sources_cited     JSONB DEFAULT '[]',
      chunks_retrieved  INTEGER DEFAULT 0,
      search_time_ms    INTEGER,
      response_time_ms  INTEGER,
      provider          TEXT,
      model             TEXT,
      user_agent        TEXT,
      created_at        TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  console.log('✓ chat_logs table created successfully!');
  console.log('\nYou can now query visitor interactions with:');
  console.log('  SELECT user_query, assistant_answer, created_at FROM chat_logs ORDER BY created_at DESC;');

  await db.end();
}

createChatLogsTable().catch((err) => {
  console.error('Failed to create chat_logs table:', err);
  process.exit(1);
});
