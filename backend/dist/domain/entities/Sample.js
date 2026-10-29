"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateExpiryStatus = calculateExpiryStatus;
function calculateExpiryStatus(expiryDateStr, warningDays) {
    if (!expiryDateStr)
        return 'none';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDateStr);
    if (isNaN(expiry.getTime()))
        return 'none';
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
        return 'expired';
    }
    if (diffDays <= warningDays) {
        return 'expiring';
    }
    return 'valid';
}
