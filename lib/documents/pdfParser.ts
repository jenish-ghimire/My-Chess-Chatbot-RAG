import { recursiveCharacterSplit, ChunkOptions } from './chunker';
import { DocumentChunk } from './markdownParser';
// @ts-ignore
import pdf from 'pdf-parse';

/**
 * Extracts raw text from PDF files and chunks it using natural boundaries.
 */
export async function parsePdfToChunks(
  fileName: string,
  pdfBuffer: Buffer,
  options: ChunkOptions = { chunkSize: 500, chunkOverlap: 60 }
): Promise<DocumentChunk[]> {
  try {
    const data = await pdf(pdfBuffer);
    const text = data.text || '';
    
    // Clean up excessive whitespace and hyphens
    const cleanedText = text
      .replace(/\r\n/g, '\n')
      .replace(/(\w+)-\n(\w+)/g, '$1$2') // rejoin hyphenated words across line breaks
      .replace(/[ \t]+/g, ' ')
      .trim();

    const textChunks = recursiveCharacterSplit(cleanedText, options);
    const chunks: DocumentChunk[] = [];

    for (let i = 0; i < textChunks.length; i++) {
      chunks.push({
        id: `${fileName}#chunk-${i}`,
        documentName: fileName,
        chunkIndex: i,
        content: `[Document: ${fileName}]\n${textChunks[i]}`,
        metadata: {
          source: fileName,
          fileType: 'pdf',
          totalPages: data.numpages,
        },
      });
    }

    return chunks;
  } catch (error) {
    console.error(`Failed to parse PDF file: ${fileName}`, error);
    return [];
  }
}
