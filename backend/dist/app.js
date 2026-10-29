"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const express_session_1 = __importDefault(require("express-session"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const config_1 = require("./config/config");
const session_store_1 = require("./infrastructure/session/session.store");
const deviceContext_middleware_1 = require("./middlewares/deviceContext.middleware");
const auth_middleware_1 = require("./middlewares/auth.middleware");
const errorHandler_middleware_1 = require("./middlewares/errorHandler.middleware");
const routes_1 = __importDefault(require("./routes"));
const origin_1 = require("./utils/origin");
const scanner_service_1 = require("./services/scanner.service");
const maintenance_service_1 = require("./services/maintenance.service");
const db_1 = require("./infrastructure/database/db");
const audit_service_1 = require("./services/audit.service");
function createApp() {
    const app = (0, express_1.default)();
    app.set('trust proxy', config_1.config.trustedProxies);
    // CORS for LAN access
    app.use((0, cors_1.default)((req, callback) => callback(null, { origin: (0, origin_1.allowedOrigin)(req.headers.origin, req.headers.host), credentials: true })));
    app.use(express_1.default.json({ limit: '10mb' }));
    app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
    app.use((req, res, next) => {
        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !(0, origin_1.allowedOrigin)(req.headers.origin, req.headers.host)) {
            res.status(403).json({ success: false, error: { code: 'ORIGIN_DENIED', message: 'Nguồn yêu cầu không được phép' } });
            return;
        }
        next();
    });
    // Session configuration: pure session cookie (no TTL / maxAge) per Plan D9 & Q8
    app.use((0, express_session_1.default)({
        name: config_1.config.session.cookieName,
        secret: config_1.config.sessionSecret,
        resave: false,
        saveUninitialized: false,
        store: new session_store_1.SQLiteSessionStore(),
        cookie: {
            httpOnly: true,
            secure: false, // HTTP in company LAN
            sameSite: 'lax',
        },
    }));
    // Attach device context (IP -> device name)
    app.use(deviceContext_middleware_1.deviceContextMiddleware);
    // Populate user from session
    app.use(auth_middleware_1.populateUserMiddleware);
    // API Routes
    app.use('/api/v1', routes_1.default);
    app.use('/api', routes_1.default); // Alias
    // Health check endpoint
    app.get('/api/health', (_req, res) => {
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            scan: scanner_service_1.scannerService.getStatus(),
            maintenance: maintenance_service_1.maintenanceService.status,
            audit: { lastError: audit_service_1.auditService.lastError, pending: (0, db_1.getDatabase)().prepare('SELECT count(*) AS count FROM audit_outbox').get() },
            export: (0, db_1.getDatabase)().prepare('SELECT revision, exported_revision, last_export_at, last_error FROM master_sample_export_state WHERE singleton=1').get(),
            defaults: { dateRangeDays: config_1.config.defaultDateRangeDays, expiryWarningDays: config_1.config.expiryWarningDays },
        });
    });
    // Serve Frontend static build files if present
    const possibleFrontendDirs = [
        path_1.default.join(__dirname, '../../frontend/dist'),
        path_1.default.join(config_1.config.projectRoot, 'frontend/dist'),
        path_1.default.join(config_1.config.projectRoot, 'dist/frontend'),
    ];
    let frontendDist = '';
    for (const dir of possibleFrontendDirs) {
        if (fs_1.default.existsSync(dir)) {
            frontendDist = dir;
            break;
        }
    }
    if (frontendDist) {
        app.use(express_1.default.static(frontendDist));
        app.get('*', (req, res, next) => {
            if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
                return next();
            }
            res.sendFile(path_1.default.join(frontendDist, 'index.html'));
        });
    }
    // Global Error Handler
    app.use(errorHandler_middleware_1.errorHandler);
    return app;
}
