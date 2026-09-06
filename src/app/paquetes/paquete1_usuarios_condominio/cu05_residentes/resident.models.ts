export interface CatalogOption {
  value: string;
  label: string;
}

export interface ResidentOptions {
  statuses: CatalogOption[];
  document_types: CatalogOption[];
}

export interface ResidentPerson {
  id: number;
  person_id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  document_type: string;
  document_number: string | null;
  document_complement: string;
  phone: string;
  contact_email: string;
  birth_date: string | null;
  profile_photo: string;
  status: string;
  status_display: string;
  notes: string;
  registered_at: string;
  deactivated_at: string | null;
}

export interface ResidentPayload {
  first_name: string;
  last_name: string;
  document_type: string;
  document_number: string | null;
  document_complement: string;
  phone: string;
  contact_email: string;
  birth_date: string | null;
  status: string;
  notes: string;
}

export interface ResidentQuery {
  page: number;
  page_size: number;
  search?: string;
  status?: string;
  ordering?: string;
}

export interface ResidentListResponse {
  pagination: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
    next: string | null;
    previous: string | null;
  };
  results: ResidentPerson[];
}
