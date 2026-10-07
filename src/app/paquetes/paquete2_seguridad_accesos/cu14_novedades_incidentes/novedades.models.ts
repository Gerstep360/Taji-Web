export type EntryType = 'NOTE' | 'INCIDENT' | 'ALERT';
export type Severity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export interface ShiftLog {
  id: number; shift: number; guard_staff: number; guard_name: string;
  condominium: number | null; condominium_name: string; shift_status: string;
  scheduled_start: string; scheduled_end: string; created_by_user: number;
  entry_type: EntryType; severity: Severity; title: string; description: string;
  occurred_at: string; created_at: string;
}
export interface ShiftLogPage {
  results: ShiftLog[];
  pagination: { page: number; total_pages: number; total_items: number; };
}
export const ENTRY_TYPES: { value: EntryType; label: string }[] = [
  { value: 'NOTE', label: 'Novedad' }, { value: 'INCIDENT', label: 'Incidente' }, { value: 'ALERT', label: 'Alerta' },
];
export const SEVERITIES: { value: Severity; label: string }[] = [
  { value: 'INFO', label: 'Información' }, { value: 'LOW', label: 'Baja' },
  { value: 'MEDIUM', label: 'Media' }, { value: 'HIGH', label: 'Alta' }, { value: 'CRITICAL', label: 'Crítica' },
];
