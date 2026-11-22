export interface IncidentEvidence {
  id: number;
  file_type?: string;
  file_type_display: string;
  caption?: string;
  file_url: string | null;
  preview_url?: string | null;
  file_path?: string;
}
