"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginRateLimit = loginRateLimit;
const attempts = new Map();
function loginRateLimit(req, res, next) {
    const key = req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    for (const [ip, entry] of attempts)
        if (entry.until <= now)
            attempts.delete(ip);
    const entry = attempts.get(key) || { count: 0, until: now + 15 * 60000 };
    if (entry.count >= 30 || (!attempts.has(key) && attempts.size >= 10000)) {
        res.setHeader('Retry-After', Math.max(1, Math.ceil((entry.until - now) / 1000)));
        res.status(429).json({ success: false, error: { code: 'RATE_LIMITED', message: 'Thử đăng nhập quá nhiều lần. Vui lòng thử lại sau.' } });
        return;
    }
    entry.count++;
    attempts.set(key, entry);
    res.on('finish', () => { if (res.statusCode < 400 && attempts.get(key) === entry)
        attempts.delete(key); });
    next();
}
