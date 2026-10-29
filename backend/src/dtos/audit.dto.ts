export interface AuditQueryDto {
  page?: number;
  limit?: number;
  action?: string;
  actor_id?: string;
  entity_type?: string;
  entity_id?: string;
  startDate?: string;
  endDate?: string;
}
