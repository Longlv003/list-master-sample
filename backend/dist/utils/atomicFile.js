"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeJsonAtomic = writeJsonAtomic;
exports.readJsonSafe = readJsonSafe;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class Mutex {
    mutex = Promise.resolve();
    async lock() {
        const previous = this.mutex;
        let unlock;
        this.mutex = new Promise(resolve => { unlock = resolve; });
        await previous;
        return unlock;
    }
}
const fileLocks = new Map();
function getMutexForFile(filePath) {
    const normalized = path_1.default.resolve(filePath);
    if (!fileLocks.has(normalized)) {
        fileLocks.set(normalized, new Mutex());
    }
    return fileLocks.get(normalized);
}
/**
 * Ghi file JSON an toàn chuẩn Atomic Write:
 * 1. Đợi lock tuần tự hóa
 * 2. Ghi ra file tạm .tmp.<timestamp>
 * 3. Gọi fsync() đẩy xuống ổ đĩa
 * 4. Rename đè lên file chính
 */
async function writeJsonAtomic(filePath, data) {
    const mutex = getMutexForFile(filePath);
    const unlock = await mutex.lock();
    const tempFilePath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 7)}`;
    try {
        await fs_1.default.promises.mkdir(path_1.default.dirname(filePath), { recursive: true });
        const jsonString = JSON.stringify(data, null, 2);
        // Ghi ra file tạm
        const fd = await fs_1.default.promises.open(tempFilePath, 'wx');
        try {
            await fd.writeFile(jsonString, 'utf-8');
            await fd.sync();
        }
        finally {
            await fd.close();
        }
        // Atomic rename
        await fs_1.default.promises.rename(tempFilePath, filePath);
    }
    finally {
        await fs_1.default.promises.unlink(tempFilePath).catch(() => { });
        unlock();
    }
}
/**
 * Đọc file JSON an toàn
 */
function readJsonSafe(filePath, defaultValue) {
    try {
        if (!fs_1.default.existsSync(filePath)) {
            return defaultValue;
        }
        const content = fs_1.default.readFileSync(filePath, 'utf-8');
        return JSON.parse(content);
    }
    catch (err) {
        return defaultValue;
    }
}
