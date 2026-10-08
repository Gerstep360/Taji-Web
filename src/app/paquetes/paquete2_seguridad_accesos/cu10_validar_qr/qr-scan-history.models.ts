/**
 * Contrato del historial de escaneos QR (RF-10 / CU10).
 *
 * A diferencia del historial de accesos, este incluye **todos** los escaneos:
 * los aprobados, los denegados y también los códigos QR que no corresponden a
 * ninguna visita. Son justo los intentos fallidos que la portería necesita
 * contabilizar, y antes no quedaban registrados en ninguna parte.
 */

export type QrScanResult = 'VALID' | 'REJECTED' | 'NOT_FOUND';

export interface QrScanGuard {
  id: number;
  full_name: string;
  employee_code: string;
  staff_type: string;
  status: string;
}

export interface QrScanRow {
  id: number;
  result: QrScanResult;
  result_display: string;
  reason: string;
  message: string;
  occurred_at: string;
  authorization_id: number | null;
  visitor_name: string;
  visitor_document_number: string;
  unit_code: string;
  guard_staff: QrScanGuard | null;
  device_id: string;
  notes: string;
}

export interface QrScanSummary {
  total: number;
  approved: number;
  rejected: number;
  not_found: number;
  /** Rechazados + códigos desconocidos: todo lo que noautorizó el ingreso. */
  failed: number;
  success_rate: number;
}

export interface QrScanHistoryResponse {
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  summary: QrScanSummary;
  results: QrScanRow[];
}

export interface QrScanFilters {
  result?: QrScanResult | '';
  reason?: string;
  guard_staff_id?: number | null;
  days?: number;
  search?: string;
  page?: number;
  page_size?: number;
}

export const EMPTY_SCAN_SUMMARY: QrScanSummary = {
  total: 0,
  approved: 0,
  rejected: 0,
  not_found: 0,
  failed: 0,
  success_rate: 0,
};

/**
 * Traducción de los códigos de motivo a texto legible.
 *
 * El backend los manda como códigos estables para que la UI no dependa de
 * strings del servidor, pero el guardia necesita leer un motivo, no un
 * `VISIT_WINDOW_ENDED`.
 */
export const SCAN_REASON_LABELS: Record<string, string> = {
  VALID: 'Vigente',
  NOT_FOUND: 'QR no registrado',
  QR_ROTATED: 'QR reemplazado',
  QR_NOT_ISSUED: 'QR no emitido',
  QR_EXPIRED: 'QR vencido',
  VISIT_NOT_YET_VALID: 'Visita aún no vigente',
  VISIT_WINDOW_ENDED: 'Ventana de visita concluida',
  VISIT_CANCELLED: 'Visita cancelada',
  VISIT_FINISHED: 'Visita finalizada',
  VISIT_EXPIRED: 'Autorización vencida',
  STATUS_NOT_ALLOWED: 'Estado no permite ingreso',
};

export function scanReasonLabel(reason: string): string {
  return SCAN_REASON_LABELS[reason] ?? reason;
}
