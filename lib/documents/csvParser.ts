import { parse } from 'csv-parse/sync';
import { DocumentChunk } from './markdownParser';

/**
 * Converts CSV tabular data into semantic natural-language sentences.
 * This ensures vector similarity searches accurately match search queries against table contents.
 */
export function parseCsvToChunks(
  fileName: string,
  rawCsv: string
): DocumentChunk[] {
  let records: Record<string, string>[] = [];

  try {
    records = parse(rawCsv, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
  } catch (error) {
    console.error(`Failed to parse CSV file: ${fileName}`, error);
    return [];
  }

  const chunks: DocumentChunk[] = [];
  let chunkIndex = 0;

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const rowEntries = Object.entries(row).filter(([_, val]) => val && String(val).trim().length > 0);

    if (rowEntries.length === 0) continue;

    // Convert row entries to a clear, descriptive narrative statement
    const rowText = rowEntries.map(([col, val]) => `${col}: ${val}`).join(' | ');
    const narrative = `[Record from ${fileName} (Row ${i + 1})]\n${rowText}`;

    chunks.push({
      id: `${fileName}#row-${i + 1}`,
      documentName: fileName,
      chunkIndex: chunkIndex++,
      content: narrative,
      metadata: {
        source: fileName,
        fileType: 'csv',
        rowIndex: i + 1,
        rowData: row,
      },
    });
  }

  return chunks;
}
