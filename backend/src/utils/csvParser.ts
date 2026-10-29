import fs from 'fs';
import path from 'path';
import readline from 'readline';

export interface CsvRowData {
  aoiTime?: string;
  aoiMachine?: string;
  cvrTime?: string;
  jobName?: string;
  layerName?: string;
  processId?: string;
  lotId?: string;
  panelId?: string;
  unitId?: string;
  defectCode?: string;
  defectDescription?: string;
  xCoordinate?: string;
  yCoordinate?: string;
  pictureLink?: string;
}

export interface CsvParseResult {
  header: string[];
  firstRow?: CsvRowData;
  totalRows: number;
}

/**
 * Chuẩn hóa tên header (bỏ BOM, khoảng trắng thừa, lowercase hoặc trim)
 */
function normalizeHeaderName(raw: string): string {
  return raw.replace(/^\uFEFF/, '').trim();
}

/**
 * Tách một dòng CSV theo delimiter (hỗ trợ dấu phẩy ',' hoặc tab '\t')
 */
function splitLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * Parse file CSV từ UNC hoặc local filesystem
 */
export async function parseCsvFile(filePath: string, options: { firstRowOnly?: boolean } = {}): Promise<CsvParseResult> {
  await fs.promises.access(filePath);

  const fileStream = fs.createReadStream(filePath, { encoding: 'utf-8' });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let delimiter = ',';
  let headers: string[] = [];
  let headerIndexMap: Record<string, number> = {};
  let firstRow: CsvRowData | undefined;
  let totalRows = 0;
  let isFirstLine = true;
  let pending = '';
  let quoted = false;

  try {
   for await (const physicalLine of rl) {
    pending += (pending ? '\n' : '') + physicalLine;
    for (let index = 0; index < physicalLine.length; index++) {
      if (physicalLine[index] === '"') {
        if (quoted && physicalLine[index + 1] === '"') index++;
        else quoted = !quoted;
      }
    }
    if (quoted) continue;
    const line = pending;
    pending = '';
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (isFirstLine) {
      isFirstLine = false;
      // Auto-detect delimiter
      if (line.includes('\t')) {
        delimiter = '\t';
      } else {
        delimiter = ',';
      }

      headers = splitLine(line, delimiter).map(normalizeHeaderName);
      headers.forEach((h, idx) => {
        if (h) headerIndexMap[h.toLowerCase()] = idx;
      });
      continue;
    }

    totalRows++;
    if (!firstRow) {
      const cols = splitLine(line, delimiter);
      const getVal = (name: string): string => {
        const idx = headerIndexMap[name.toLowerCase()];
        if (idx !== undefined && idx < cols.length) {
          return cols[idx].trim();
        }
        return '';
      };

      firstRow = {
        aoiTime: getVal('AOI Time'),
        aoiMachine: getVal('AOI Machine'),
        cvrTime: getVal('CVR Time'),
        jobName: getVal('Job Name'),
        layerName: getVal('Layer Name'),
        processId: getVal('ProcessID'),
        lotId: getVal('Lot ID'),
        panelId: getVal('Panel ID'),
        unitId: getVal('Unit ID'),
        defectCode: getVal('Defect Code'),
        defectDescription: getVal('Defect Description'),
        xCoordinate: getVal('X Coordinate'),
        yCoordinate: getVal('Y Coordinate'),
        pictureLink: getVal('Picture link'),
      };
      if (options.firstRowOnly) break;
    }
   }
   if (quoted) throw new Error('CSV có trường quoted chưa đóng');
  } finally {
    rl.close();
    await new Promise<void>(resolve => {
      if (fileStream.closed) { resolve(); return; }
      fileStream.once('close', resolve);
      fileStream.destroy();
    });
  }

  return {
    header: headers,
    firstRow,
    totalRows,
  };
}
