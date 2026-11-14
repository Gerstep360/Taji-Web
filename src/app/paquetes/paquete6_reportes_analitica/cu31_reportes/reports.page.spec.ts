import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../../core/auth/auth.service';
import { ReportsApi } from './reports.api';
import { ReportsPage } from './reports.page';
import { ReportVoiceService } from './report-voice.service';
import { ReportCatalog, ReportPreview } from './reports.models';

describe('CU31 cambio de condominio', () => {
  const user = signal({ active_tenant: { id: 1 } });
  const column = {
    key: 'title',
    label: 'Título',
    type: 'text' as const,
    operators: ['contains'],
    choices: [],
  };
  const catalog: ReportCatalog = {
    condominium: { id: 1, name: 'Taji' },
    export_limit: 10000,
    formats: ['csv'],
    voice_enabled: true,
    voice_suggestions: [],
    sources: [
      {
        key: 'incidents',
        label: 'Incidencias',
        description: '',
        columns: [column],
        default_columns: ['title'],
        default_ordering: [{ field: 'title', direction: 'asc' }],
      },
    ],
  };
  const result: ReportPreview = {
    source: 'incidents',
    title: 'Anterior',
    columns: [column],
    rows: [['Dato anterior']],
    pagination: { page: 1, page_size: 25, pages: 1, total: 1 },
    can_export: true,
  };
  const api = { catalog: vi.fn(), preview: vi.fn() };
  beforeEach(() => {
    user.set({ active_tenant: { id: 1 } });
    vi.clearAllMocks();
    api.catalog.mockReturnValue(of(catalog));
    TestBed.configureTestingModule({
      imports: [ReportsPage],
      providers: [
        { provide: ReportsApi, useValue: api },
        { provide: AuthService, useValue: { user } },
      ],
    });
    TestBed.overrideComponent(ReportsPage, {
      set: {
        template: '',
        providers: [
          { provide: ReportVoiceService, useValue: { stop: vi.fn(), stopSpeaking: vi.fn() } },
        ],
      },
    });
  });
  it('descarta una respuesta tardía y borra la consulta del condominio anterior', async () => {
    const pending = new Subject<ReportPreview>();
    api.preview.mockReturnValue(pending);
    const fixture = TestBed.createComponent(ReportsPage);
    await fixture.whenStable();
    const page = fixture.componentInstance;
    page.text = 'Datos del condominio anterior';
    const operation = page.preview();
    user.set({ active_tenant: { id: 2 } });
    await fixture.whenStable();
    pending.next(result);
    pending.complete();
    await operation;
    expect(page.result()).toBeNull();
    expect(page.text).toBe('');
    expect(page.busy()).toBe(false);
  });
  it('no actualiza la pantalla después de abandonar la ruta', async () => {
    const pending = new Subject<ReportPreview>();
    api.preview.mockReturnValue(pending);
    const fixture = TestBed.createComponent(ReportsPage);
    await fixture.whenStable();
    const page = fixture.componentInstance;
    const operation = page.preview();
    fixture.destroy();
    pending.next(result);
    pending.complete();
    await operation;
    expect(page.result()).toBeNull();
  });
});
