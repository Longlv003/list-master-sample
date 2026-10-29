import path from 'path';

export interface ParsedFolderPath {
  isValid: boolean;
  warning?: string;
  year?: number;
  month?: number;
  itemCode?: string;
  itemSuffix?: string;
  day?: number;
  runDate?: string; // YYYY-MM-DD
  scanNum?: number;
  cvrNum?: number;
  scanMachineFolder?: string;
}

/**
 * Phân tích đường dẫn folder Scan theo quy tắc của Prompt:
 * Cấu trúc mẫu:
 * \\10.212.9.4\aoi-data\2.Ảnh AOM\2026\1. Mater sample (Cấm xóa)\Tháng 10\18. 6CRPV-CP\22-10\SCAN NO3-CVR45
 * Hoặc folder local kiểm thử:
 * ./SCAN NO5-CVR47
 */
export function parseScanFolderPath(folderPath: string): ParsedFolderPath {
  const normalized = folderPath.replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);

  let year: number | undefined;
  let month: number | undefined;
  let day: number | undefined;
  let itemCode: string | undefined;
  let itemSuffix: string | undefined;
  let scanNum: number | undefined;
  let cvrNum: number | undefined;

  // Lấy folder name cuối cùng: ví dụ "SCAN NO3-CVR45" hoặc "SCAN NO5-CVR47"
  const lastFolder = parts[parts.length - 1];
  const scanMatch = lastFolder.match(/SCAN\s*NO\s*(\d+)\s*-\s*CVR\s*(\d+)/i);
  if (scanMatch) {
    scanNum = parseInt(scanMatch[1], 10);
    cvrNum = parseInt(scanMatch[2], 10);
  }

  // Duyệt các parts để tìm ngày, item, tháng, năm
  for (let i = parts.length - 2; i >= 0; i--) {
    const part = parts[i];

    // Ngày: dạng 22-10 (DD-MM)
    if (!day && /^\d{1,2}-\d{1,2}$/.test(part)) {
      const [d, m] = part.split('-').map(Number);
      day = d;
      if (!month) month = m;
      continue;
    }

    // Item: dạng "18. 6CRPV-CP" hoặc "6CRPV"
    if (!itemCode) {
      const itemMatch = part.match(/^(?:\d+\.\s*)?([A-Za-z0-9]+)(?:-(.+))?$/);
      if (itemMatch && itemMatch[1].length >= 3 && !part.startsWith('Tháng') && !part.startsWith('20')) {
        itemCode = itemMatch[1];
        itemSuffix = itemMatch[2] || '';
        continue;
      }
    }

    // Tháng: dạng "Tháng 10" hoặc "Tháng 01"
    if (!month) {
      const monthMatch = part.match(/Tháng\s*(\d{1,2})/i);
      if (monthMatch) {
        month = parseInt(monthMatch[1], 10);
        continue;
      }
    }

    // Năm: 4 chữ số dạng 2026
    if (!year && /^\d{4}$/.test(part)) {
      year = parseInt(part, 10);
      continue;
    }
  }

  const missingDate = !year || !month || !day;
  // Standalone test folders remain visible but are explicitly marked as inferred.
  if (!year) year = new Date().getFullYear();
  if (!month) month = new Date().getMonth() + 1;
  if (!day) day = new Date().getDate();

  const formattedMonth = String(month).padStart(2, '0');
  const formattedDay = String(day).padStart(2, '0');
  const runDate = `${year}-${formattedMonth}-${formattedDay}`;
  const validDate = new Date(runDate + 'T00:00:00Z');
  const validCalendar = Number.isFinite(validDate.getTime()) && validDate.toISOString().slice(0, 10) === runDate;

  return {
    isValid: scanNum !== undefined && cvrNum !== undefined && validCalendar,
    warning: missingDate ? 'Ngày chạy suy ra vì đường dẫn thiếu ngày/tháng/năm' : undefined,
    year,
    month,
    day,
    runDate,
    itemCode,
    itemSuffix,
    scanNum,
    cvrNum,
    scanMachineFolder: lastFolder,
  };
}

/**
 * Phân loại ảnh theo tên file Auto hoặc Manual
 */
export function classifyImageFileName(filename: string): { type: 'auto' | 'manual' | 'unknown'; info?: any } {
  // Auto: kết thúc bằng _<NN>.jpg (NN là 2 chữ số)
  // Ví dụ: 17_1-4_FM_11.jpg
  const autoMatch = filename.match(/^(.+)_(\d{2})\.jpe?g$/i);
  if (autoMatch) {
    return {
      type: 'auto',
      info: {
        rawName: filename,
        modeCode: autoMatch[2],
      },
    };
  }

  // Manual: {Program}-{Layer}-{Item}-{Lot}-{Barcode}-{Block}.jpg
  // Ví dụ: 7M0510COPPER-REV01-BUTTON_1A-7M051G-00079-237-1.jpg
  const manualMatch = filename.match(/^([^-]+)-([^-]+)-([^-]+)-([^-]+)-([^-]+)-(\d+)\.jpe?g$/i);
  if (manualMatch) {
    return {
      type: 'manual',
      info: {
        program: manualMatch[1],
        layer: manualMatch[2],
        item: manualMatch[3],
        lot: manualMatch[4],
        barcode: manualMatch[5],
        block: manualMatch[6],
      },
    };
  }

  if (/\.jpe?g$/i.test(filename)) {
    return { type: 'manual', info: { rawName: filename } };
  }

  return { type: 'unknown' };
}
