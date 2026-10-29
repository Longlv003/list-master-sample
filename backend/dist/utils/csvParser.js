"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCsvFile = parseCsvFile;
const fs_1 = __importDefault(require("fs"));
const readline_1 = __importDefault(require("readline"));
/**
 * Chuẩn hóa tên header (bỏ BOM, khoảng trắng thừa, lowercase hoặc trim)
 */
function normalizeHeaderName(raw) {
    return raw.replace(/^\uFEFF/, '').trim();
}
/**
 * Tách một dòng CSV theo delimiter (hỗ trợ dấu phẩy ',' hoặc tab '\t')
 */
function splitLine(line, delimiter) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            }
            else {
                inQuotes = !inQuotes;
            }
        }
        else if (char === delimiter && !inQuotes) {
            result.push(current);
            current = '';
        }
        else {
            current += char;
        }
    }
    result.push(current);
    return result;
}
/**
 * Parse file CSV từ UNC hoặc local filesystem
 */
async function parseCsvFile(filePath, options = {}) {
    await fs_1.default.promises.access(filePath);
    const fileStream = fs_1.default.createReadStream(filePath, { encoding: 'utf-8' });
    const rl = readline_1.default.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
    });
    let delimiter = ',';
    let headers = [];
    let headerIndexMap = {};
    let firstRow;
    let totalRows = 0;
    let isFirstLine = true;
    let pending = '';
    let quoted = false;
    try {
        for await (const physicalLine of rl) {
            pending += (pending ? '\n' : '') + physicalLine;
            for (let index = 0; index < physicalLine.length; index++) {
                if (physicalLine[index] === '"') {
                    if (quoted && physicalLine[index + 1] === '"')
                        index++;
                    else
                        quoted = !quoted;
                }
            }
            if (quoted)
                continue;
            const line = pending;
            pending = '';
            const trimmed = line.trim();
            if (!trimmed)
                continue;
            if (isFirstLine) {
                isFirstLine = false;
                // Auto-detect delimiter
                if (line.includes('\t')) {
                    delimiter = '\t';
                }
                else {
                    delimiter = ',';
                }
                headers = splitLine(line, delimiter).map(normalizeHeaderName);
                headers.forEach((h, idx) => {
                    if (h)
                        headerIndexMap[h.toLowerCase()] = idx;
                });
                continue;
            }
            totalRows++;
            if (!firstRow) {
                const cols = splitLine(line, delimiter);
                const getVal = (name) => {
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
                if (options.firstRowOnly)
                    break;
            }
        }
        if (quoted)
            throw new Error('CSV có trường quoted chưa đóng');
    }
    finally {
        rl.close();
        await new Promise(resolve => {
            if (fileStream.closed) {
                resolve();
                return;
            }
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
