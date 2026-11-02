/** Contratos de CU18 (Registrar incidencia) tal como los expone `/api/v1/incidents/`. */

export interface IncidentPriorityOption {
  id: number;
  code: string;
  name: string;
  rank: number;
  target_minutes: number | null;
}

export interface IncidentCategoryOption {
  id: number;
  code: string;
  name: string;
  description: string;
  default_priority: { code: string; name: string } | null;
}

export interface IncidentSectorOption {
  id: number;
  code: string;
  name: string;
  sector_type: string;
  parent: number | null;
}

export interface IncidentUnitOption {
  id: number;
  code: string;
  unit_type: string;
  sector: number | null;
}

export interface IncidentAssetOption {
  id: number;
  code: string;
  name: string;
  sector: number | null;
}

export interface IncidentEvidenceRules {
  field_name: string;
  max_files: number;
  max_file_size_bytes: number;
  allowed_extensions: string[];
  allowed_mime_types: string[];
}

export interface IncidentReportOptions {
  categories: IncidentCategoryOption[];
  priorities: IncidentPriorityOption[];
  sectors: IncidentSectorOption[];
  units: IncidentUnitOption[];
  assets: IncidentAssetOption[];
  evidence_rules: IncidentEvidenceRules;
}

/** Campos que el formulario envía; prioridad, reportante y estado los decide el backend. */
export interface IncidentReportDraft {
  title: string;
  description: string;
  category: number;
  sector: number;
  unit: number | null;
  asset: number | null;
  evidences: File[];
}

export interface IncidentEvidence {
  id: number;
  file_type: string;
  file_name: string;
  created_at: string;
}

export interface IncidentReport {
  id: number;
  public_code: string;
  condominium: number;
  status: string;
  status_display: string;
  title: string;
  description: string;
  category: { id: number; code: string; name: string };
  priority: { id: number; code: string; name: string; rank: number };
  sector: { id: number; code: string; name: string };
  unit: { id: number; code: string } | null;
  asset: { id: number; code: string; name: string } | null;
  reporter: { id: number; full_name: string };
  evidences: IncidentEvidence[];
  created_at: string;
  updated_at: string;
}
