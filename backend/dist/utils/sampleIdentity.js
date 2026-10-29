"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeIdentifier = normalizeIdentifier;
exports.sampleIdentity = sampleIdentity;
function normalizeIdentifier(value, width) {
    const text = String(value ?? '').trim();
    return /^\d+$/.test(text) ? text.padStart(width, '0') : text;
}
function sampleIdentity(item, lot, barcode) {
    return JSON.stringify([item.trim().toLowerCase(), normalizeIdentifier(lot, 5).toLowerCase(), normalizeIdentifier(barcode, 3).toLowerCase()]);
}
