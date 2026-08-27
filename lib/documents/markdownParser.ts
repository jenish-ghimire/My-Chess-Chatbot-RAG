import { recursiveCharacterSplit, ChunkOptions } from './chunker';

export interface DocumentChunk {
  id: string;
  documentName: string;
  chunkIndex: number;
  content: string;
  metadata: {
    source: string;
    fileType: string;
    sectionTitle?: string;
    headingHierarchy?: string[];
    [key: string]: any;
  };
}

/**
 * Parses markdown text, recognizing headers to preserve contextual hierarchy
 * and chunking within logical sections.
 */
export function parseMarkdownToChunks(
  fileName: string,
  rawMarkdown: string,
  options: ChunkOptions = { chunkSize: 500, chunkOverlap: 60 }
): DocumentChunk[] {
  const lines = rawMarkdown.split('\n');
  const chunks: DocumentChunk[] = [];

  let currentHeading = 'Overview';
  let headingStack: string[] = ['Overview'];
  let currentSectionLines: string[] = [];
  let chunkCounter = 0;

  const flushSection = () => {
    const sectionBody = currentSectionLines.join('\n').trim();
    if (sectionBody.length > 0) {
      const splitPieces = recursiveCharacterSplit(sectionBody, options);
      for (const piece of splitPieces) {
        // Prepend contextual heading tag if not already at the start
        const enrichedContent = piece.startsWith('#')
          ? piece
          : `[Section: ${currentHeading}]\n${piece}`;

        chunks.push({
          id: `${fileName}#chunk-${chunkCounter++}`,
          documentName: fileName,
          chunkIndex: chunkCounter,
          content: enrichedContent,
          metadata: {
            source: fileName,
            fileType: 'markdown',
            sectionTitle: currentHeading,
            headingHierarchy: [...headingStack],
          },
        });
      }
    }
    currentSectionLines = [];
  };

  for (const line of lines) {
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      // Flush previous section before changing context
      flushSection();

      const level = headerMatch[1].length;
      const title = headerMatch[2].trim();
      currentHeading = title;

      // Adjust heading stack based on level
      if (level === 1) {
        headingStack = [title];
      } else if (level <= headingStack.length) {
        headingStack = headingStack.slice(0, level - 1);
        headingStack.push(title);
      } else {
        headingStack.push(title);
      }

      currentSectionLines.push(line);
    } else {
      currentSectionLines.push(line);
    }
  }

  // Flush any trailing section
  flushSection();

  return chunks;
}
