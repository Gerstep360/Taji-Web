export interface ReportColumn {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'datetime' | 'choice';
  operators: string[];
  choices: { value: string; label: string }[];
}
export interface ReportFilter { field: string; operator: string; value: string | number; }
export interface ReportSort { field: string; direction: 'asc' | 'desc'; }
export interface ReportSource {
  key: string;
  label: string;
  columns: ReportColumn[];
  default_columns: string[];
  default_ordering: ReportSort[];
}
export interface ReportCatalog {
  condominium: { id: number; name: string };
  export_limit: number;
  formats: string[];
  sources: ReportSource[];
}
export interface ReportRequest {
  source: string;
  title: string;
  columns: string[];
  filters: ReportFilter[];
  ordering: ReportSort[];
  page: number;
  page_size: number;
}
export interface ReportPreview {
  title: string;
  columns: ReportColumn[];
  rows: (string | number)[][];
  pagination: { page: number; page_size: number; total: number; pages: number };
  can_export: boolean;
}
