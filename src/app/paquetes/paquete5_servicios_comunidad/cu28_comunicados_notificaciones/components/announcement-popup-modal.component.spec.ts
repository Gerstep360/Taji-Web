import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnnouncementPopupModalComponent } from './announcement-popup-modal.component';
import { NotificationModalService } from '../services/notification-modal.service';
import { NotificationItem } from '../announcements.api';

describe('AnnouncementPopupModalComponent', () => {
  let component: AnnouncementPopupModalComponent;
  let fixture: ComponentFixture<AnnouncementPopupModalComponent>;
  let modalServiceMock: any;

  const sampleNotif: NotificationItem = {
    id: 99,
    user_id: 1,
    notification_type: 'ANNOUNCEMENT',
    title: 'Aviso Importante de Seguridad',
    message: 'Mantenimiento del portón principal de acceso.',
    resource_type: 'announcement',
    resource_id: '5',
    priority: 'HIGH',
    audience: 'RESIDENTS',
    sent_at: '2026-11-21T10:00:00Z',
    read_at: null,
    is_read: false,
    created_at: '2026-11-21T10:00:00Z',
  };

  beforeEach(async () => {
    modalServiceMock = {
      currentHighPriority: signal<NotificationItem | null>(sampleNotif),
      currentFloatingToast: signal<NotificationItem | null>(null),
      isProcessing: signal<boolean>(false),
      errorMessage: signal<string | null>(null),
      dismissForSession: vi.fn(),
      dismissFloatingToast: vi.fn(),
      markAsUnderstood: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [AnnouncementPopupModalComponent],
      providers: [
        { provide: NotificationModalService, useValue: modalServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AnnouncementPopupModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse correctamente y mostrar el modal cuando hay un aviso de alta prioridad', () => {
    expect(component).toBeTruthy();
    const titleEl = fixture.nativeElement.querySelector('.announcement-title');
    expect(titleEl?.textContent).toContain('Aviso Importante de Seguridad');
    const badgeEl = fixture.nativeElement.querySelector('.priority-badge');
    expect(badgeEl?.textContent).toContain('Prioridad HIGH');
  });

  it('debe llamar a dismissForSession al pulsar el botón "Ver después"', () => {
    const dismissBtn = fixture.nativeElement.querySelector('.btn-secondary');
    dismissBtn.click();
    expect(modalServiceMock.dismissForSession).toHaveBeenCalled();
  });

  it('debe llamar a markAsUnderstood al pulsar el botón "Entendido"', () => {
    const understoodBtn = fixture.nativeElement.querySelector('.btn-primary');
    understoodBtn.click();
    expect(modalServiceMock.markAsUnderstood).toHaveBeenCalled();
  });

  it('no debe renderizar el backdrop del modal si no hay aviso de alta prioridad', () => {
    modalServiceMock.currentHighPriority.set(null);
    fixture.detectChanges();
    const modalBackdrop = fixture.nativeElement.querySelector('.modal-backdrop');
    expect(modalBackdrop).toBeNull();
  });

  it('renderiza el componente hijo de notificación flotante de forma independiente', () => {
    modalServiceMock.currentHighPriority.set(null);
    modalServiceMock.currentFloatingToast.set(sampleNotif);
    fixture.detectChanges();

    // El backdrop del modal no existe
    expect(fixture.nativeElement.querySelector('.modal-backdrop')).toBeNull();
    // La notificación flotante sí está presente
    const toast = fixture.nativeElement.querySelector('.floating-toast-container');
    expect(toast).toBeTruthy();
  });
});
