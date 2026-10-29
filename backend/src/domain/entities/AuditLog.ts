export interface AuditEntry {
  ts: string;
  action: string;
  actor_id?: string | null;
  actor_name?: string | null;
  ip: string;
  device_name?: string | null;
  entity_type: string;
  entity_id?: string | null;
  old_value?: Record<string, unknown> | null;
  new_value?: Record<string, unknown> | null;
  result: 'success' | 'failure';
  error?: string | null;
}
