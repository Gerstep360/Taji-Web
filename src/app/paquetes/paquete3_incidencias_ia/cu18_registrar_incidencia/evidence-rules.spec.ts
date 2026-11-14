import { describe, expect, it } from 'vitest';

import { IncidentEvidenceRules } from './registrar-incidencia.models';
import { evidenceKind, formatFileSize, selectEvidences } from './evidence-rules';

const rules: IncidentEvidenceRules = {
  field_name: 'evidences',
  max_files: 2,
  max_file_size_bytes: 10,
  allowed_extensions: ['jpeg', 'jpg', 'pdf', 'png', 'webp'],
  allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
};

function file(name: string, size: number, type: string): File {
  return new File(['x'.repeat(size)], name, { type });
}

describe('CU18 evidence rules', () => {
  it('accepts files that respect extension, size and count', () => {
    const result = selectEvidences([], [file('a.PNG', 5, 'image/png')], rules);
    expect(result.accepted.map((f) => f.name)).toEqual(['a.PNG']);
    expect(result.errors).toEqual([]);
  });

  it('rejects unsupported extensions and oversized files with Spanish messages', () => {
    const result = selectEvidences(
      [],
      [file('virus.exe', 1, 'application/octet-stream'), file('grande.jpg', 11, 'image/jpeg')],
      rules,
    );
    expect(result.accepted).toEqual([]);
    expect(result.errors[0]).toContain('virus.exe');
    expect(result.errors[0]).toContain('formato no permitido');
    expect(result.errors[1]).toContain('grande.jpg');
    expect(result.errors[1]).toContain('supera');
  });

  it('rejects a disallowed MIME type even with a valid extension', () => {
    const result = selectEvidences([], [file('falso.png', 1, 'text/html')], rules);
    expect(result.accepted).toEqual([]);
    expect(result.errors[0]).toContain('falso.png');
  });

  it('does not exceed the maximum number of files', () => {
    const current = [file('1.png', 1, 'image/png')];
    const result = selectEvidences(current, [file('2.png', 1, 'image/png'), file('3.png', 1, 'image/png')], rules);
    expect(result.accepted.map((f) => f.name)).toEqual(['2.png']);
    expect(result.errors.join(' ')).toContain('máximo 2');
  });

  it('classifies images and documents and formats sizes', () => {
    expect(evidenceKind(file('a.webp', 1, 'image/webp'))).toBe('image');
    expect(evidenceKind(file('a.pdf', 1, 'application/pdf'))).toBe('document');
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5 MB');
    expect(formatFileSize(2048)).toBe('2 KB');
  });
});
