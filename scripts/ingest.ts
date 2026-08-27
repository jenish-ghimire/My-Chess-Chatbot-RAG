import fs from 'fs';
import path from 'path';
import { ingestDirectory, DocumentChunk } from '../lib/documents';
import { generateEmbedding } from '../lib/embeddings';
import { initSchema, upsertChunk, getChunkCount } from '../lib/vector/db';

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runIngestion() {
  const documentsDir = path.resolve(process.cwd(), 'data', 'documents');
  const outputDir = path.resolve(process.cwd(), 'data');
  const outputFile = path.join(outputDir, 'chunks.json');

  console.log('====================================================');
  console.log('🚀 Stage 3+4: Document Ingestion & Vector Pipeline');
  console.log('====================================================');
  console.log(`📁 Scanning directory: ${documentsDir}`);

  if (!fs.existsSync(documentsDir)) {
    fs.mkdirSync(documentsDir, { recursive: true });
    console.log(`✨ Created documents directory: ${documentsDir}`);
  }

  // ─── Stage 3: Chunk all documents ────────────────────────────────
  console.log('\n📄 Stage 3: Chunking documents...');
  const startChunk = Date.now();
  const chunks: DocumentChunk[] = await ingestDirectory(documentsDir);
  const chunkDuration = ((Date.now() - startChunk) / 1000).toFixed(2);

  if (chunks.length === 0) {
    console.log('\n⚠️ No chunks generated.');
    console.log(`👉 Place your .md, .csv, or .pdf files in: ${documentsDir}`);
    console.log('Then re-run: npm run ingest\n');
    return;
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputFile, JSON.stringify(chunks, null, 2), 'utf-8');

  const fileBreakdown: Record<string, number> = {};
  for (const chunk of chunks) {
    fileBreakdown[chunk.documentName] = (fileBreakdown[chunk.documentName] || 0) + 1;
  }

  console.log(`\n✅ Stage 3 Complete (${chunkDuration}s)`);
  console.log(`   📦 ${chunks.length} total chunks from ${Object.keys(fileBreakdown).length} documents`);
  for (const [doc, count] of Object.entries(fileBreakdown)) {
    console.log(`      • ${doc}: ${count} chunks`);
  }
  console.log(`   💾 Saved to: ${outputFile}`);

  // ─── Stage 4: Embed + Upsert into pgvector ───────────────────────
  const hasDb = !!process.env.DATABASE_URL;

  if (!hasDb) {
    console.log('\n⚠️  Stage 4 Skipped — DATABASE_URL not set in .env');
    console.log('   Set up AWS RDS and add DATABASE_URL to continue.');
    console.log('   Chunks are saved in data/chunks.json for future embedding.\n');
    return;
  }

  console.log('\n🔢 Stage 4: Generating embeddings & storing in pgvector...');
  console.log('   (Using Amazon Titan Text Embeddings V2 via Bedrock)');

  // Initialize DB schema
  await initSchema();

  let embeddedCount = 0;
  let failedCount = 0;
  const startEmbed = Date.now();

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const progress = `[${i + 1}/${chunks.length}]`;

    try {
      process.stdout.write(`   ${progress} Embedding: ${chunk.id.slice(0, 50)}...`);
      const embedding = await generateEmbedding(chunk.content);

      await upsertChunk(
        {
          id: chunk.id,
          document_name: chunk.documentName,
          chunk_index: chunk.chunkIndex,
          content: chunk.content,
          metadata: chunk.metadata,
        },
        embedding
      );

      embeddedCount++;
      process.stdout.write(` ✓\n`);
    } catch (err: any) {
      failedCount++;
      process.stdout.write(` ✗\n`);
      console.error(`   Error embedding chunk ${chunk.id}: ${err.message}`);
    }

    // Rate limiting — ~200ms between Bedrock API calls
    if (i < chunks.length - 1) {
      await sleep(200);
    }
  }

  const embedDuration = ((Date.now() - startEmbed) / 1000).toFixed(2);
  const totalCount = await getChunkCount();

  console.log('\n====================================================');
  console.log('✅ Stage 4 Complete!');
  console.log('====================================================');
  console.log(`⏱️  Embedding duration: ${embedDuration}s`);
  console.log(`✅ Successfully embedded: ${embeddedCount} chunks`);
  if (failedCount > 0) console.log(`❌ Failed: ${failedCount} chunks`);
  console.log(`🗄️  Total rows in chess_chunks table: ${totalCount}`);
  console.log('====================================================\n');
}

runIngestion().catch((err) => {
  console.error('❌ Ingestion pipeline failed:', err);
  process.exit(1);
});
