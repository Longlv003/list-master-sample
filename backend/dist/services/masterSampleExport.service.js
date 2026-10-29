"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.masterSampleExporter = exports.MasterSampleExportService = void 0;
const config_1 = require("../config/config");
const logger_1 = require("../infrastructure/logger/logger");
const masterSample_repository_1 = require("../repositories/masterSample.repository");
const atomicFile_1 = require("../utils/atomicFile");
/** One-way export: SQLite -> local JSON and UNC JSON for other tools. */
class MasterSampleExportService {
    timer = null;
    wakeTimer = null;
    running = null;
    active = false;
    requestedAgain = false;
    unsubscribe = null;
    start() {
        if (this.active)
            return;
        masterSample_repository_1.masterSampleRepository.initialize();
        this.active = true;
        this.unsubscribe = masterSample_repository_1.masterSampleRepository.onChange(() => this.requestExport());
        this.requestExport();
        // Repair stale/deleted external JSON and retry failed writes without scanning folders.
        this.timer = setInterval(() => this.requestExport(), 60_000);
        this.timer.unref();
    }
    requestExport() {
        if (!this.active)
            return;
        if (this.running) {
            this.requestedAgain = true;
            return;
        }
        if (this.wakeTimer)
            return;
        this.wakeTimer = setTimeout(() => {
            this.wakeTimer = null;
            void this.exportNow().catch(err => {
                logger_1.logger.warn({ err }, 'Master samples saved in SQLite; JSON export failed and will retry');
            });
        }, 50);
    }
    exportNow() {
        if (this.running) {
            this.requestedAgain = true;
            return this.running;
        }
        this.running = this.performExport().finally(() => {
            this.running = null;
            if (this.requestedAgain) {
                this.requestedAgain = false;
                this.requestExport();
            }
        });
        return this.running;
    }
    async performExport() {
        const snapshot = masterSample_repository_1.masterSampleRepository.exportSnapshot();
        try {
            const targets = new Set([config_1.config.resolvedPaths.localMasterSampleJson, config_1.config.resolvedPaths.masterSampleJson]);
            for (const target of targets)
                await (0, atomicFile_1.writeJsonAtomic)(target, snapshot.items);
            masterSample_repository_1.masterSampleRepository.recordExport(snapshot.revision, null);
        }
        catch (err) {
            masterSample_repository_1.masterSampleRepository.recordExport(snapshot.revision, err instanceof Error ? err.message : String(err));
            throw err;
        }
    }
    async stop() {
        this.active = false;
        if (this.timer)
            clearInterval(this.timer);
        if (this.wakeTimer)
            clearTimeout(this.wakeTimer);
        this.timer = null;
        this.wakeTimer = null;
        this.unsubscribe?.();
        this.unsubscribe = null;
        await this.running;
    }
}
exports.MasterSampleExportService = MasterSampleExportService;
exports.masterSampleExporter = new MasterSampleExportService();
