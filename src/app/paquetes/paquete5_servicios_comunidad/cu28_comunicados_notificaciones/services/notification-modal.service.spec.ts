import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationModalService } from './notification-modal.service';
import { AnnouncementsApi, NotificationItem } from '../announcements.api';
import { AuthService } from '../../../../core/auth/auth.service';

describe('NotificationModalService', () => {
  let service: NotificationModalService;
  let apiMock: any;
  let authMock: any;

  const mockHighNotif: NotificationItem = {
    id: 101,
    user_id: 2,
    notification_type: 'ANNOUNCEMENT',
    title: 'Corte de Luz Programado',
    message: 'Se cortará el suministro de 14:00 a 16:00',
    resource_type: 'announcement',
    resource_id: '1',
    priority: 'HIGH',
    audience: 'RESIDENTS',
    sent_at: '2026-11-21T18:00:00Z',
    read_at: null,
    is_read: false,
    created_at: '2026-11-21T18:00:00Z',
  };

  const mockNormalNotif: NotificationItem = {
    id: 102,
    user_id: 2,
    notification_type: 'ANNOUNCEMENT',
    title: 'Reunión de vecinos',
    message: 'Reunión ordinaria el sábado',
    resource_type: 'announcement',
    resource_id: '2',
    priority: 'NORMAL',
    audience: 'RESIDENTS',
    sent_at: '2026-11-21T17:00:00Z',
    read_at: null,
    is_read: false,
    created_at: '2026-11-21T17:00:00Z',
  };

  beforeEach(() => {
    apiMock = {
      getUnreadCount: vi.fn().mockReturnValue(of({ unread_count: 2 })),
      getNotifications: vi.fn().mockReturnValue(of([mockHighNotif, mockNormalNotif])),
      markNotificationAsRead: vi.fn().mockReturnValue(of({ ...mockHighNotif, is_read: true })),
      markAllNotificationsAsRead: vi.fn().mockReturnValue(of({ marked_read: 2 })),
    };

    authMock = {
      user: vi.fn().mockReturnValue({
        id: 2,
        email: 'residente@taji.app',
        is_superuser: false,
        role: { slug: 'residente', permissions: [] },
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        NotificationModalService,
        { provide: AnnouncementsApi, useValue: apiMock },
        { provide: AuthService, useValue: authMock },
      ],
    });

    service = TestBed.inject(NotificationModalService);
  });

  it('detecta y encola un comunicado de alta prioridad al comprobar pendientes', () => {
    service.checkPendingHighPriority();

    expect(apiMock.getUnreadCount).toHaveBeenCalled();
    expect(apiMock.getNotifications).toHaveBeenCalledWith(true);
    expect(service.unreadCount()).toBe(2);
    expect(service.currentHighPriority()).toEqual(mockHighNotif);
  });

  it('no muestra modal a administradores emisores de comunicados', () => {
    authMock.user.mockReturnValue({
      id: 1,
      email: 'admin@taji.app',
      is_superuser: true,
      role: { slug: 'administrador', permissions: ['manage_announcements'] },
    });

    service.checkPendingHighPriority();

    expect(service.currentHighPriority()).toBeNull();
    expect(apiMock.getNotifications).not.toHaveBeenCalled();
    expect(apiMock.getUnreadCount).toHaveBeenCalled();
  });

  it('no muestra modal si la notificación es de prioridad normal o baja', () => {
    apiMock.getNotifications.mockReturnValue(of([mockNormalNotif]));

    service.checkPendingHighPriority();

    expect(service.currentHighPriority()).toBeNull();
  });

  it('descarta temporalmente el modal con "Ver después" sin marcar lectura', () => {
    service.checkPendingHighPriority();
    expect(service.currentHighPriority()).not.toBeNull();

    service.dismissForSession();

    expect(service.currentHighPriority()).toBeNull();
    expect(apiMock.markNotificationAsRead).not.toHaveBeenCalled();
    expect(service.unreadCount()).toBe(2);

    // Si vuelve a ejecutarse en la misma sesión, no debe reaparecer
    service.checkPendingHighPriority();
    expect(service.currentHighPriority()).toBeNull();
  });

  it('persiste la lectura en Backend con "Entendido" y decrementa el contador', () => {
    service.checkPendingHighPriority();
    expect(service.currentHighPriority()).not.toBeNull();

    service.markAsUnderstood();

    expect(apiMock.markNotificationAsRead).toHaveBeenCalledWith(101);
    expect(service.unreadCount()).toBe(1);
    expect(service.currentHighPriority()).toBeNull();
  });

  it('maneja errores al marcar como entendido mostrando un mensaje claro', () => {
    apiMock.markNotificationAsRead.mockReturnValue(
      throwError(() => new Error('Error de red'))
    );

    service.checkPendingHighPriority();
    service.markAsUnderstood();

    expect(service.errorMessage()).toContain('No se pudo confirmar la lectura');
    expect(service.currentHighPriority()).not.toBeNull();
  });
});
