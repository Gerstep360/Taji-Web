import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';

import { AccessControlApi } from './access-control.api';
import { AccessEventItem } from './access-control.models';
import { ControlAccesosPage } from './control-accesos.page';

describe('ControlAccesosPage', () => {
  const createdEvent: AccessEventItem = {
    id: 1,
    person_id: 12,
    person: {
      id: 12,
      first_name: 'Ana',
      last_name: 'Márquez',
      full_name: 'Ana Márquez',
      document_type: 'CI',
      document_number: '1234567',
      contact_email: '',
      phone: '',
    },
    visitor_name: '',
    visitor_document_number: '',
    guard_staff_id: 3,
    guard_staff: null,
    authorization_id: null,
    unit_id: 8,
    unit: { id: 8, code: 'C-08', unit_type: 'Casa', sector_name: 'Los Pinos' },
    event_type: 'DENIED',
    event_type_display: 'Denegado',
    validation_method: 'MANUAL',
    validation_method_display: 'Manual',
    validation_result: 'REJECTED',
    validation_result_display: 'Rechazado',
    occurred_at: '2026-10-04T10:00:00Z',
    notes: 'Sin autorización',
  };

  let fixture: ReturnType<typeof TestBed.createComponent<ControlAccesosPage>>;
  let api: {
    list: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    searchPeople: ReturnType<typeof vi.fn>;
    searchUnits: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    api = {
      list: vi.fn().mockReturnValue(
        of({
          pagination: {
            page: 1,
            page_size: 10,
            total_items: 0,
            total_pages: 0,
            next: null,
            previous: null,
          },
          results: [],
        }),
      ),
      create: vi.fn().mockReturnValue(of(createdEvent)),
      searchPeople: vi.fn().mockReturnValue(of({ results: [] })),
      searchUnits: vi.fn().mockReturnValue(of({ results: [] })),
    };
    await TestBed.configureTestingModule({
      imports: [ControlAccesosPage],
      providers: [{ provide: AccessControlApi, useValue: api }],
    }).compileComponents();
    fixture = TestBed.createComponent(ControlAccesosPage);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('shows the three CU11 access event actions', () => {
    const labels = Array.from(
      fixture.nativeElement.querySelectorAll('.event-type-options label') as NodeListOf<HTMLElement>,
    ).map((label) => label.textContent?.trim());

    expect(labels).toEqual(['Entrada', 'Salida', 'Acceso denegado']);
  });

  it('submits denied access as rejected and adds it to the visible history', () => {
    const page = fixture.componentInstance;
    page.form.controls.person_id.setValue(12);
    page.form.controls.unit_id.setValue(8);
    page.form.controls.event_type.setValue('DENIED');
    page.onEventTypeChange();
    page.submit();
    fixture.detectChanges();

    expect(api.create).toHaveBeenCalledWith({
      person_id: 12,
      unit_id: 8,
      event_type: 'DENIED',
      validation_method: 'MANUAL',
      validation_result: 'REJECTED',
      notes: '',
    });
    expect(page.events()).toEqual([createdEvent]);
    expect(page.success()).toContain('Evento “Denegado” guardado para Ana Márquez');
    expect(fixture.nativeElement.textContent).toContain('Ana Márquez');
    expect(fixture.nativeElement.textContent).toContain('Destino: C-08');
  });

  it('submits an unknown visitor identity only for this access event', () => {
    const page = fixture.componentInstance;
    page.form.controls.person_mode.setValue('visitor');
    page.onPersonModeChange();
    page.form.patchValue({
      visitor_name: 'Carlos Visitante',
      visitor_document_number: '7654321',
      unit_id: 8,
      event_type: 'ENTRY',
    });
    page.submit();

    expect(api.create).toHaveBeenCalledWith({
      visitor_name: 'Carlos Visitante',
      visitor_document_number: '7654321',
      unit_id: 8,
      event_type: 'ENTRY',
      validation_method: 'MANUAL',
      validation_result: 'APPROVED',
      notes: '',
    });
  });
});