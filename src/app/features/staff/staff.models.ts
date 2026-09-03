export interface CatalogOption {
  value: string;
  label: string;
}

export interface StaffOptions {
  staff_types: CatalogOption[];
  statuses: CatalogOption[];
  document_types: CatalogOption[];
}

export interface StaffMember {
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
  employee_code: string | null;
  staff_type: string;
  staff_type_display: string;
  hire_date: string | null;
  end_date: string | null;
  status: string;
  status_display: string;
  notes: string;
}

export interface StaffPayload {
  first_name: string;
  last_name: string;
  document_type: string;
  document_number: string | null;
  document_complement: string;
  phone: string;
  contact_email: string;
  birth_date: string | null;
  staff_type: string;
  hire_date: string | null;
  end_date: string | null;
  status: string;
  notes: string;
}

export interface StaffQuery {
  page: number;
  page_size: number;
  search?: string;
  staff_type?: string;
  status?: string;
  ordering?: string;
}

export interface StaffListResponse {
  pagination: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
    next: string | null;
    previous: string | null;
  };
  results: StaffMember[];
}
