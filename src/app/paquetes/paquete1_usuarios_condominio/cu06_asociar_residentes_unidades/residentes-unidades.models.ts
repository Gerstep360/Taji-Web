export interface ResidentOption {
  id: number;
  full_name: string;
  document_number: string | null;
  status: string;
  registered_at: string;
}

export type RelationType = 'OWNER' | 'TENANT' | 'FAMILY' | 'AUTHORIZED' | 'OTHER';

export interface UnitOption {
  id: number;
  code: string;
  unit_type_display: string;
  status: string;
}

export interface ResidentUnitLink {
  id: number;
  resident: number;
  resident_name: string;
  unit: number;
  unit_code: string;
  relation_type: RelationType;
  relation_type_display: string;
  is_primary: boolean;
  start_date: string;
  end_date: string | null;
  created_at: string;
}

export interface ResidentUnitPayload {
  resident: number;
  unit: number;
  relation_type: RelationType;
  is_primary: boolean;
  start_date: string;
  end_date?: string | null;
}

export interface PagedResponse<T> {
  pagination: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
    next: string | null;
    previous: string | null;
  };
  results: T[];
}
