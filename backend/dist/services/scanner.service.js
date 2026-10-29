"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scannerService = exports.ScannerService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const scanCache_repository_1 = require("../repositories/scanCache.repository");
const scanFolder_repository_1 = require("../repositories/scanFolder.repository");
const db_1 = require("../infrastructure/database/db");
const config_1 = require("../config/config");
const logger_1 = require("../infrastructure/logger/logger");
const csvParser_1 = require("../utils/csvParser");
const uncPathHelper_1 = require("../utils/uncPathHelper");
const sampleIdentity_1 = require("../utils/sampleIdentity");
const realtime_service_1 = require("./realtime.service");
class ScannerService {
    activeScan = null;
    timer = null;
    started = false;
    progress = { scanned: 0, addedOrUpdated: 0, status: 'success', errors: [] };
    finishedAt = null;
    nextScanAt = null;
    directoryCache = new Map();
    getStatus() { return { running: this.activeScan !== null, ...this.progress, finishedAt: this.finishedAt, nextScanAt: this.nextScanAt }; }
    schedule(delay) {
        if (this.timer)
            clearTimeout(this.timer);
        this.timer = null;
        this.nextScanAt = null;
        if (!this.started)
            return;
        this.nextScanAt = new Date(Date.now() + delay).toISOString();
        this.timer = setTimeout(() => { this.timer = null; void this.scan().catch(err => logger_1.logger.error({ err }, 'Scan failed')); }, delay);
    }
    start() {
        if (this.started)
            return;
        this.started = true;
        const root = config_1.config.resolvedPaths.basePathUNC;
        const attempt = (0, db_1.getDatabase)().prepare('SELECT status, finished_at, errors_json FROM scan_attempts WHERE root_path=?').get(root);
        if (attempt) {
            this.progress.status = attempt.status;
            this.progress.errors = JSON.parse(attempt.errors_json);
            this.finishedAt = attempt.finished_at;
        }
        const last = scanCache_repository_1.scanCacheRepository.lastCompleted(root);
        this.schedule(attempt && attempt.status !== 'success' ? 2000 : last === undefined ? 2000 : Math.max(2000, last + config_1.config.scanIntervalSec * 1000 - Date.now()));
    }
    async stop() {
        this.started = false;
        this.schedule(0);
        await this.activeScan?.catch(err => logger_1.logger.error({ err }, 'Scanner stopped after failure'));
    }
    scan() {
        if (this.activeScan)
            return this.activeScan;
        if (this.timer)
            clearTimeout(this.timer);
        this.timer = null;
        this.nextScanAt = null;
        this.activeScan = this.runScan().catch(err => {
            this.progress.status = 'error';
            this.progress.errors.push(String(err));
            throw err;
        }).finally(() => {
            this.activeScan = null;
            this.schedule((this.progress.status === 'success' ? config_1.config.scanIntervalSec : 60) * 1000);
        });
        return this.activeScan;
    }
    async readDirectory(dir) {
        const stat = await fs_1.default.promises.stat(dir);
        const cached = this.directoryCache.get(dir) || scanCache_repository_1.scanCacheRepository.find(dir);
        if (cached && cached.mtimeMs === stat.mtimeMs && cached.ctimeMs === stat.ctimeMs)
            return cached.entries;
        const entries = (await fs_1.default.promises.readdir(dir, { withFileTypes: true })).map(entry => ({ name: entry.name, directory: entry.isDirectory(), file: entry.isFile() }));
        if (this.directoryCache.size >= 10000)
            this.directoryCache.delete(this.directoryCache.keys().next().value);
        this.directoryCache.set(dir, { mtimeMs: stat.mtimeMs, ctimeMs: stat.ctimeMs, entries });
        scanCache_repository_1.scanCacheRepository.save(dir, stat.mtimeMs, stat.ctimeMs, entries);
        return entries;
    }
    async runScan() {
        this.progress = { scanned: 0, addedOrUpdated: 0, status: 'success', errors: [] };
        const root = config_1.config.resolvedPaths.basePathUNC;
        const folders = [];
        let changed = 0;
        try {
            await fs_1.default.promises.access(root);
            await this.discover(root, folders, 0);
            for (const folder of folders) {
                this.progress.scanned++;
                try {
                    if (await this.processFolder(folder))
                        this.progress.addedOrUpdated++;
                }
                catch (err) {
                    this.progress.errors.push(`${folder}: ${String(err)}`);
                    changed += scanFolder_repository_1.scanFolderRepository.setStatus(folder, 'offline');
                }
            }
            if (this.progress.errors.length === 0) {
                changed += scanFolder_repository_1.scanFolderRepository.reconcileRoot(root, new Set(folders.map(folder => path_1.default.resolve(folder).toLowerCase())));
                scanCache_repository_1.scanCacheRepository.complete(root);
            }
            else
                this.progress.status = 'partial';
        }
        catch (err) {
            this.progress.status = 'error';
            this.progress.errors.push(`${root}: ${String(err)}`);
            changed += scanFolder_repository_1.scanFolderRepository.reconcileRoot(root, null);
        }
        this.finishedAt = new Date().toISOString();
        (0, db_1.getDatabase)().prepare(`INSERT INTO scan_attempts VALUES (?, ?, ?, ?) ON CONFLICT(root_path) DO UPDATE SET status=excluded.status, finished_at=excluded.finished_at, errors_json=excluded.errors_json`)
            .run(root, this.progress.status, this.finishedAt, JSON.stringify(this.progress.errors));
        realtime_service_1.realtimeService.broadcast('dashboard.updated', { ...this.progress, statusChanges: changed, finishedAt: this.finishedAt });
        return { ...this.progress, errors: [...this.progress.errors] };
    }
    async discover(dir, folders, depth) {
        if (depth > 6) {
            this.progress.errors.push(`Vượt độ sâu quét: ${dir}`);
            return;
        }
        if (/^SCAN\s*NO\s*\d+\s*-\s*CVR\s*\d+$/i.test(path_1.default.basename(dir))) {
            folders.push(dir);
            return;
        }
        try {
            for (const entry of await this.readDirectory(dir)) {
                if (entry.directory && !['AUTO', 'MANUAL'].includes(entry.name.toUpperCase()))
                    await this.discover(path_1.default.join(dir, entry.name), folders, depth + 1);
            }
        }
        catch (err) {
            this.progress.errors.push(`${dir}: ${String(err)}`);
        }
    }
    async processFolder(folder) {
        const info = (0, uncPathHelper_1.parseScanFolderPath)(folder);
        if (!info.isValid)
            throw new Error('Tên folder Scan không hợp lệ');
        const entries = await this.readDirectory(folder);
        const files = entries.filter(entry => entry.file).map(entry => entry.name).sort();
        const csvs = files.filter(name => /\.csv$/i.test(name));
        const metadata = await Promise.all(csvs.map(async (name) => { const stat = await fs_1.default.promises.stat(path_1.default.join(folder, name)); return { name, size: stat.size, mtime: stat.mtimeMs }; }));
        const signature = metadata.map(item => `${item.name}:${item.size}:${item.mtime}`).join('|');
        const logA = csvs.find(name => /[_-](1A|A)\b/i.test(name)) || csvs[0];
        const logB = csvs.find(name => name !== logA && /[_-](2B|B)\b/i.test(name)) || csvs.find(name => name !== logA);
        let autoCount = 0;
        let manualCount = 0;
        for (const entry of entries) {
            if (entry.directory && ['AUTO', 'MANUAL'].includes(entry.name.toUpperCase())) {
                const count = (await this.readDirectory(path_1.default.join(folder, entry.name))).filter(file => file.file && /\.(jpe?g|png)$/i.test(file.name)).length;
                if (entry.name.toUpperCase() === 'AUTO')
                    autoCount += count;
                else
                    manualCount += count;
            }
            else if (entry.file && /\.(jpe?g|png)$/i.test(entry.name)) {
                if (/_\d{2}\.jpe?g$/i.test(entry.name))
                    autoCount++;
                else
                    manualCount++;
            }
        }
        const id = crypto_1.default.createHash('md5').update(folder.toLowerCase()).digest('hex');
        const old = scanFolder_repository_1.scanFolderRepository.findById(id);
        const csvChanged = !old || old.csv_signature !== signature;
        let item = csvChanged ? info.itemCode || '' : old.item_code;
        let lot = csvChanged ? '' : old.lot_id;
        let barcode = csvChanged ? '' : old.barcode_id;
        let job = csvChanged ? '' : old.job_name;
        let machine = csvChanged ? null : old.scan_machine_raw;
        const quality = [];
        if (info.warning)
            quality.push(info.warning);
        if (csvChanged && logA) {
            const csv = await (0, csvParser_1.parseCsvFile)(path_1.default.join(folder, logA), { firstRowOnly: true });
            const missing = ['AOI Machine', 'Lot ID', 'Panel ID', 'Job Name'].filter(name => !csv.header.some(header => header.toLowerCase() === name.toLowerCase()));
            if (missing.length)
                quality.push('Thiếu cột CSV: ' + missing.join(', '));
            const row = csv.firstRow;
            if (!row)
                quality.push('CSV không có dữ liệu');
            else {
                const parts = (row.lotId || '').split('-');
                if (parts.length > 1) {
                    item = parts.shift();
                    lot = parts.join('-');
                }
                else
                    lot = row.lotId || '';
                barcode = row.panelId || '';
                job = row.jobName || '';
                machine = row.aoiMachine || null;
            }
        }
        else if (!csvChanged && old.metadata_warning) {
            quality.push(...old.metadata_warning.split('; ').filter(message => !message.startsWith('Thiếu metadata:') && message !== info.warning));
        }
        if (!logA)
            quality.push('Không có CSV');
        const absent = [(!item || item === 'UNKNOWN') && 'Item', !lot && 'Lot', !barcode && 'Barcode', !job && 'Program'].filter(Boolean);
        if (absent.length)
            quality.push('Thiếu metadata: ' + absent.join(', '));
        const number = machine ? config_1.config.scanMachineMapping[machine] ?? null : null;
        const mappingMessage = !machine ? 'CSV chưa có mã máy Scan' : number === null ? `Chưa có mapping máy ${machine}` : number !== info.scanNum ? `CSV: ${machine} (Scan ${number}); folder: Scan ${info.scanNum}` : null;
        const record = {
            id, run_date: info.runDate, year: info.year, month: info.month, day: info.day,
            item_code: item || 'UNKNOWN', lot_id: (0, sampleIdentity_1.normalizeIdentifier)(lot, 5), barcode_id: (0, sampleIdentity_1.normalizeIdentifier)(barcode, 3), job_name: job,
            scan_machine_raw: machine, scan_machine_num: number, folder_scan_num: info.scanNum, cvr_machine_num: info.cvrNum, folder_path: folder,
            log_a_path: logA ? path_1.default.join(folder, logA) : null, log_b_path: logB ? path_1.default.join(folder, logB) : null,
            auto_images_count: autoCount, manual_images_count: manualCount,
            mapping_warning: mappingMessage ? 1 : 0, warning_message: mappingMessage, metadata_warning: [...new Set(quality)].join('; ') || null,
            source_status: 'online', csv_mtime: Math.floor(Math.max(0, ...metadata.map(item => item.mtime))), csv_signature: signature,
        };
        if (old && Object.entries(record).every(([key, value]) => old[key] === value)) {
            scanFolder_repository_1.scanFolderRepository.touch(id);
            return false;
        }
        scanFolder_repository_1.scanFolderRepository.upsert(record);
        return true;
    }
}
exports.ScannerService = ScannerService;
exports.scannerService = new ScannerService();
