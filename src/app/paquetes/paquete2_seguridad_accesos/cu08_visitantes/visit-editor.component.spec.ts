import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { VisitEditorComponent } from './visit-editor.component';
import { VisitantesApi } from './visitantes.api';
import { VisitAuthorization } from './visitantes.models';

describe('VisitEditorComponent', () => {
  const apiMock = {
    create: vi.fn(),
    update: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      imports: [VisitEditorComponent],
      providers: [{ provide: VisitantesApi, useValue: apiMock }],
    });
  });

  async function createEditor() {
    const fixture = TestBed.createComponent(VisitEditorComponent);
    fixture.componentRef.setInput('options', {
      statuses: [{ value: 'AUTHORIZED', label: 'Autorizada' }],
      document_types: [{ value: 'CI', label: 'Cédula de Identidad' }],
    });
    fixture.componentRef.setInput('units', [{ id: 1, code: '101', sector_name: 'Torre A' }]);
    fixture.componentRef.setInput('residents', [{ id: 2, full_name: 'Juan Pérez' }]);
    await fixture.whenStable();
    return fixture;
  }

  it('initializes form with validation requirements in creation mode', async () => {
    const fixture = await createEditor();
    const form = fixture.componentInstance.form;

    expect(form.valid).toBe(false);
    expect(form.get('visitor_first_name')?.hasError('required')).toBe(true);
    expect(form.get('visitor_last_name')?.hasError('required')).toBe(true);
    expect(form.get('purpose')?.hasError('required')).toBe(true);
  });

  it('validates dates order so valid_until cannot be earlier than valid_from', async () => {
    const fixture = await createEditor();
    const form = fixture.componentInstance.form;

    form.patchValue({
      visitor_first_name: 'Ana',
      visitor_last_name: 'Rojas',
      unit_id: 1,
      purpose: 'Visita familiar',
      valid_from: '2026-09-24T20:00',
      valid_until: '2026-09-24T18:00', // anterior a valid_from
    });

    expect(form.hasError('datesInverted')).toBe(true);
    expect(form.valid).toBe(false);
  });

  it('submits valid creation payload via VisitantesApi and emits saved event', async () => {
    const fixture = await createEditor();
    const savedSpy = vi.fn();
    fixture.componentInstance.saved.subscribe(savedSpy);

    const createdVisit: VisitAuthorization = {
      id: 10,
      visitor: {
        id: 1,
        first_name: 'Carlos',
        last_name: 'Medina',
        full_name: 'Carlos Medina',
        document_type: 'CI',
        document_number: '1234567',
      },
      unit: 1,
      purpose: 'Visita de trabajo',
      valid_from: '2026-09-24T18:00:00.000Z',
      valid_until: '2026-09-24T22:00:00.000Z',
      status: 'AUTHORIZED',
      status_display: 'Autorizada',
      created_at: '2026-09-24T10:00:00.000Z',
    };

    apiMock.create.mockReturnValue(of(createdVisit));

    fixture.componentInstance.form.patchValue({
      visitor_first_name: 'Carlos',
      visitor_last_name: 'Medina',
      unit_id: 1,
      purpose: 'Visita de trabajo',
      valid_from: '2026-09-24T18:00',
      valid_until: '2026-09-24T22:00',
    });

    fixture.componentInstance.onSubmit();

    expect(apiMock.create).toHaveBeenCalledOnce();
    expect(savedSpy).toHaveBeenCalledWith(createdVisit);
  });
});
