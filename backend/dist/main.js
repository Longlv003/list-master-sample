"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const masterSampleExport_service_1 = require("./services/masterSampleExport.service");
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const config_1 = require("./config/config");
const logger_1 = require("./infrastructure/logger/logger");
const migration_runner_1 = require("./infrastructure/database/migration.runner");
const app_1 = require("./app");
const realtime_service_1 = require("./services/realtime.service");
const user_repository_1 = require("./repositories/user.repository");
const user_service_1 = require("./services/user.service");
const scanner_service_1 = require("./services/scanner.service");
const db_1 = require("./infrastructure/database/db");
const db_2 = require("./infrastructure/database/db");
const audit_service_1 = require("./services/audit.service");
const maintenance_service_1 = require("./services/maintenance.service");
const origin_1 = require("./utils/origin");
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
async function bootstrap() {
    logger_1.logger.info('=== Starting ListMaster Server ===');
    // 1. Run database migrations
    try {
        (0, migration_runner_1.runMigrations)();
        logger_1.logger.info('Database migrations completed successfully');
    }
    catch (err) {
        logger_1.logger.error({ err }, 'Failed to run database migrations');
        process.exit(1);
    }
    // 2. Auto-create default admin account if no users exist
    const userRepo = new user_repository_1.UserRepository();
    if (userRepo.count() === 0) {
        const initialPassword = crypto_1.default.randomBytes(12).toString('base64url');
        const created = user_service_1.userService.create({
            username: 'admin',
            password: initialPassword,
            display_name: 'Quản trị viên',
            perm_add: true,
            perm_update: true,
            perm_delete: true,
            perm_restore: true,
            perm_manage_users: true,
            perm_view_audit_logs: true,
        });
        (0, db_2.getDatabase)().prepare('UPDATE users SET must_change_password=1 WHERE id=?').run(created.id);
        console.log(`Tài khoản khởi tạo: admin. Mật khẩu tạm: ${initialPassword}. Đổi mật khẩu sau khi đăng nhập.`);
        logger_1.logger.info('Default admin account created successfully.');
    }
    // 3. Create Express App & HTTP Server
    const app = (0, app_1.createApp)();
    const server = http_1.default.createServer(app);
    // 4. Initialize Socket.IO
    const io = new socket_io_1.Server(server, {
        cors: {
            origin: config_1.config.allowedOrigins,
            credentials: true,
        },
        transports: ['websocket', 'polling'],
        allowRequest: (req, callback) => callback(null, (0, origin_1.allowedOrigin)(req.headers.origin, req.headers.host)),
    });
    io.on('connection', (socket) => {
        logger_1.logger.debug(`Socket client connected: ${socket.id}`);
        // All connected tablets join "main" room
        socket.join('main');
        socket.on('disconnect', () => {
            logger_1.logger.debug(`Socket client disconnected: ${socket.id}`);
        });
    });
    realtime_service_1.realtimeService.setIO(io);
    // 5. Start UNC Scanner
    masterSampleExport_service_1.masterSampleExporter.start();
    scanner_service_1.scannerService.start();
    maintenance_service_1.maintenanceService.start();
    // 6. Listen on Port
    const port = config_1.config.server?.port || config_1.config.port || 3000;
    const host = config_1.config.server?.host || '0.0.0.0';
    const stateFile = path_1.default.join(path_1.default.dirname(config_1.config.resolvedPaths.database), 'server-state.json');
    const stopToken = crypto_1.default.randomBytes(32).toString('hex');
    app.post('/api/system/shutdown', (req, res) => {
        const address = req.socket.remoteAddress?.replace(/^::ffff:/, '');
        if (!['127.0.0.1', '::1'].includes(address || '') || req.headers.authorization !== `Bearer ${stopToken}`) {
            res.sendStatus(403);
            return;
        }
        res.json({ success: true });
        void shutdown();
    });
    server.on('error', err => { logger_1.logger.error({ err }, 'HTTP server failed'); void shutdown(); });
    server.listen(port, host, () => {
        fs_1.default.writeFileSync(stateFile, JSON.stringify({ pid: process.pid, port, token: stopToken }), { mode: 0o600 });
        logger_1.logger.info(`ListMaster server running at http://${host}:${port}`);
        logger_1.logger.info(`Tablets in LAN can connect to: http://<server-ip>:${port}`);
    });
    // Graceful shutdown
    let shuttingDown = false;
    const shutdown = async () => {
        if (shuttingDown)
            return;
        shuttingDown = true;
        logger_1.logger.info('Shutting down ListMaster server...');
        try {
            // Stop accepting writes while allowing the existing scanner/exporter to drain.
            const httpClosed = new Promise(resolve => {
                io.close(() => resolve());
                server.closeIdleConnections();
            });
            await Promise.all([scanner_service_1.scannerService.stop(), maintenance_service_1.maintenanceService.stop()]);
            await httpClosed;
            await masterSampleExport_service_1.masterSampleExporter.stop().catch(err => logger_1.logger.warn({ err }, 'Pending JSON export failed'));
            await masterSampleExport_service_1.masterSampleExporter.exportNow().catch(err => logger_1.logger.warn({ err }, 'Final JSON export failed; SQLite remains authoritative'));
            await audit_service_1.auditService.stop().catch(err => logger_1.logger.warn({ err }, 'Audit remains in durable outbox for next startup'));
            if (fs_1.default.existsSync(stateFile)) {
                const state = JSON.parse(fs_1.default.readFileSync(stateFile, 'utf8'));
                if (state.pid === process.pid)
                    fs_1.default.unlinkSync(stateFile);
            }
            (0, db_1.closeDatabase)();
            logger_1.logger.info('Server closed. Goodbye.');
            process.exit(0);
        }
        catch (err) {
            logger_1.logger.error({ err }, 'Shutdown incomplete; data retained for recovery');
            process.exitCode = 1;
        }
    };
    process.on('SIGINT', () => { void shutdown(); });
    process.on('SIGTERM', () => { void shutdown(); });
}
bootstrap().catch((err) => {
    logger_1.logger.error({ err }, 'Unhandled error during bootstrap');
    process.exit(1);
});
