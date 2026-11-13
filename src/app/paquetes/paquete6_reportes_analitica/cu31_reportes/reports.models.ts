export interface ReportColumn {
  key: string;
  label: string;
  type: 'text' | 'choice' | 'number' | 'date' | 'datetime';
  operators: string[];
  choices: { value: string; label: string }[];
}
export interface ReportFilter {
  field: string;
  operator: string;
  value: string;
}
export interface ReportRequest {
  source: string;
  title: string;
  columns: string[];
  filters: ReportFilter[];
  ordering: { field: string; direction: 'asc' | 'desc' }[];
  page: number;
  page_size: number;
}
export interface ReportSource {
  key: string;
  label: string;
  description: string;
  columns: ReportColumn[];
  default_columns: string[];
  default_ordering: ReportRequest['ordering'];
}
export interface ReportCatalog {
  condominium: { id: number; name: string };
  export_limit: number;
  formats: string[];
  voice_enabled: boolean;
  voice_suggestions: string[];
  sources: ReportSource[];
}
export interface ReportPreview {
  title: string;
  source: string;
  columns: ReportColumn[];
  rows: (string | number | null)[][];
  pagination: { page: number; page_size: number; total: number; pages: number };
  can_export: boolean;
}
export interface ReportVoiceResult {
  voice_transcript: string;
  spoken_summary: string;
  report_request: ReportRequest;
  report_preview: ReportPreview;
  understood_intent: {
    source: string;
    source_label: string;
    detected_filters: ReportFilter[];
    detected_format: string;
    title: string;
  };
}
export const OPERATOR_LABELS: Record<string, string> = {
  eq: 'Es igual a',
  ne: 'Es diferente de',
  gte: 'Desde / mayor o igual',
  lte: 'Hasta / menor o igual',
  contains: 'Contiene',
  is_empty: 'Está vacío',
  not_empty: 'Tiene un valor',
};
export function emptyOperator(operator: string) {
  return operator === 'is_empty' || operator === 'not_empty';
}
