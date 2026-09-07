export interface AuditEventItem {
  id: number;
  occurred_at: string;
  action_code: string;
  resource_type: string;
  resource_id: string;
  description: string;
  ip_address: string | null;
  user_agent: string;
  request_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
  before_data: Record<string, any> | null;
  after_data: Record<string, any> | null;
}

export interface AuditPagination {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  next: string | null;
  previous: string | null;
}

export interface AuditListResponse {
  pagination: AuditPagination;
  results: AuditEventItem[];
}

export interface AuditQuery {
  page?: number;
  page_size?: number;
  search?: string;
  category?: string;
  action_code?: string;
}
