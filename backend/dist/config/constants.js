"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SOCKET_EVENTS = exports.PERMISSIONS = void 0;
exports.PERMISSIONS = [
    'add',
    'update',
    'delete',
    'restore',
    'manage_users',
    'view_audit_logs',
];
exports.SOCKET_EVENTS = {
    SAMPLE_CREATED: 'sample:created',
    SAMPLE_UPDATED: 'sample:updated',
    SAMPLE_DELETED: 'sample:deleted',
    SAMPLE_RESTORED: 'sample:restored',
    SAMPLES_BULK_DELETED: 'samples:bulk_deleted',
    USER_UPDATED: 'user:updated',
};
