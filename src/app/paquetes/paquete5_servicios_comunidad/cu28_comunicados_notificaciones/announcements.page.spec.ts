import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnnouncementsPage } from './announcements.page';
import { AnnouncementsApi, AnnouncementItem } from './announcements.api';

describe('AnnouncementsPage (CU28 / T097)', () => {
  let component: AnnouncementsPage;
  let fixture: ComponentFixture<AnnouncementsPage>;

  const mockAnnouncements: AnnouncementItem[] = [
    {
      id: 1,
      created_by_user_id: 10,
      title: 'Aviso Importante Corte de Luz',
      body: 'Se cortará el suministro el día de mañana.',
      audience: 'ALL',
      priority: 'URGENT',
      status: 'PUBLISHED',
      published_at: '2026-11-21T10:00:00Z',
      expires_at: null,
      created_at: '2026-11-21T09:00:00Z',
      updated_at: '2026-11-21T10:00:00Z',
    },
    {
      id: 2,
      created_by_user_id: 10,
      title: 'Borrador Reunión Directiva',
      body: 'Temas a tratar en asamblea.',
      audience: 'DIRECTIVE',
      priority: 'NORMAL',
      status: 'DRAFT',
      published_at: null,
      expires_at: null,
      created_at: '2026-11-21T08:00:00Z',
      updated_at: '2026-11-21T08:00:00Z',
    },
  ];

  const apiMock = {
    list: vi.fn().mockReturnValue(of({ results: mockAnnouncements })),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    publish: vi.fn().mockReturnValue(
      of({ ...mockAnnouncements[1], status: 'PUBLISHED', published_at: '2026-11-21T11:00:00Z' }),
    ),
    archive: vi.fn().mockReturnValue(of({ ...mockAnnouncements[0], status: 'ARCHIVED' })),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnnouncementsPage],
      providers: [{ provide: AnnouncementsApi, useValue: apiMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(AnnouncementsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse correctamente e inicializar el listado de comunicados', () => {
    expect(component).toBeTruthy();
    expect(apiMock.list).toHaveBeenCalled();
    expect(component.items().length).toBe(2);
    expect(component.items()[0].title).toBe('Aviso Importante Corte de Luz');
  });

  it('debe abrir y cerrar el modal de creación', () => {
    expect(component.isFormOpen()).toBe(false);
    component.openCreateModal();
    expect(component.isFormOpen()).toBe(true);
    expect(component.editingItem()).toBeNull();

    component.closeModal();
    expect(component.isFormOpen()).toBe(false);
  });

  it('debe abrir modal en modo edición con los datos del comunicado', () => {
    component.openEditModal(mockAnnouncements[0]);
    expect(component.isFormOpen()).toBe(true);
    expect(component.editingItem()?.id).toBe(1);
    expect(component.formTitle).toBe('Aviso Importante Corte de Luz');
    expect(component.formAudience).toBe('ALL');
    expect(component.formPriority).toBe('URGENT');
  });

  it('debe publicar un borrador llamando a la API y actualizando el estado', async () => {
    await component.publishItem(mockAnnouncements[1]);
    expect(apiMock.publish).toHaveBeenCalledWith(2);
    expect(component.successNotice()).toContain('publicado y notificado');
  });

  it('debe archivar un comunicado llamando a la API', async () => {
    await component.archiveItem(mockAnnouncements[0]);
    expect(apiMock.archive).toHaveBeenCalledWith(1);
    expect(component.successNotice()).toContain('archivado');
  });
});
