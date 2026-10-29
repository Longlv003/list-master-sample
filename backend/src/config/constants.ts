export const PERMISSIONS = [
  'add',
  'update',
  'delete',
  'restore',
  'manage_users',
  'view_audit_logs',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const SOCKET_EVENTS = {
  SAMPLE_CREATED: 'sample:created',
  SAMPLE_UPDATED: 'sample:updated',
  SAMPLE_DELETED: 'sample:deleted',
  SAMPLE_RESTORED: 'sample:restored',
  SAMPLES_BULK_DELETED: 'samples:bulk_deleted',
  USER_UPDATED: 'user:updated',
} as const;
