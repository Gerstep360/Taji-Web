import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RegistrarIncidenciaApi } from './registrar-incidencia.api';
import { IncidentReport, IncidentReportDraft, IncidentReportOptions } from './registrar-incidencia.models';
import { RegistrarIncidenciaPage } from './registrar-incidencia.page';

const OPTIONS: IncidentReportOptions = {
  categories: [
    { id: 1, code: 'PLUMBING', name: 'Plomería', description: 'Fugas', default_priority: { code: 'HIGH', name: 'Alta' } },
    { id: 2, code: 'ELECTRIC', name: 'Electricidad', description: '', default_priority: null },
  ],
  priorities: [{ id: 1, code: 'HIGH', name: 'Alta', rank: 1, target_minutes: 60 }],
  sectors: [
    { id: 10, code: 'TA', name: 'Torre A', sector_type: 'TOWER', parent: null },
    { id: 11, code: 'TA-P1', name: 'Piso 1', sector_type: 'FLOOR', parent: 10 },
    { id: 20, code: 'TB', name: 'Torre B', sector_type: 'TOWER', parent: null },
  ],
  units: [
    { id: 100, code: 'A-101', unit_type: 'APARTMENT', sector: 11 },
    { id: 200, code: 'B-201', unit_type: 'APARTMENT', sector: 20 },
  ],
  assets: [
    { id: 500, code: 'BOMBA-1', name: 'Bomba de agua', sector: 10 },
    { id: 501, code: 'ASC-B', name: 'Ascensor B', sector: 20 },
    { id: 502, code: 'GEN', name: 'Generador', sector: null },
  ],
  evidence_rules: {
    field_name: 'evidences',
    max_files: 3,
    max_file_size_bytes: 1024,
    allowed_extensions: ['jpeg', 'jpg', 'pdf', 'png', 'webp'],
    allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  },
};

const CREATED: IncidentReport = {
  id: 9,
  public_code: 'INC-2026-000123',
  condominium: 1,
  status: 'REPORTED',
  status_display: 'Reportada',
  title: '',
  description: 'Fuga en el pasillo',
  category: { id: 1, code: 'PLUMBING', name: 'Plomería' },
  priority: { id: 1, code: 'HIGH', name: 'Alta', rank: 1 },
  sector: { id: 11, code: 'TA-P1', name: 'Piso 1' },
  unit: { id: 100, code: 'A-101' },
  asset: null,
  reporter: { id: 4, full_name: 'Ana Rojas' },
  evidences: [],
  created_at: '2026-10-26T10:00:00Z',
  updated_at: '2026-10-26T10:00:00Z',
};

function httpError(status: number, error: unknown): HttpErrorResponse {
  return new HttpErrorResponse({ status, error, url: '/api/v1/incidents/' });
}

describe('CU18 Registrar incidencia (página)', () => {
  const api = { options: vi.fn(), create: vi.fn() };
  const createObjectURL = vi.fn((blob: Blob) => `blob:${(blob as File).name}`);
  const revokeObjectURL = vi.fn();
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  let fixture: ComponentFixture<RegistrarIncidenciaPage>;
  let el: HTMLElement;

  beforeEach(async () => {
    vi.clearAllMocks();
    // jsdom no implementa object URLs: se simulan y se restauran al terminar.
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    api.options.mockReturnValue(of(OPTIONS));
    TestBed.configureTestingModule({
      imports: [RegistrarIncidenciaPage],
      providers: [provideRouter([]), { provide: RegistrarIncidenciaApi, useValue: api }],
    });
    fixture = TestBed.createComponent(RegistrarIncidenciaPage);
    el = fixture.nativeElement as HTMLElement;
    await render();
  });

  afterEach(() => {
    Object.assign(URL, { createObjectURL: originalCreate, revokeObjectURL: originalRevoke });
  });

  async function render(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function q<T extends Element>(selector: string): T {
    const node = el.querySelector<T>(selector);
    if (!node) throw new Error(`No se encontró ${selector}`);
    return node;
  }

  async function choose(selector: string, value: string): Promise<void> {
    const select = q<HTMLSelectElement>(selector);
    select.value = value;
    select.dispatchEvent(new Event('change'));
    await render();
  }

  async function type(selector: string, value: string): Promise<void> {
    const input = q<HTMLInputElement | HTMLTextAreaElement>(selector);
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await render();
  }

  async function attach(...files: File[]): Promise<void> {
    const input = q<HTMLInputElement>('#incident-evidences');
    Object.defineProperty(input, 'files', { value: files, configurable: true });
    input.dispatchEvent(new Event('change'));
    await render();
  }

  async function fillRequired(): Promise<void> {
    await type('#incident-description', 'Fuga en el pasillo');
    await choose('#incident-category', '1');
    await choose('#incident-sector', '11');
  }

  async function submit(): Promise<void> {
    q<HTMLButtonElement>('button[type="submit"]').click();
    await render();
  }

  function optionTexts(selector: string): string[] {
    return Array.from(q<HTMLSelectElement>(selector).options)
      .filter((o) => o.value !== '')
      .map((o) => o.textContent?.trim() ?? '');
  }

  it('renders the form with header, fields and submit button', () => {
    expect(q('h1').textContent).toContain('Nueva incidencia');
    for (const id of ['#incident-description', '#incident-category', '#incident-sector', '#incident-unit', '#incident-asset', '#incident-evidences']) {
      expect(el.querySelector(id)).not.toBeNull();
    }
    expect(q('button[type="submit"]').textContent).toContain('Registrar incidencia');
    // Prioridad y reportante los decide el backend: no se piden en el formulario.
    expect(el.querySelector('#incident-priority')).toBeNull();
  });

  it('loads categories and locations from the API', () => {
    expect(api.options).toHaveBeenCalledOnce();
    expect(optionTexts('#incident-category')).toEqual(['Plomería', 'Electricidad']);
    expect(optionTexts('#incident-sector').join('|')).toContain('Torre A');
    expect(optionTexts('#incident-sector').join('|')).toContain('Piso 1');
  });

  it('shows Spanish required-field messages and does not submit an invalid form', async () => {
    await type('#incident-description', '    ');
    await submit();
    const text = el.textContent ?? '';
    expect(text).toContain('La descripción es obligatoria.');
    expect(text).toContain('Selecciona una categoría.');
    expect(text).toContain('Selecciona la ubicación de la incidencia.');
    expect(api.create).not.toHaveBeenCalled();
  });

  it('filters units by the selected sector (including its sub-sectors) and resets stale choices', async () => {
    await choose('#incident-sector', '10');
    expect(optionTexts('#incident-unit')).toEqual(['A-101']);
    await choose('#incident-unit', '100');

    await choose('#incident-sector', '20');
    expect(optionTexts('#incident-unit')).toEqual(['B-201']);
    expect(fixture.componentInstance.form.controls.unit.value).toBe('');
    const assets = optionTexts('#incident-asset').join('|');
    expect(assets).toContain('Ascensor B');
    expect(assets).toContain('Generador');
    expect(assets).not.toContain('Bomba de agua');
  });

  it('attaches evidence with image thumbnail and document preview, and rejects invalid files', async () => {
    await attach(
      new File(['img'], 'foto.png', { type: 'image/png' }),
      new File(['pdf'], 'acta.pdf', { type: 'application/pdf' }),
      new File(['exe'], 'malware.exe', { type: 'application/octet-stream' }),
    );

    const items = el.querySelectorAll('.evidence-item');
    expect(items.length).toBe(2);
    expect(q<HTMLImageElement>('.evidence-item img').src).toBe('blob:foto.png');
    expect(items[1].textContent).toContain('acta.pdf');
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(el.textContent).toContain('malware.exe');
    expect(el.textContent).toContain('formato no permitido');
  });

  it('removes an evidence before submitting and revokes its preview URL', async () => {
    await attach(new File(['img'], 'foto.png', { type: 'image/png' }));
    q<HTMLButtonElement>('.evidence-item button').click();
    await render();
    expect(el.querySelectorAll('.evidence-item').length).toBe(0);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:foto.png');
  });

  it('submits only the allowed fields to the API', async () => {
    api.create.mockReturnValue(of(CREATED));
    await type('#incident-title', 'Fuga');
    await fillRequired();
    await choose('#incident-unit', '100');
    await attach(new File(['img'], 'foto.png', { type: 'image/png' }));
    await submit();

    expect(api.create).toHaveBeenCalledOnce();
    const draft = api.create.mock.calls[0][0] as IncidentReportDraft;
    expect(draft).toEqual({
      title: 'Fuga',
      description: 'Fuga en el pasillo',
      category: 1,
      sector: 11,
      unit: 100,
      asset: null,
      evidences: [expect.any(File)],
    });
    expect(Object.keys(draft)).not.toContain('priority');
    expect(Object.keys(draft)).not.toContain('reporter');
  });

  it('shows the public code on success and allows registering another incident', async () => {
    api.create.mockReturnValue(of(CREATED));
    await fillRequired();
    await attach(new File(['img'], 'foto.png', { type: 'image/png' }));
    await submit();

    expect(el.textContent).toContain('INC-2026-000123');
    expect(el.textContent).toContain('Reportada');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:foto.png');

    q<HTMLButtonElement>('[data-testid="register-another"]').click();
    await render();
    expect(q<HTMLTextAreaElement>('#incident-description').value).toBe('');
    expect(el.textContent).not.toContain('INC-2026-000123');
  });

  it('prevents duplicate submissions while the request is pending', async () => {
    const pending = new Subject<IncidentReport>();
    api.create.mockReturnValue(pending);
    await fillRequired();
    await submit();
    await submit();

    expect(api.create).toHaveBeenCalledOnce();
    const button = q<HTMLButtonElement>('button[type="submit"]');
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('Registrando');

    pending.next(CREATED);
    pending.complete();
    await render();
    expect(el.textContent).toContain('INC-2026-000123');
  });

  it('maps backend 400 field errors to their fields and keeps the values', async () => {
    api.create.mockReturnValue(
      throwError(() =>
        httpError(400, {
          error: {
            code: 'validation_error',
            message: 'Revisa los datos.',
            fields: { sector: ['El sector no pertenece al condominio.'], evidences: ['Archivo dañado.'] },
          },
        }),
      ),
    );
    await fillRequired();
    await submit();

    expect(q('#incident-sector-error').textContent).toContain('El sector no pertenece al condominio.');
    expect(el.textContent).toContain('Archivo dañado.');
    expect(q<HTMLTextAreaElement>('#incident-description').value).toBe('Fuga en el pasillo');
    expect(q<HTMLSelectElement>('#incident-category').value).toBe('1');
    expect(q<HTMLButtonElement>('button[type="submit"]').disabled).toBe(false);
  });

  it('shows a permission message on 403 without losing the form', async () => {
    api.create.mockReturnValue(
      throwError(() =>
        httpError(403, { error: { code: 'permission_denied', message: 'No tienes permiso para registrar incidencias en este condominio.' } }),
      ),
    );
    await fillRequired();
    await submit();

    expect(q('[role="alert"]').textContent).toContain('No tienes permiso para registrar incidencias');
    expect(q<HTMLTextAreaElement>('#incident-description').value).toBe('Fuga en el pasillo');
  });

  it('shows a retryable message on 503 and keeps attached evidence', async () => {
    api.create.mockReturnValueOnce(throwError(() => httpError(503, { error: { code: 'storage_unavailable', message: 'x' } })));
    await fillRequired();
    await attach(new File(['img'], 'foto.png', { type: 'image/png' }));
    await submit();

    expect(q('[role="alert"]').textContent).toContain('No pudimos guardar las evidencias');
    expect(el.querySelectorAll('.evidence-item').length).toBe(1);

    api.create.mockReturnValueOnce(of(CREATED));
    await submit();
    expect(api.create).toHaveBeenCalledTimes(2);
    expect(el.textContent).toContain('INC-2026-000123');
  });

  it('shows an error with retry when the options cannot be loaded', async () => {
    api.options.mockReturnValueOnce(throwError(() => httpError(500, null))).mockReturnValueOnce(of(OPTIONS));
    fixture = TestBed.createComponent(RegistrarIncidenciaPage);
    el = fixture.nativeElement as HTMLElement;
    await render();

    expect(el.textContent).toContain('No pudimos cargar');
    expect(el.querySelector('form')).toBeNull();
    q<HTMLButtonElement>('[data-testid="retry-options"]').click();
    await render();
    expect(el.querySelector('form')).not.toBeNull();
  });

  it('revokes remaining preview URLs when the page is destroyed', async () => {
    await attach(new File(['img'], 'foto.png', { type: 'image/png' }));
    fixture.destroy();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:foto.png');
  });
});
