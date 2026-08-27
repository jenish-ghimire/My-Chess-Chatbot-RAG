export interface ChunkOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  separators?: string[];
}

/**
 * Recursive character splitter that respects natural text boundaries
 * (paragraphs, newlines, sentence endings) before breaking on words/characters.
 */
export function recursiveCharacterSplit(
  text: string,
  options: ChunkOptions = {}
): string[] {
  const chunkSize = options.chunkSize ?? 500;
  const chunkOverlap = options.chunkOverlap ?? 60;
  const separators = options.separators ?? ['\n\n', '\n', '. ', '? ', '! ', '; ', ', ', ' ', ''];

  if (!text || text.trim().length === 0) {
    return [];
  }

  // If text already fits within the chunk size, return it directly
  if (text.length <= chunkSize) {
    return [text.trim()];
  }

  return splitText(text, separators, chunkSize, chunkOverlap);
}

function splitText(
  text: string,
  separators: string[],
  chunkSize: number,
  chunkOverlap: number
): string[] {
  const finalChunks: string[] = [];

  // Pick the best separator present in the text
  let chosenSeparator = separators[separators.length - 1]; // default to character split
  let newSeparators: string[] = [];

  for (let i = 0; i < separators.length; i++) {
    const sep = separators[i];
    if (sep === '' || text.includes(sep)) {
      chosenSeparator = sep;
      newSeparators = separators.slice(i + 1);
      break;
    }
  }

  const splits = chosenSeparator === '' ? text.split('') : text.split(chosenSeparator);

  let currentDoc: string[] = [];
  let currentLen = 0;

  for (const s of splits) {
    const piece = s.trim();
    if (!piece) continue;

    const pieceLen = piece.length + (chosenSeparator === '' ? 0 : chosenSeparator.length);

    if (currentLen + pieceLen > chunkSize && currentDoc.length > 0) {
      const chunkText = currentDoc.join(chosenSeparator).trim();
      if (chunkText.length > 0) {
        if (chunkText.length > chunkSize && newSeparators.length > 0) {
          // Sub-split oversized chunk
          finalChunks.push(...splitText(chunkText, newSeparators, chunkSize, chunkOverlap));
        } else {
          finalChunks.push(chunkText);
        }
      }

      // Calculate overlap back-window
      while (currentLen > chunkOverlap && currentDoc.length > 0) {
        const removed = currentDoc.shift()!;
        currentLen -= (removed.length + (chosenSeparator === '' ? 0 : chosenSeparator.length));
      }
    }

    currentDoc.push(piece);
    currentLen += pieceLen;
  }

  if (currentDoc.length > 0) {
    const lastChunk = currentDoc.join(chosenSeparator).trim();
    if (lastChunk.length > 0) {
      if (lastChunk.length > chunkSize && newSeparators.length > 0) {
        finalChunks.push(...splitText(lastChunk, newSeparators, chunkSize, chunkOverlap));
      } else {
        finalChunks.push(lastChunk);
      }
    }
  }

  return finalChunks.filter((c) => c.length > 10);
}
