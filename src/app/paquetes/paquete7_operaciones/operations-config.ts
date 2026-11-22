export type Kind = 'warranties' | 'quotes' | 'inspections';
type Field = { key: string; label: string; type?: 'long' | 'number' | 'select'; max?: number;
  optional?: boolean; options?: string[]; decimal?: boolean };
type Spec = { cu: string; title: string; singular: string; help: string; date: string;
  states: Record<string, string>; fields: Field[] };

export const SPECS: Record<Kind, Spec> = {
  warranties: {
    cu: 'CU33', title: 'Garantías', singular: 'garantía', date: 'Vencimiento',
    help: 'Consulta qué está cubierto, cuándo vence y qué reclamos siguen abiertos.',
    states: { active: 'Vigente', claimed: 'En reclamo', closed: 'Cerrada' },
    fields: [{ key: 'provider', label: 'Garante o proveedor', max: 100 },
      { key: 'reference', label: 'Referencia de garantía', max: 80 },
      { key: 'coverage', label: 'Cobertura', type: 'long', max: 400 }],
  },
  quotes: {
    cu: 'CU34 · CU36', title: 'Cotizaciones', singular: 'cotización', date: 'Válida hasta',
    help: 'Agrupa las ofertas por código de solicitud y compara costo, plazo y garantía.',
    states: { received: 'Recibida', shortlisted: 'Preseleccionada', discarded: 'Descartada' },
    fields: [{ key: 'provider', label: 'Proveedor', max: 100 },
      { key: 'request_code', label: 'Código de solicitud', max: 40 },
      { key: 'amount', label: 'Monto total con impuestos', type: 'number', max: 9999999999.99, decimal: true },
      { key: 'currency', label: 'Moneda', type: 'select', options: ['BOB', 'USD'] },
      { key: 'delivery_days', label: 'Días de entrega', type: 'number', max: 3650 },
      { key: 'warranty_months', label: 'Meses de garantía', type: 'number', max: 1200 },
      { key: 'scope', label: 'Alcance de la oferta', type: 'long', max: 400 }],
  },
  inspections: {
    cu: 'CU35 · CU37', title: 'Inspecciones operativas', singular: 'inspección', date: 'Fecha de inspección',
    help: 'Registra una revisión visual y decide cómo dar seguimiento a los hallazgos.',
    states: { draft: 'Borrador', reviewed: 'Revisada', closed: 'Cerrada' },
    fields: [{ key: 'location', label: 'Lugar revisado', max: 100 },
      { key: 'notes', label: 'Notas internas', type: 'long', max: 400, optional: true }],
  },
};

export const CHECKS = [
  ['lighting', 'Iluminación'], ['signage', 'Señalización'], ['surfaces', 'Pisos y superficies'],
  ['drainage', 'Drenaje visible'], ['order', 'Orden y limpieza'],
] as const;
export const CONDITIONS: Record<string, string> = { ok: 'Conforme', attention: 'Requiere atención', not_checked: 'Sin revisar' };
