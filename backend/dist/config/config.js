"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.resolveDatabasePath = resolveDatabasePath;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const zod_1 = require("zod");
const logger_1 = require("../infrastructure/logger/logger");
const crypto_1 = __importDefault(require("crypto"));
const ConfigSchema = zod_1.z.object({
    port: zod_1.z.number().default(3000),
    basePathUNC: zod_1.z.string().default('\\\\10.212.9.4\\aoi-data\\2.Ảnh AOM\\2026\\1. Mater sample (Cấm xóa)'),
    localTestUNCPath: zod_1.z.string().optional(),
    masterSampleJsonPath: zod_1.z.string().default('master-sample.json'),
    dbPath: zod_1.z.string().optional(),
    sessionSecret: zod_1.z.string().default(''),
    allowedOrigins: zod_1.z.array(zod_1.z.string().url()).default(['http://localhost:5172', 'http://127.0.0.1:5172']),
    trustedProxies: zod_1.z.array(zod_1.z.string()).default([]),
    scanIntervalSec: zod_1.z.number().positive().default(7200),
    scanMachineMapping: zod_1.z.record(zod_1.z.string(), zod_1.z.number()).default({}),
    defaultDateRangeDays: zod_1.z.number().int().positive().default(30),
    expiryWarningDays: zod_1.z.number().int().nonnegative().default(7),
    backupIntervalHours: zod_1.z.number().positive().default(24),
    backupRetentionDays: zod_1.z.number().positive().default(30),
    logRetentionDays: zod_1.z.number().positive().default(30),
    server: zod_1.z.object({
        port: zod_1.z.number().default(3000),
        host: zod_1.z.string().default('0.0.0.0'),
    }).default({ port: 3000, host: '0.0.0.0' }),
    paths: zod_1.z.object({
        database: zod_1.z.string().optional(),
        auditLog: zod_1.z.string().optional(),
    }).default({}),
    session: zod_1.z.object({
        cookieName: zod_1.z.string().default('lm.sid'),
    }).default({ cookieName: 'lm.sid' }),
    expiry: zod_1.z.object({
        warningDays: zod_1.z.number().default(7),
    }).default({ warningDays: 7 }),
    logging: zod_1.z.object({
        level: zod_1.z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    }).default({ level: 'info' }),
});
function resolvePath(baseDir, targetPath) {
    // If UNC path like \\server\share or absolute path like C:\... or /...
    if (path_1.default.isAbsolute(targetPath) || targetPath.startsWith('\\\\')) {
        return targetPath;
    }
    return path_1.default.resolve(baseDir, targetPath);
}
function resolveDatabasePath(baseDir, dbPath, legacyPath) {
    const primary = dbPath ? resolvePath(baseDir, dbPath) : undefined;
    const legacy = legacyPath ? resolvePath(baseDir, legacyPath) : undefined;
    const comparable = (value) => process.platform === 'win32' ? value.toLowerCase() : value;
    if (primary && legacy && comparable(primary) !== comparable(legacy)) {
        throw new Error('Conflicting database paths: dbPath and paths.database refer to different files. Keep only dbPath in the configuration.');
    }
    return primary || legacy || resolvePath(baseDir, './data/db/app.db');
}
function loadConfig() {
    const projectRoot = path_1.default.resolve(process.cwd());
    const possibleConfigPaths = [
        ...(process.env.LISTMASTER_CONFIG ? [path_1.default.resolve(process.env.LISTMASTER_CONFIG)] : []),
        path_1.default.join(projectRoot, 'backend', 'config.json'),
        path_1.default.join(projectRoot, 'config.json'),
        path_1.default.join(projectRoot, 'config', 'app.json'),
        path_1.default.join(projectRoot, '..', 'config', 'app.json'),
        path_1.default.resolve('config/app.json'),
    ];
    let configFilePath = '';
    for (const p of possibleConfigPaths) {
        if (fs_1.default.existsSync(p)) {
            configFilePath = p;
            break;
        }
    }
    if (!configFilePath) {
        throw new Error(`Configuration file config.json not found in paths: ${possibleConfigPaths.join(', ')}`);
    }
    let rawConfig;
    try {
        const content = fs_1.default.readFileSync(configFilePath, 'utf-8');
        rawConfig = JSON.parse(content);
    }
    catch (err) {
        logger_1.logger.error({ err }, `Failed to read or parse config file at ${configFilePath}`);
        throw err;
    }
    const parsed = ConfigSchema.parse(rawConfig);
    const rootForRelative = path_1.default.dirname(path_1.default.dirname(configFilePath));
    const auditLogRelativePath = parsed.paths?.auditLog || './data/logs';
    const basePathUNC = parsed.localTestUNCPath ? resolvePath(rootForRelative, parsed.localTestUNCPath) : parsed.basePathUNC;
    const resolvedPaths = {
        database: resolveDatabasePath(rootForRelative, parsed.dbPath, parsed.paths.database),
        auditLog: resolvePath(rootForRelative, auditLogRelativePath),
        // Relative master paths live beside the scan folders on the shared drive.
        masterSampleJson: resolvePath(basePathUNC, parsed.masterSampleJsonPath),
        localMasterSampleJson: path_1.default.join(rootForRelative, 'data', 'master-sample.json'),
        basePathUNC,
    };
    // Đọc danh sách machines từ config/machines.json nếu có
    let dynamicScanMapping = { ...parsed.scanMachineMapping };
    const possibleMachinesPaths = [
        path_1.default.join(rootForRelative, 'config', 'machines.json'),
        path_1.default.join(projectRoot, 'config', 'machines.json'),
    ];
    for (const mp of possibleMachinesPaths) {
        if (fs_1.default.existsSync(mp)) {
            try {
                const mContent = JSON.parse(fs_1.default.readFileSync(mp, 'utf-8'));
                if (Array.isArray(mContent.scanMachines)) {
                    for (const m of mContent.scanMachines) {
                        if (m.code && m.number !== undefined) {
                            dynamicScanMapping[m.code] = m.number;
                        }
                    }
                }
            }
            catch (err) {
                logger_1.logger.warn({ err }, 'Không thể đọc file config/machines.json');
            }
            break;
        }
    }
    let sessionSecret = parsed.sessionSecret;
    if (!sessionSecret) {
        const secretPath = path_1.default.join(path_1.default.dirname(resolvedPaths.database), 'session-secret.key');
        fs_1.default.mkdirSync(path_1.default.dirname(secretPath), { recursive: true });
        try {
            fs_1.default.writeFileSync(secretPath, crypto_1.default.randomBytes(48).toString('hex'), { flag: 'wx', mode: 0o600 });
        }
        catch (err) {
            if (err.code !== 'EEXIST')
                throw err;
        }
        sessionSecret = fs_1.default.readFileSync(secretPath, 'utf8').trim();
    }
    if (sessionSecret.length < 32)
        throw new Error('sessionSecret must contain at least 32 characters');
    logger_1.logger.level = process.env.LOG_LEVEL || parsed.logging.level;
    return {
        ...parsed,
        scanMachineMapping: dynamicScanMapping,
        sessionSecret,
        projectRoot: rootForRelative,
        resolvedPaths,
    };
}
exports.config = loadConfig();
