import { CatalogOption } from './sector.models';

export interface UnitOptions {
  unit_types: CatalogOption[];
  statuses: CatalogOption[];
}

export interface Unit {
  id: number;
  code: string;
  unit_type: string;
  unit_type_display: string;
  floor_label: string;
  description: string;
  status: string;
  status_display: string;
  sector: number | null;
  sector_name: string | null;
}

export interface UnitPayload {
  code: string;
  unit_type: string;
  floor_label: string;
  description: string;
  status: string;
  sector: number | null;
}

export interface UnitQuery {
  page: number;
  page_size: number;
  search?: string;
  sector?: number;
  unit_type?: string;
  status?: string;
  ordering?: string;
}

export interface UnitListResponse {
  pagination: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
    next: string | null;
    previous: string | null;
  };
  results: Unit[];
}