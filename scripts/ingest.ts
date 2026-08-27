import fs from 'fs';
import path from 'path';
import { ingestDirectory } from '../lib/documents';

async function runIngestion() {
  const documentsDir = path.resolve(process.cwd(), 'data', 'documents');
  const outputDir = path.resolve(process.cwd(), 'data');
  const outputFile = path.join(outputDir, 'chunks.json');

  console.log('====================================================');
  console.log('🚀 Stage 3: Document Ingestion & Chunking Pipeline');
  console.log('====================================================');
  console.log(`📁 Scanning directory: ${documentsDir}`);

  if (!fs.existsSync(documentsDir)) {
    fs.mkdirSync(documentsDir, { recursive: true });
    console.log(`✨ Created documents directory: ${documentsDir}`);
  }

  const startTime = Date.now();
  const chunks = await ingestDirectory(documentsDir);
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  if (chunks.length === 0) {
    console.log('\n⚠️ No document chunks produced.');
    console.log(`👉 Please place your .md, .csv, or .pdf files into: ${documentsDir}`);
    console.log('Then re-run: npm run ingest\n');
    return;
  }

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write chunks.json
  fs.writeFileSync(outputFile, JSON.stringify(chunks, null, 2), 'utf-8');

  // Stats computation
  const fileBreakdown: Record<string, number> = {};
  for (const chunk of chunks) {
    fileBreakdown[chunk.documentName] = (fileBreakdown[chunk.documentName] || 0) + 1;
  }

  console.log('\n====================================================');
  console.log('📊 Ingestion Summary');
  console.log('====================================================');
  console.log(`⏱️ Duration: ${duration}s`);
  console.log(`📄 Total Documents Processed: ${Object.keys(fileBreakdown).length}`);
  console.log(`🧩 Total Chunks Generated: ${chunks.length}`);
  console.log('\nBreakdown by file:');
  for (const [docName, count] of Object.entries(fileBreakdown)) {
    console.log(`  • ${docName}: ${count} chunks`);
  }
  console.log(`\n💾 Chunks successfully written to: ${outputFile}`);
  console.log('====================================================\n');
}

runIngestion().catch((err) => {
  console.error('❌ Ingestion pipeline failed:', err);
  process.exit(1);
});
