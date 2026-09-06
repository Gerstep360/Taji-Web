export interface CatalogOption {
  value: string;
  label: string;
}

export interface SectorOptions {
  sector_types: CatalogOption[];
}

export interface Sector {
  id: number;
  code: string;
  name: string;
  sector_type: string;
  sector_type_display: string;
  description: string;
  parent: number | null;
  parent_name: string | null;
  is_active: boolean;
}

export interface SectorPayload {
  code: string;
  name: string;
  sector_type: string;
  description: string;
  parent: number | null;
  is_active: boolean;
}

export interface SectorQuery {
  page: number;
  page_size: number;
  search?: string;
  sector_type?: string;
  ordering?: string;
}

export interface SectorListResponse {
  pagination: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
    next: string | null;
    previous: string | null;
  };
  results: Sector[];
}