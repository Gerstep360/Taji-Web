import { describe, expect, it } from 'vitest';
import { evidenceError, reportBody, sectorContains } from './incident-report.api';

describe('Contrato de registro de incidencias', () => {
  it('respeta descendientes y no entra en bucle con datos cíclicos', () => {
    const sectors = [
      { id: 1, code: 'A', parent: null },
      { id: 2, code: 'P1', parent: 1 },
      { id: 3, code: 'B', parent: null },
    ];
    expect(sectorContains(sectors, 1, 2)).toBe(true);
    expect(sectorContains(sectors, 1, 3)).toBe(false);
    expect(
      sectorContains(
        [
          { id: 1, code: 'A', parent: 2 },
          { id: 2, code: 'B', parent: 1 },
        ],
        99,
        1,
      ),
    ).toBe(false);
  });
  it('aplica los límites del servidor antes de enviar archivos', () => {
    const rules = { max_files: 1, max_file_size_bytes: 10, allowed_extensions: ['png'] };
    const png = new File(['data'], 'foto.PNG');
    expect(evidenceError([png], rules)).toBe('');
    expect(evidenceError([png, png], rules)).toContain('hasta 1');
    expect(evidenceError([new File(['MZ'], 'archivo.exe')], rules)).toContain('no está permitido');
    expect(evidenceError([new File([], 'vacio.png')], rules)).toContain('vacío');
    expect(evidenceError([new File(['12345678901'], 'grande.png')], rules)).toContain('supera');
  });
  it('envía multipart sin campos de estado, prioridad ni reportante manipulables', () => {
    const body = reportBody(
      {
        title: ' Fuga ',
        description: ' Agua en pasillo ',
        category: '3',
        sector: '5',
        unit: '',
        asset: '',
      },
      [new File(['test'], 'evidencia.png')],
    );
    expect(body.get('title')).toBe('Fuga');
    expect(body.get('description')).toBe('Agua en pasillo');
    expect(body.has('unit')).toBe(false);
    expect(body.getAll('evidences')).toHaveLength(1);
    for (const key of ['priority', 'status', 'reporter', 'condominium'])
      expect(body.has(key)).toBe(false);
  });
});
