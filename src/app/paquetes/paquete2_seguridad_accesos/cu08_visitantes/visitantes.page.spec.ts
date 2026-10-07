import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../../core/auth/auth.service';
import { VisitantesPage } from './visitantes.page';
import { VisitantesApi } from './visitantes.api';
import { VisitAuthorization, VisitListResponse } from './visitantes.models';

describe('VisitantesPage', () => {
  const apiMock = {
    list: vi.fn(),
    options: vi.fn(),
    units: vi.fn(),
    residents: vi.fn(),
    cancel: vi.fn(),
  };

  const authMock = {
    user: vi.fn().mockReturnValue({
      id: 1,
      full_name: 'Admin Sistema',
      is_superuser: true,
      role: { permissions: ['manage_visits'] },
    }),
  };

  const sampleVisit: VisitAuthorization = {
    id: 1,
    visitor: {
      id: 10,
      first_name: 'Laura',
      last_name: 'Vargas',
      full_name: 'Laura Vargas',
      document_type: 'CI',
      document_number: '654321',
    },
    unit: 101,
    unit_detail: { id: 101, code: '101-A', sector_name: 'Torre 1' },
    purpose: 'Visita de cortesía',
    valid_from: '2026-09-24T18:00:00Z',
    valid_until: '2026-09-24T22:00:00Z',
    status: 'AUTHORIZED',
    status_display: 'Autorizada',
    created_at: '2026-09-24T10:00:00Z',
  };

  const mockListResponse: VisitListResponse = {
    pagination: {
      page: 1,
      page_size: 20,
      total_items: 1,
      total_pages: 1,
      next: null,
      previous: null,
    },
    results: [sampleVisit],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.list.mockReturnValue(of(mockListResponse));
    apiMock.options.mockReturnValue(of({ statuses: [], document_types: [] }));
    apiMock.units.mockReturnValue(of({ results: [] }));
    apiMock.residents.mockReturnValue(of({ results: [] }));

    TestBed.configureTestingModule({
      imports: [VisitantesPage],
      providers: [
        { provide: VisitantesApi, useValue: apiMock },
        { provide: AuthService, useValue: authMock },
      ],
    });
  });

  async function createPage() {
    const fixture = TestBed.createComponent(VisitantesPage);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  }

  it('loads visits and options on initialization', async () => {
    const fixture = await createPage();
    expect(apiMock.list).toHaveBeenCalled();
    expect(apiMock.options).toHaveBeenCalled();
    expect(fixture.componentInstance.visits().length).toBe(1);
    expect(fixture.componentInstance.authorizedCount()).toBe(1);
  });

  it('renders visitor name and unit badge in table', async () => {
    const fixture = await createPage();
    fixture.detectChanges();
    const html = fixture.nativeElement.innerHTML as string;

    expect(html).toContain('Laura Vargas');
    expect(html).toContain('101-A');
    expect(html).toContain('Autorizada');
  });

  it('opens and closes the authorization editor modal', async () => {
    const fixture = await createPage();
    expect(fixture.componentInstance.isEditorOpen()).toBe(false);

    fixture.componentInstance.openCreate();
    expect(fixture.componentInstance.isEditorOpen()).toBe(true);

    fixture.componentInstance.closeEditor();
    expect(fixture.componentInstance.isEditorOpen()).toBe(false);
  });

  it('opens and closes the detail modal', async () => {
    const fixture = await createPage();
    expect(fixture.componentInstance.isDetailOpen()).toBe(false);

    fixture.componentInstance.openDetail(sampleVisit);
    expect(fixture.componentInstance.isDetailOpen()).toBe(true);
    expect(fixture.componentInstance.selectedVisit()?.id).toBe(1);

    fixture.componentInstance.closeDetail();
    expect(fixture.componentInstance.isDetailOpen()).toBe(false);
  });
});
