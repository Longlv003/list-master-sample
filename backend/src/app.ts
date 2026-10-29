import express from 'express';
import session from 'express-session';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { config } from './config/config';
import { SQLiteSessionStore } from './infrastructure/session/session.store';
import { deviceContextMiddleware } from './middlewares/deviceContext.middleware';
import { populateUserMiddleware } from './middlewares/auth.middleware';
import { errorHandler } from './middlewares/errorHandler.middleware';
import apiRoutes from './routes';
import { allowedOrigin } from './utils/origin';
import { scannerService } from './services/scanner.service';
import { maintenanceService } from './services/maintenance.service';
import { getDatabase } from './infrastructure/database/db';
import { auditService } from './services/audit.service';

export function createApp(): express.Application {
  const app = express();
  app.set('trust proxy', config.trustedProxies);

  // CORS for LAN access
  app.use(
    cors((req, callback) => callback(null, {origin: allowedOrigin(req.headers.origin, req.headers.host), credentials: true}))
  );

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use((req, res, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !allowedOrigin(req.headers.origin, req.headers.host)) {
      res.status(403).json({success: false, error: {code: 'ORIGIN_DENIED', message: 'Nguồn yêu cầu không được phép'}}); return;
    }
    next();
  });

  // Session configuration: pure session cookie (no TTL / maxAge) per Plan D9 & Q8
  app.use(
    session({
      name: config.session.cookieName,
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      store: new SQLiteSessionStore(),
      cookie: {
        httpOnly: true,
        secure: false, // HTTP in company LAN
        sameSite: 'lax',
      },
    })
  );

  // Attach device context (IP -> device name)
  app.use(deviceContextMiddleware);

  // Populate user from session
  app.use(populateUserMiddleware);

  // API Routes
  app.use('/api/v1', apiRoutes);
  app.use('/api', apiRoutes); // Alias

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      scan: scannerService.getStatus(),
      maintenance: maintenanceService.status,
      audit: {lastError: auditService.lastError, pending: getDatabase().prepare('SELECT count(*) AS count FROM audit_outbox').get()},
      export: getDatabase().prepare('SELECT revision, exported_revision, last_export_at, last_error FROM master_sample_export_state WHERE singleton=1').get(),
      defaults: {dateRangeDays: config.defaultDateRangeDays, expiryWarningDays: config.expiryWarningDays},
    });
  });

  // Serve Frontend static build files if present
  const possibleFrontendDirs = [
    path.join(__dirname, '../../frontend/dist'),
    path.join(config.projectRoot, 'frontend/dist'),
    path.join(config.projectRoot, 'dist/frontend'),
  ];

  let frontendDist = '';
  for (const dir of possibleFrontendDirs) {
    if (fs.existsSync(dir)) {
      frontendDist = dir;
      break;
    }
  }

  if (frontendDist) {
    app.use(express.static(frontendDist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
        return next();
      }
      res.sendFile(path.join(frontendDist, 'index.html'));
    });
  }

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
