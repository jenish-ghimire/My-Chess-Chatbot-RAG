import fs from 'fs';
import path from 'path';
import { DocumentChunk, parseMarkdownToChunks } from './markdownParser';
import { parseCsvToChunks } from './csvParser';
import { parsePdfToChunks } from './pdfParser';
import { recursiveCharacterSplit } from './chunker';

export * from './chunker';
export * from './markdownParser';
export * from './csvParser';
export * from './pdfParser';

/**
 * Ingests all supported files in a target directory and returns an array of structured chunks.
 */
export async function ingestDirectory(directoryPath: string): Promise<DocumentChunk[]> {
  if (!fs.existsSync(directoryPath)) {
    console.warn(`Directory not found: ${directoryPath}`);
    return [];
  }

  const fileNames = fs.readdirSync(directoryPath);
  const allChunks: DocumentChunk[] = [];

  for (const fileName of fileNames) {
    const fullPath = path.join(directoryPath, fileName);
    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) {
      // Recursively ingest subdirectories
      const subChunks = await ingestDirectory(fullPath);
      allChunks.push(...subChunks);
      continue;
    }

    const ext = path.extname(fileName).toLowerCase();

    try {
      if (ext === '.md' || ext === '.markdown') {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const chunks = parseMarkdownToChunks(fileName, content);
        allChunks.push(...chunks);
        console.log(`✓ Processed Markdown [${fileName}]: ${chunks.length} chunks`);
      } else if (ext === '.csv') {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const chunks = parseCsvToChunks(fileName, content);
        allChunks.push(...chunks);
        console.log(`✓ Processed CSV [${fileName}]: ${chunks.length} records/chunks`);
      } else if (ext === '.pdf') {
        const buffer = fs.readFileSync(fullPath);
        const chunks = await parsePdfToChunks(fileName, buffer);
        allChunks.push(...chunks);
        console.log(`✓ Processed PDF [${fileName}]: ${chunks.length} chunks`);
      } else if (ext === '.txt') {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const textPieces = recursiveCharacterSplit(content, { chunkSize: 500, chunkOverlap: 60 });
        const chunks = textPieces.map((piece, i) => ({
          id: `${fileName}#chunk-${i}`,
          documentName: fileName,
          chunkIndex: i,
          content: `[Document: ${fileName}]\n${piece}`,
          metadata: {
            source: fileName,
            fileType: 'txt',
          },
        }));
        allChunks.push(...chunks);
        console.log(`✓ Processed TXT [${fileName}]: ${chunks.length} chunks`);
      } else {
        console.log(`- Skipped unsupported file format: ${fileName}`);
      }
    } catch (err) {
      console.error(`Error processing file ${fileName}:`, err);
    }
  }

  return allChunks;
}
