import { Injectable, inject } from '@angular/core';
import { ApiClient, KEEP_PAGE_ON_SERVER_ERROR } from '../../../core/api/api-client.service';
import { HttpContext } from '@angular/common/http';
import { API_ENDPOINTS } from '../../../core/api/api-endpoints';

export interface ReportOption {
  id: number;
  code: string;
  name?: string;
  sector?: number;
  parent?: number | null;
}
export interface EvidenceRules {
  max_files: number;
  max_file_size_bytes: number;
  allowed_extensions: string[];
}
export interface ReportOptions {
  categories: ReportOption[];
  sectors: ReportOption[];
  units: ReportOption[];
  assets: ReportOption[];
  evidence_rules: EvidenceRules;
}
export interface ReportDraft {
  title: string;
  description: string;
  category: string;
  sector: string;
  unit: string;
  asset: string;
}
export interface ReportConfirmation {
  public_code: string;
  status_display: string;
  category: { name: string };
  priority: { name: string } | null;
}

export function sectorContains(sectors: ReportOption[], ancestor: number, child?: number): boolean {
  const visited = new Set<number>();
  while (child && !visited.has(child)) {
    if (child === ancestor) return true;
    visited.add(child);
    child = sectors.find((s) => s.id === child)?.parent ?? undefined;
  }
  return false;
}
export function evidenceError(files: File[], rules: EvidenceRules): string {
  if (files.length > rules.max_files) return `Puedes adjuntar hasta ${rules.max_files} archivos.`;
  for (const file of files) {
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    if (!rules.allowed_extensions.includes(extension))
      return `El formato de «${file.name}» no está permitido.`;
    if (!file.size || file.size > rules.max_file_size_bytes)
      return `«${file.name}» está vacío o supera el límite de ${(rules.max_file_size_bytes / 1048576).toFixed(0)} MB.`;
  }
  return '';
}
export function reportBody(draft: ReportDraft, files: File[]): FormData {
  const body = new FormData();
  for (const key of ['title', 'description', 'category', 'sector', 'unit', 'asset'] as const) {
    if (draft[key].trim()) body.append(key, draft[key].trim());
  }
  for (const file of files) body.append('evidences', file, file.name);
  return body;
}
@Injectable({ providedIn: 'root' })
export class IncidentReportApi {
  private readonly api = inject(ApiClient);
  options() {
    return this.api.get<ReportOptions>(API_ENDPOINTS.incidents + 'options/');
  }
  create(draft: ReportDraft, files: File[]) {
    return this.api.post<FormData, ReportConfirmation>(
      API_ENDPOINTS.incidents,
      reportBody(draft, files),
      { context: new HttpContext().set(KEEP_PAGE_ON_SERVER_ERROR, true) },
    );
  }
}
