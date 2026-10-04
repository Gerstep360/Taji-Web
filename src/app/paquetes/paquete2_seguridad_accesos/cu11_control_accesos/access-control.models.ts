export type AccessEventType = 'ENTRY' | 'EXIT' | 'DENIED';
export type AccessEventMethod = 'QR' | 'FACE' | 'MANUAL';
export type AccessEventResult = 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW';

export interface PersonSummary {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  document_type: string;
  document_number: string | null;
  contact_email: string;
  phone: string;
}

export interface GuardSummary {
  id: number;
  employee_code: string;
  staff_type: string;
  status: string;
  full_name: string;
}

export interface AccessEventItem {
  id: number;
  person_id: number | null;
  person: PersonSummary | null;
  visitor_name: string;
  visitor_document_number: string;
  guard_staff_id: number | null;
  guard_staff: GuardSummary | null;
  authorization_id: number | null;
  unit_id: number | null;
  unit: AccessUnitSummary | null;
  event_type: AccessEventType;
  event_type_display: string;
  validation_method: AccessEventMethod;
  validation_method_display: string;
  validation_result: AccessEventResult;
  validation_result_display: string;
  occurred_at: string;
  notes: string;
}

export interface AccessPersonOption {
  id: number;
  full_name: string;
  document_number: string | null;
  units: Array<{ id: number; code: string }>;
}

export interface AccessUnitOption {
  id: number;
  code: string;
  unit_type: string;
  sector: string;
}

export interface AccessUnitSummary {
  id: number;
  code: string;
  unit_type: string;
  sector_name: string | null;
}

export interface AccessLookupResponse<T> {
  results: T[];
}

export interface AccessEventListResponse {
  pagination: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
    next: string | null;
    previous: string | null;
  };
  results: AccessEventItem[];
}

export interface AccessEventQuery {
  event_type?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface AccessEventPayload {
  person_id?: number;
  visitor_name?: string;
  visitor_document_number?: string;
  unit_id: number;
  guard_staff_id?: number | null;
  event_type: AccessEventType;
  validation_method?: AccessEventMethod;
  validation_result?: AccessEventResult;
  notes?: string;
  occurred_at?: string;
}
