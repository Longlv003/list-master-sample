"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.maintenanceService = exports.MaintenanceService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const config_1 = require("../config/config");
const db_1 = require("../infrastructure/database/db");
const logger_1 = require("../infrastructure/logger/logger");
const audit_service_1 = require("./audit.service");
class MaintenanceService {
    timer = null;
    running = null;
    status = { lastBackupAt: null, lastError: null };
    start() {
        if (this.timer)
            return;
        void this.run();
        this.timer = setInterval(() => { void this.run(); }, 60000);
        this.timer.unref();
    }
    run() {
        if (this.running)
            return this.running;
        this.running = this.perform().then(() => { this.status.lastError = null; }).catch(err => {
            this.status.lastError = String(err);
            logger_1.logger.error({ err }, 'Backup/maintenance failed');
        }).finally(() => { this.running = null; });
        return this.running;
    }
    async unlinkInside(directory, name) {
        const root = await fs_1.default.promises.realpath(directory);
        const target = path_1.default.resolve(root, name);
        if (path_1.default.dirname(target) !== root || path_1.default.basename(name) !== name)
            throw new Error('Invalid retention target');
        const stat = await fs_1.default.promises.lstat(target);
        if (stat.isFile() && !stat.isSymbolicLink())
            await fs_1.default.promises.unlink(target);
    }
    async perform() {
        await audit_service_1.auditService.flush().catch(err => logger_1.logger.warn({ err }, 'Audit remains in outbox; continuing database backup'));
        const directory = path_1.default.join(path_1.default.dirname(config_1.config.resolvedPaths.database), 'backups');
        await fs_1.default.promises.mkdir(directory, { recursive: true });
        const files = (await fs_1.default.promises.readdir(directory)).filter(name => /^app-backup-\d+\.db$/.test(name)).sort();
        const last = files.length ? Number(files[files.length - 1].match(/\d+/)[0]) : 0;
        if (last)
            this.status.lastBackupAt = new Date(last).toISOString();
        if (Date.now() - last >= config_1.config.backupIntervalHours * 3600000) {
            const stamp = Date.now();
            const filename = `app-backup-${stamp}.db`;
            const temporary = path_1.default.join(directory, filename + '.tmp');
            await (0, db_1.getDatabase)().backup(temporary);
            const check = new better_sqlite3_1.default(temporary, { readonly: true });
            try {
                if (check.pragma('integrity_check', { simple: true }) !== 'ok')
                    throw new Error('Backup integrity check failed');
            }
            finally {
                check.close();
            }
            await fs_1.default.promises.rename(temporary, path_1.default.join(directory, filename));
            this.status.lastBackupAt = new Date(stamp).toISOString();
        }
        for (const name of files) {
            const stamp = Number(name.match(/\d+/)[0]);
            // Always keep at least the newest verified backup.
            if (stamp !== last && Date.now() - stamp > config_1.config.backupRetentionDays * 86400000)
                await this.unlinkInside(directory, name);
        }
        const cutoff = Date.now() - config_1.config.logRetentionDays * 86400000;
        for (const name of await fs_1.default.promises.readdir(config_1.config.resolvedPaths.auditLog)) {
            const match = name.match(/^audit-(\d{4})-(\d{2})\.jsonl$/);
            // Monthly file is removed only after its entire month is outside retention.
            if (match && Date.UTC(Number(match[1]), Number(match[2]), 1) < cutoff)
                await this.unlinkInside(config_1.config.resolvedPaths.auditLog, name);
        }
        (0, db_1.getDatabase)().prepare('DELETE FROM scan_directory_cache WHERE folder_path NOT IN (SELECT folder_path FROM scan_records) AND rowid NOT IN (SELECT rowid FROM scan_directory_cache ORDER BY rowid DESC LIMIT 50000)').run();
    }
    async stop() { if (this.timer)
        clearInterval(this.timer); this.timer = null; await this.running; }
}
exports.MaintenanceService = MaintenanceService;
exports.maintenanceService = new MaintenanceService();
