export type Kind = 'warranties' | 'quotes' | 'inspections';

export interface Field {
  key: string;
  label: string;
  placeholder?: string;
  hint?: string;
  type?: 'long' | 'number' | 'select';
  max?: number;
  optional?: boolean;
  options?: string[];
  decimal?: boolean;
}

export interface Spec {
  cu: string;
  category: string;
  title: string;
  fullTitle: string;
  singular: string;
  help: string;
  date: string;
  icon: string;
  states: Record<string, string>;
  stateColors: Record<string, 'success' | 'warning' | 'danger' | 'neutral'>;
  fields: Field[];
}

export const SPECS: Record<Kind, Spec> = {
  warranties: {
    cu: 'CU33',
    category: 'Activos y Equipamiento',
    title: 'Garantías',
    fullTitle: 'Garantías de Equipamiento e Instalaciones',
    singular: 'garantía',
    date: 'Vencimiento',
    icon: 'shield',
    help: 'Control de pólizas y garantías vigentes de ascensores, bombas de agua, portones, generadores y obras del condominio.',
    states: { active: 'Vigente', claimed: 'En reclamo', closed: 'Cerrada' },
    stateColors: { active: 'success', claimed: 'warning', closed: 'neutral' },
    fields: [
      { key: 'provider', label: 'Garante o proveedor', placeholder: 'Ej: Otis Ascensores S.A., Impermeabilizaciones del Valle', hint: 'Empresa o contratista responsable de cubrir la garantía', max: 100 },
      { key: 'reference', label: 'Referencia de garantía', placeholder: 'Ej: POL-2026-ASC, FACT-4890, CONTRATO-OBRA-03', hint: 'Número de póliza, factura o contrato de servicio', max: 80 },
      { key: 'coverage', label: 'Cobertura', type: 'long', placeholder: 'Ej: Cubre motor principal, cuadro de mando eléctrico, cables y mano de obra por falla de fábrica.', hint: 'Componentes, condiciones o piezas amparadas por la garantía', max: 400 },
    ],
  },
  quotes: {
    cu: 'CU34 · CU36',
    category: 'Presupuestos y Adquisiciones',
    title: 'Cotizaciones',
    fullTitle: 'Cotizaciones y Presupuestos de Proveedores',
    singular: 'cotización',
    date: 'Válida hasta',
    icon: 'file-text',
    help: 'Registra presupuestos de contratistas para obras y reparaciones. Compara costos, plazos y garantías con asistencia de IA.',
    states: { received: 'Recibida', shortlisted: 'Preseleccionada', discarded: 'Descartada' },
    stateColors: { received: 'neutral', shortlisted: 'success', discarded: 'danger' },
    fields: [
      { key: 'provider', label: 'Proveedor', placeholder: 'Ej: Pinturas Pro Bolivia, Ferretería Central', hint: 'Nombre de la empresa o profesional que cotiza', max: 100 },
      { key: 'request_code', label: 'Código de solicitud', placeholder: 'Ej: SOL-PINTURA-EXT, REPARACION-PORTON', hint: 'Código común para agrupar ofertas del mismo trabajo (ej: SOL-01)', max: 40 },
      { key: 'amount', label: 'Monto total con impuestos', type: 'number', placeholder: '0.00', hint: 'Importe total cotizado con factura oficial', max: 9999999999.99, decimal: true },
      { key: 'currency', label: 'Moneda', type: 'select', options: ['BOB', 'USD'] },
      { key: 'delivery_days', label: 'Días de entrega', type: 'number', placeholder: 'Ej: 15', hint: 'Plazo estimado de entrega o ejecución en días calendario', max: 3650 },
      { key: 'warranty_months', label: 'Meses de garantía', type: 'number', placeholder: 'Ej: 12', hint: 'Meses de garantía ofrecidos sobre el trabajo o materiales', max: 1200 },
      { key: 'scope', label: 'Alcance de la oferta', type: 'long', placeholder: 'Ej: Incluye mano de obra calificada, pintura látex lavable de primera calidad, andamios y limpieza final.', hint: 'Descripción detallada de los ítems y condiciones que incluye', max: 400 },
    ],
  },
  inspections: {
    cu: 'CU35 · CU37',
    category: 'Mantenimiento Preventivo',
    title: 'Inspecciones operativas',
    fullTitle: 'Inspecciones Técnicas de Áreas Comunes',
    singular: 'inspección',
    date: 'Fecha de inspección',
    icon: 'search',
    help: 'Rondas de revisión técnica en pasillos, lobby, piscinas y áreas comunes con checklist estándar de 5 puntos y seguimiento con IA.',
    states: { draft: 'Borrador', reviewed: 'Revisada', closed: 'Cerrada' },
    stateColors: { draft: 'neutral', reviewed: 'success', closed: 'warning' },
    fields: [
      { key: 'location', label: 'Lugar revisado', placeholder: 'Ej: Pasillo Bloque B Piso 4, Área de Piscinas, Cuarto de Bombas', hint: 'Ubicación física específica revisada en el condominio', max: 100 },
      { key: 'notes', label: 'Notas internas', type: 'long', placeholder: 'Ej: Se detectó humedad en la pared lateral y luminaria parpadeante frente al ascensor.', hint: 'Observaciones técnicas del personal para el informe de administración', max: 400, optional: true },
    ],
  },
};

export const CHECKS = [
  ['lighting', 'Iluminación'],
  ['signage', 'Señalización'],
  ['surfaces', 'Pisos y superficies'],
  ['drainage', 'Drenaje visible'],
  ['order', 'Orden y limpieza'],
] as const;

export const CONDITIONS: Record<string, string> = {
  ok: 'Conforme',
  attention: 'Requiere atención',
  not_checked: 'Sin revisar',
};
