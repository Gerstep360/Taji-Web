import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationBellComponent } from './notification-bell.component';
import { NotificationModalService } from '../services/notification-modal.service';
import { NotificationItem } from '../announcements.api';

describe('NotificationBellComponent', () => {
  let component: NotificationBellComponent;
  let fixture: ComponentFixture<NotificationBellComponent>;
  let modalServiceMock: any;

  const mockNotifList: NotificationItem[] = [
    {
      id: 1,
      user_id: 10,
      notification_type: 'ANNOUNCEMENT',
      title: 'Aviso 1',
      message: 'Mensaje de prueba',
      resource_type: 'announcement',
      resource_id: '1',
      priority: 'HIGH',
      audience: 'ALL',
      sent_at: '2026-11-21T12:00:00Z',
      read_at: null,
      is_read: false,
      created_at: '2026-11-21T12:00:00Z',
    },
  ];

  beforeEach(async () => {
    modalServiceMock = {
      unreadCount: signal<number>(1),
      notifications: signal<NotificationItem[]>(mockNotifList),
      loadAllNotifications: vi.fn(),
      markRead: vi.fn(),
      markAllRead: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [NotificationBellComponent],
      providers: [
        provideRouter([]),
        { provide: NotificationModalService, useValue: modalServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationBellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse y mostrar el badge con el conteo de no leídas', () => {
    expect(component).toBeTruthy();
    const badge = fixture.nativeElement.querySelector('.unread-badge');
    expect(badge?.textContent.trim()).toBe('1');
  });

  it('debe abrir el dropdown y cargar notificaciones al hacer clic en la campana', () => {
    const bellBtn = fixture.nativeElement.querySelector('.bell-btn');
    bellBtn.click();
    fixture.detectChanges();

    expect(component.isOpen()).toBe(true);
    expect(modalServiceMock.loadAllNotifications).toHaveBeenCalled();

    const dropdown = fixture.nativeElement.querySelector('.notifications-dropdown');
    expect(dropdown).toBeTruthy();
  });

  it('debe permitir marcar todas las notificaciones como leídas', () => {
    component.isOpen.set(true);
    fixture.detectChanges();

    const markAllBtn = fixture.nativeElement.querySelector('.mark-all-btn');
    markAllBtn.click();

    expect(modalServiceMock.markAllRead).toHaveBeenCalled();
  });
});
