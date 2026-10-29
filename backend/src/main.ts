import { masterSampleExporter } from './services/masterSampleExport.service';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config/config';
import { logger } from './infrastructure/logger/logger';
import { runMigrations } from './infrastructure/database/migration.runner';
import { createApp } from './app';
import { realtimeService } from './services/realtime.service';
import { UserRepository } from './repositories/user.repository';
import { userService } from './services/user.service';
import { scannerService } from './services/scanner.service';
import { closeDatabase } from './infrastructure/database/db';
import { getDatabase } from './infrastructure/database/db';
import { auditService } from './services/audit.service';
import { maintenanceService } from './services/maintenance.service';
import { allowedOrigin } from './utils/origin';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

async function bootstrap() {
  logger.info('=== Starting ListMaster Server ===');

  // 1. Run database migrations
  try {
    runMigrations();
    logger.info('Database migrations completed successfully');
  } catch (err) {
    logger.error({ err }, 'Failed to run database migrations');
    process.exit(1);
  }

  // 2. Auto-create default admin account if no users exist
  const userRepo = new UserRepository();
  if (userRepo.count() === 0) {
    const initialPassword = crypto.randomBytes(12).toString('base64url');
    const created = userService.create({
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
    getDatabase().prepare('UPDATE users SET must_change_password=1 WHERE id=?').run(created.id);
    console.log(`Tài khoản khởi tạo: admin. Mật khẩu tạm: ${initialPassword}. Đổi mật khẩu sau khi đăng nhập.`);
    logger.info('Default admin account created successfully.');
  }

  // 3. Create Express App & HTTP Server
  const app = createApp();
  const server = http.createServer(app);

  // 4. Initialize Socket.IO
  const io = new SocketIOServer(server, {
    cors: {
      origin: config.allowedOrigins,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    allowRequest: (req, callback) => callback(null, allowedOrigin(req.headers.origin, req.headers.host)),
  });

  io.on('connection', (socket) => {
    logger.debug(`Socket client connected: ${socket.id}`);

    // All connected tablets join "main" room
    socket.join('main');

    socket.on('disconnect', () => {
      logger.debug(`Socket client disconnected: ${socket.id}`);
    });
  });

  realtimeService.setIO(io);

  // 5. Start UNC Scanner
  masterSampleExporter.start();
  scannerService.start();
  maintenanceService.start();

  // 6. Listen on Port
  const port = config.server?.port || config.port || 3000;
  const host = config.server?.host || '0.0.0.0';

  const stateFile = path.join(path.dirname(config.resolvedPaths.database), 'server-state.json');
  const stopToken = crypto.randomBytes(32).toString('hex');
  app.post('/api/system/shutdown', (req, res) => {
    const address = req.socket.remoteAddress?.replace(/^::ffff:/, '');
    if (!['127.0.0.1', '::1'].includes(address || '') || req.headers.authorization !== `Bearer ${stopToken}`) { res.sendStatus(403); return; }
    res.json({success: true}); void shutdown();
  });
  server.on('error', err => { logger.error({err}, 'HTTP server failed'); void shutdown(); });
  server.listen(port, host, () => {
    fs.writeFileSync(stateFile, JSON.stringify({pid: process.pid, port, token: stopToken}), {mode: 0o600});
    logger.info(`ListMaster server running at http://${host}:${port}`);
    logger.info(`Tablets in LAN can connect to: http://<server-ip>:${port}`);
  });

  // Graceful shutdown
  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return; shuttingDown = true;
    logger.info('Shutting down ListMaster server...');
    try {
      // Stop accepting writes while allowing the existing scanner/exporter to drain.
      const httpClosed = new Promise<void>(resolve => {
        io.close(() => resolve());
        server.closeIdleConnections();
      });
      await Promise.all([scannerService.stop(), maintenanceService.stop()]);
      await httpClosed;
      await masterSampleExporter.stop().catch(err => logger.warn({err}, 'Pending JSON export failed'));
      await masterSampleExporter.exportNow().catch(err => logger.warn({err}, 'Final JSON export failed; SQLite remains authoritative'));
      await auditService.stop().catch(err => logger.warn({err}, 'Audit remains in durable outbox for next startup'));
      if (fs.existsSync(stateFile)) {
        const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
        if (state.pid === process.pid) fs.unlinkSync(stateFile);
      }
      closeDatabase();
      logger.info('Server closed. Goodbye.');
      process.exit(0);
    } catch (err) { logger.error({err}, 'Shutdown incomplete; data retained for recovery'); process.exitCode = 1; }
  };

  process.on('SIGINT', () => { void shutdown(); });
  process.on('SIGTERM', () => { void shutdown(); });
}

bootstrap().catch((err) => {
  logger.error({ err }, 'Unhandled error during bootstrap');
  process.exit(1);
});
