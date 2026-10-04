export type VisitStatus = 'AUTHORIZED' | 'ACTIVE' | 'FINISHED' | 'CANCELLED' | 'EXPIRED';

export interface VisitorPerson {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  document_type: string;
  document_number: string;
  document_complement?: string;
  phone?: string;
  contact_email?: string;
}

export interface VisitUnitSummary {
  id: number;
  code: string;
  unit_type?: string;
  floor_label?: string;
  sector_name?: string;
}

export interface VisitResidentSummary {
  id: number;
  full_name: string;
  document_number?: string;
}

export interface VisitAuthorization {
  id: number;
  visitor: VisitorPerson;
  resident?: VisitResidentSummary | null;
  unit: number;
  unit_detail?: VisitUnitSummary | null;
  purpose: string;
  valid_from: string;
  valid_until: string;
  status: VisitStatus;
  status_display: string;
  qr_uuid?: string;
  qr_expires_at?: string;
  cancelled_at?: string | null;
  notes?: string;
  created_at: string;
}

export interface VisitCreatePayload {
  visitor_id?: number | null;
  visitor_first_name?: string;
  visitor_last_name?: string;
  visitor_document_type?: string;
  visitor_document_number?: string;
  visitor_document_complement?: string;
  visitor_phone?: string;
  visitor_email?: string;
  unit_id: number;
  authorized_by_resident_id?: number | null;
  purpose: string;
  valid_from: string;
  valid_until: string;
  notes?: string;
}

export interface VisitUpdatePayload {
  purpose?: string;
  valid_from?: string;
  valid_until?: string;
  notes?: string;
}

export interface VisitOptions {
  statuses: Array<{ value: string; label: string }>;
  document_types: Array<{ value: string; label: string }>;
}

export interface VisitQuery {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
  resident?: number | string;
  unit?: number | string;
  date_from?: string;
  date_to?: string;
  ordering?: string;
}

export interface VisitPagination {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  next: string | null;
  previous: string | null;
}

export interface VisitListResponse {
  pagination: VisitPagination;
  results: VisitAuthorization[];
}

export interface UnitDirectoryItem {
  id: number;
  code: string;
  unit_type?: string;
  sector_name?: string;
}

export interface ResidentDirectoryItem {
  id: number;
  full_name: string;
  document_number?: string;
}
