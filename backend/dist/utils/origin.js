"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.allowedOrigin = allowedOrigin;
const config_1 = require("../config/config");
function allowedOrigin(origin, host) {
    if (!origin)
        return true;
    try {
        const url = new URL(origin);
        return ['http:', 'https:'].includes(url.protocol) && (url.host === host || config_1.config.allowedOrigins.includes(url.origin));
    }
    catch {
        return false;
    }
}
