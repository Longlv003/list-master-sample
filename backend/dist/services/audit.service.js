"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const readline_1 = __importDefault(require("readline"));
const crypto_1 = __importDefault(require("crypto"));
const config_1 = require("../config/config");
const logger_1 = require("../infrastructure/logger/logger");
const db_1 = require("../infrastructure/database/db");
class AuditService {
    lastError = null;
    running = null;
    timer = null;
    log(entry) {
        const redact = (value) => {
            if (Array.isArray(value))
                return value.map(redact);
            if (value && typeof value === 'object')
                return Object.fromEntries(Object.entries(value).filter(([key]) => !/password|secret/i.test(key)).map(([key, val]) => [key, redact(val)]));
            return value;
        };
        const id = crypto_1.default.randomUUID();
        const record = redact({ ...entry, id, ts: new Date().toISOString() });
        (0, db_1.getDatabase)().prepare('INSERT INTO audit_outbox (id, entry_json) VALUES (?, ?)').run(id, JSON.stringify(record));
        void this.flush().catch(err => {
            logger_1.logger.error({ err }, 'Audit remains queued in SQLite');
            if (!this.timer) {
                this.timer = setInterval(() => { void this.flush().catch(error => logger_1.logger.error({ error }, 'Audit retry failed')); }, 30000);
                this.timer.unref();
            }
        });
    }
    flush() {
        if (this.running)
            return this.running;
        this.running = this.performFlush().then(() => { this.lastError = null; }).catch(err => {
            this.lastError = String(err);
            throw err;
        }).finally(() => { this.running = null; });
        return this.running;
    }
    async performFlush() {
        const db = (0, db_1.getDatabase)();
        await fs_1.default.promises.mkdir(config_1.config.resolvedPaths.auditLog, { recursive: true });
        for (;;) {
            const batch = db.prepare('SELECT id, entry_json FROM audit_outbox ORDER BY created_at, rowid LIMIT 100').all();
            if (!batch.length)
                return;
            for (const row of batch) {
                const entry = JSON.parse(row.entry_json);
                const file = path_1.default.join(config_1.config.resolvedPaths.auditLog, `audit-${entry.ts.slice(0, 7)}.jsonl`);
                const fd = await fs_1.default.promises.open(file, 'a');
                try {
                    await fd.writeFile(row.entry_json + '\n');
                    await fd.sync();
                }
                finally {
                    await fd.close();
                }
                db.prepare('DELETE FROM audit_outbox WHERE id=?').run(row.id);
            }
        }
    }
    async *entries(query = {}) {
        await this.flush();
        const files = (await fs_1.default.promises.readdir(config_1.config.resolvedPaths.auditLog)).filter(file => /^audit-\d{4}-\d{2}\.jsonl$/.test(file)).sort();
        const seen = new Set();
        for (const file of files) {
            const stream = fs_1.default.createReadStream(path_1.default.join(config_1.config.resolvedPaths.auditLog, file));
            const lines = readline_1.default.createInterface({ input: stream, crlfDelay: Infinity });
            try {
                for await (const line of lines) {
                    let entry;
                    try {
                        entry = JSON.parse(line);
                    }
                    catch {
                        continue;
                    }
                    if (!entry.ts || !entry.action)
                        continue;
                    if (entry.id) {
                        if (seen.has(entry.id))
                            continue;
                        seen.add(entry.id);
                    }
                    if (query.action && !entry.action.toLowerCase().includes(query.action.toLowerCase()))
                        continue;
                    if (query.actor_id && query.actor_id !== entry.actor_id)
                        continue;
                    if (query.entity_type && query.entity_type !== entry.entity_type)
                        continue;
                    if (query.entity_id && query.entity_id !== entry.entity_id)
                        continue;
                    if (query.startDate && entry.ts < query.startDate)
                        continue;
                    if (query.endDate && entry.ts >= query.endDate)
                        continue;
                    yield entry;
                }
            }
            finally {
                lines.close();
                stream.destroy();
            }
        }
    }
    async query(query = {}) {
        const page = Math.max(1, Number(query.page) || 1), limit = Math.max(1, Math.min(200, Number(query.limit) || 20));
        const keep = page * limit;
        const recent = [];
        let total = 0;
        for await (const entry of this.entries(query)) {
            total++;
            recent.push(entry);
            if (recent.length > keep)
                recent.shift();
        }
        recent.reverse();
        return { items: recent.slice((page - 1) * limit, page * limit), total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
    }
    async stop() { if (this.timer)
        clearTimeout(this.timer); this.timer = null; await this.flush(); }
}
exports.auditService = new AuditService();
