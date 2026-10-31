import { IncidentEvidenceRules } from './registrar-incidencia.models';

export type EvidenceKind = 'image' | 'document';

export interface EvidenceSelection {
  accepted: File[];
  errors: string[];
}

/**
 * Validación de evidencias en el cliente, solo para orientar al usuario antes
 * de enviar. El backend vuelve a validar y es quien decide.
 */
export function selectEvidences(
  current: readonly File[],
  incoming: readonly File[],
  rules: IncidentEvidenceRules,
): EvidenceSelection {
  const accepted: File[] = [];
  const errors: string[] = [];
  const allowedExtensions = rules.allowed_extensions.map((ext) => ext.toLowerCase());
  const allowedMimes = rules.allowed_mime_types.map((mime) => mime.toLowerCase());
  let skippedForCount = 0;

  for (const file of incoming) {
    const extension = fileExtension(file.name);
    const mime = file.type.toLowerCase();
    if (!allowedExtensions.includes(extension) || (mime && allowedMimes.length && !allowedMimes.includes(mime))) {
      errors.push(
        `"${file.name}": formato no permitido. Usa ${allowedExtensions.map((ext) => ext.toUpperCase()).join(', ')}.`,
      );
      continue;
    }
    if (file.size > rules.max_file_size_bytes) {
      errors.push(`"${file.name}": supera el tamaño máximo de ${formatFileSize(rules.max_file_size_bytes)}.`);
      continue;
    }
    if (current.length + accepted.length >= rules.max_files) {
      skippedForCount++;
      continue;
    }
    accepted.push(file);
  }

  if (skippedForCount) {
    errors.push(
      `Puedes adjuntar como máximo ${rules.max_files} archivos; ${skippedForCount === 1 ? 'se omitió 1 archivo' : `se omitieron ${skippedForCount} archivos`}.`,
    );
  }
  return { accepted, errors };
}

export function evidenceKind(file: File): EvidenceKind {
  return file.type.toLowerCase().startsWith('image/') ? 'image' : 'document';
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${Number((bytes / (1024 * 1024)).toFixed(1))} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function fileExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
}
