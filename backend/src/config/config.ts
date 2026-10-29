import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { logger } from '../infrastructure/logger/logger';
import crypto from 'crypto';

const ConfigSchema = z.object({
  port: z.number().default(3000),
  basePathUNC: z.string().default('\\\\10.212.9.4\\aoi-data\\2.Ảnh AOM\\2026\\1. Mater sample (Cấm xóa)'),
  localTestUNCPath: z.string().optional(),
  masterSampleJsonPath: z.string().default('master-sample.json'),
  dbPath: z.string().optional(),
  sessionSecret: z.string().default(''),
  allowedOrigins: z.array(z.string().url()).default(['http://localhost:5172', 'http://127.0.0.1:5172']),
  trustedProxies: z.array(z.string()).default([]),
  scanIntervalSec: z.number().positive().default(7200),
  scanMachineMapping: z.record(z.string(), z.number()).default({}),
  defaultDateRangeDays: z.number().int().positive().default(30),
  expiryWarningDays: z.number().int().nonnegative().default(7),
  backupIntervalHours: z.number().positive().default(24),
  backupRetentionDays: z.number().positive().default(30),
  logRetentionDays: z.number().positive().default(30),
  server: z.object({
    port: z.number().default(3000),
    host: z.string().default('0.0.0.0'),
  }).default({ port: 3000, host: '0.0.0.0' }),
  paths: z.object({
    database: z.string().optional(),
    auditLog: z.string().optional(),
  }).default({}),
  session: z.object({
    cookieName: z.string().default('lm.sid'),
  }).default({ cookieName: 'lm.sid' }),
  expiry: z.object({
    warningDays: z.number().default(7),
  }).default({ warningDays: 7 }),
  logging: z.object({
    level: z.enum(['fatal','error','warn','info','debug','trace','silent']).default('info'),
  }).default({ level: 'info' }),
});

export type AppConfig = z.infer<typeof ConfigSchema> & {
  sessionSecret: string;
  projectRoot: string;
  resolvedPaths: {
    database: string;
    auditLog: string;
    masterSampleJson: string;
    localMasterSampleJson: string;
    basePathUNC: string;
  };
};

function resolvePath(baseDir: string, targetPath: string): string {
  // If UNC path like \\server\share or absolute path like C:\... or /...
  if (path.isAbsolute(targetPath) || targetPath.startsWith('\\\\')) {
    return targetPath;
  }
  return path.resolve(baseDir, targetPath);
}

export function resolveDatabasePath(baseDir: string, dbPath?: string, legacyPath?: string): string {
  const primary = dbPath ? resolvePath(baseDir, dbPath) : undefined;
  const legacy = legacyPath ? resolvePath(baseDir, legacyPath) : undefined;
  const comparable = (value: string) => process.platform === 'win32' ? value.toLowerCase() : value;
  if (primary && legacy && comparable(primary) !== comparable(legacy)) {
    throw new Error('Conflicting database paths: dbPath and paths.database refer to different files. Keep only dbPath in the configuration.');
  }
  return primary || legacy || resolvePath(baseDir, './data/db/app.db');
}

function loadConfig(): AppConfig {
  const projectRoot = path.resolve(process.cwd());
  const possibleConfigPaths = [
    ...(process.env.LISTMASTER_CONFIG ? [path.resolve(process.env.LISTMASTER_CONFIG)] : []),
    path.join(projectRoot, 'backend', 'config.json'),
    path.join(projectRoot, 'config.json'),
    path.join(projectRoot, 'config', 'app.json'),
    path.join(projectRoot, '..', 'config', 'app.json'),
    path.resolve('config/app.json'),
  ];

  let configFilePath = '';
  for (const p of possibleConfigPaths) {
    if (fs.existsSync(p)) {
      configFilePath = p;
      break;
    }
  }

  if (!configFilePath) {
    throw new Error(`Configuration file config.json not found in paths: ${possibleConfigPaths.join(', ')}`);
  }

  let rawConfig: unknown;
  try {
    const content = fs.readFileSync(configFilePath, 'utf-8');
    rawConfig = JSON.parse(content);
  } catch (err) {
    logger.error({ err }, `Failed to read or parse config file at ${configFilePath}`);
    throw err;
  }

  const parsed = ConfigSchema.parse(rawConfig);
  const rootForRelative = path.dirname(path.dirname(configFilePath));

  const auditLogRelativePath = parsed.paths?.auditLog || './data/logs';
  const basePathUNC = parsed.localTestUNCPath ? resolvePath(rootForRelative, parsed.localTestUNCPath) : parsed.basePathUNC;

  const resolvedPaths = {
    database: resolveDatabasePath(rootForRelative, parsed.dbPath, parsed.paths.database),
    auditLog: resolvePath(rootForRelative, auditLogRelativePath),
    // Relative master paths live beside the scan folders on the shared drive.
    masterSampleJson: resolvePath(basePathUNC, parsed.masterSampleJsonPath),
    localMasterSampleJson: path.join(rootForRelative, 'data', 'master-sample.json'),
    basePathUNC,
  };

  // Đọc danh sách machines từ config/machines.json nếu có
  let dynamicScanMapping: Record<string, number> = { ...parsed.scanMachineMapping };
  const possibleMachinesPaths = [
    path.join(rootForRelative, 'config', 'machines.json'),
    path.join(projectRoot, 'config', 'machines.json'),
  ];
  for (const mp of possibleMachinesPaths) {
    if (fs.existsSync(mp)) {
      try {
        const mContent = JSON.parse(fs.readFileSync(mp, 'utf-8'));
        if (Array.isArray(mContent.scanMachines)) {
          for (const m of mContent.scanMachines) {
            if (m.code && m.number !== undefined) {
              dynamicScanMapping[m.code] = m.number;
            }
          }
        }
      } catch (err) {
        logger.warn({ err }, 'Không thể đọc file config/machines.json');
      }
      break;
    }
  }

  let sessionSecret = parsed.sessionSecret;
  if (!sessionSecret) {
    const secretPath = path.join(path.dirname(resolvedPaths.database), 'session-secret.key');
    fs.mkdirSync(path.dirname(secretPath), {recursive: true});
    try { fs.writeFileSync(secretPath, crypto.randomBytes(48).toString('hex'), {flag: 'wx', mode: 0o600}); }
    catch (err) { if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err; }
    sessionSecret = fs.readFileSync(secretPath, 'utf8').trim();
  }
  if (sessionSecret.length < 32) throw new Error('sessionSecret must contain at least 32 characters');
  logger.level = process.env.LOG_LEVEL || parsed.logging.level;

  return {
    ...parsed,
    scanMachineMapping: dynamicScanMapping,
    sessionSecret,
    projectRoot: rootForRelative,
    resolvedPaths,
  };
}

export const config = loadConfig();
