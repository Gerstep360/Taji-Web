export type AssemblyStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
export type AgreementStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED';

export interface Pagination {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

export interface Paged<T> {
  results: T[];
  pagination?: Pagination;
}

export interface Assembly {
  id: number;
  title: string;
  description: string;
  scheduled_at: string;
  location: string;
  status: AssemblyStatus;
  status_display: string;
  /** Ausentes en la vista de residentes (solo asambleas programadas). */
  minutes_text?: string;
  created_by_name?: string;
  agreements_count?: number;
  open_agreements_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Agreement {
  id: number;
  assembly: number;
  assembly_title: string;
  title: string;
  description: string;
  responsible_user: number | null;
  responsible_name: string;
  due_at: string | null;
  estimated_budget: string | null;
  actual_cost: string | null;
  status: AgreementStatus;
  status_display: string;
  is_overdue: boolean;
  completed_at: string | null;
  attachments_count: number;
  created_at: string;
  updated_at: string;
}

export interface AgreementAttachment {
  id: number;
  file_name: string;
  description: string;
  uploaded_by_name: string;
  created_at: string;
  download_url: string;
}

export interface AgreementHistoryEntry {
  id: number;
  action_code: string;
  description: string;
  actor_name: string;
  occurred_at: string;
  before_status: string | null;
  after_status: string | null;
}

export interface ResponsibleOption {
  id: number;
  name: string;
  role: string;
}

export interface AssemblyFilters {
  page?: number;
  search?: string;
  status?: AssemblyStatus | '';
}
