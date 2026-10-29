import fs from 'fs';
import path from 'path';

class Mutex {
  private mutex = Promise.resolve();

  async lock(): Promise<() => void> {
    const previous = this.mutex;
    let unlock!: () => void;
    this.mutex = new Promise<void>(resolve => { unlock = resolve; });
    await previous;
    return unlock;
  }
}

const fileLocks = new Map<string, Mutex>();

function getMutexForFile(filePath: string): Mutex {
  const normalized = path.resolve(filePath);
  if (!fileLocks.has(normalized)) {
    fileLocks.set(normalized, new Mutex());
  }
  return fileLocks.get(normalized)!;
}

/**
 * Ghi file JSON an toàn chuẩn Atomic Write:
 * 1. Đợi lock tuần tự hóa
 * 2. Ghi ra file tạm .tmp.<timestamp>
 * 3. Gọi fsync() đẩy xuống ổ đĩa
 * 4. Rename đè lên file chính
 */
export async function writeJsonAtomic<T>(filePath: string, data: T): Promise<void> {
  const mutex = getMutexForFile(filePath);
  const unlock = await mutex.lock();

  const tempFilePath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 7)}`;
  try {
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    const jsonString = JSON.stringify(data, null, 2);

    // Ghi ra file tạm
    const fd = await fs.promises.open(tempFilePath, 'wx');
    try {
      await fd.writeFile(jsonString, 'utf-8');
      await fd.sync();
    } finally {
      await fd.close();
    }

    // Atomic rename
    await fs.promises.rename(tempFilePath, filePath);
  } finally {
    await fs.promises.unlink(tempFilePath).catch(() => {});
    unlock();
  }
}

/**
 * Đọc file JSON an toàn
 */
export function readJsonSafe<T>(filePath: string, defaultValue: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      return defaultValue;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (err) {
    return defaultValue;
  }
}
