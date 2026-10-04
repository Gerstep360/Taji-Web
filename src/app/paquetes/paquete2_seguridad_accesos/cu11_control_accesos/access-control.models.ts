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
  guard_staff_id: number | null;
  guard_staff: GuardSummary | null;
  authorization_id: number | null;
  event_type: AccessEventType;
  event_type_display: string;
  validation_method: AccessEventMethod;
  validation_method_display: string;
  validation_result: AccessEventResult;
  validation_result_display: string;
  occurred_at: string;
  notes: string;
}

export interface AccessEventListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: AccessEventItem[];
}

export interface AccessEventQuery {
  event_type?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface AccessEventPayload {
  person_id: number;
  guard_staff_id?: number | null;
  event_type: AccessEventType;
  validation_method?: AccessEventMethod;
  validation_result?: AccessEventResult;
  notes?: string;
  occurred_at?: string;
}
