"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deviceContextMiddleware = deviceContextMiddleware;
const device_service_1 = require("../services/device.service");
function deviceContextMiddleware(req, _res, next) {
    // Extract real client IP behind proxy or LAN
    // Express consults X-Forwarded-For only for explicitly trusted proxies.
    let ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    // Normalize IPv6 prefix
    if (ip === '::1' || ip === '::ffff:127.0.0.1') {
        ip = '127.0.0.1';
    }
    else if (ip.startsWith('::ffff:')) {
        ip = ip.replace(/^::ffff:/, '');
    }
    const name = device_service_1.deviceService.resolveDeviceName(ip);
    req.deviceInfo = {
        ip,
        name,
    };
    next();
}
