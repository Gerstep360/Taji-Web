import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnnouncementFloatingToastComponent } from './announcement-floating-toast.component';
import { NotificationModalService } from '../services/notification-modal.service';
import { NotificationItem } from '../announcements.api';

describe('AnnouncementFloatingToastComponent', () => {
  let component: AnnouncementFloatingToastComponent;
  let fixture: ComponentFixture<AnnouncementFloatingToastComponent>;
  let modalServiceMock: any;

  const sampleHighToast: NotificationItem = {
    id: 105,
    user_id: 2,
    notification_type: 'ANNOUNCEMENT',
    title: 'Corte de Agua en Sector A',
    message: 'Mantenimiento urgente en tuberías matrices del condominio.',
    resource_type: 'announcement',
    resource_id: '12',
    priority: 'HIGH',
    audience: 'RESIDENTS',
    sent_at: '2026-11-21T12:00:00Z',
    read_at: null,
    is_read: false,
    created_at: '2026-11-21T12:00:00Z',
  };

  const sampleUrgentToast: NotificationItem = {
    id: 106,
    user_id: 2,
    notification_type: 'ANNOUNCEMENT',
    title: 'Evacuación por Simulacro',
    message: 'Simulacro general obligatorio a las 15:00 hrs.',
    resource_type: 'announcement',
    resource_id: '14',
    priority: 'URGENT',
    audience: 'ALL',
    sent_at: '2026-11-21T13:00:00Z',
    read_at: null,
    is_read: false,
    created_at: '2026-11-21T13:00:00Z',
  };

  beforeEach(async () => {
    modalServiceMock = {
      currentFloatingToast: signal<NotificationItem | null>(sampleHighToast),
      dismissFloatingToast: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [AnnouncementFloatingToastComponent],
      providers: [
        { provide: NotificationModalService, useValue: modalServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AnnouncementFloatingToastComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse correctamente y mostrar la notificación flotante', () => {
    expect(component).toBeTruthy();
    const titleEl = fixture.nativeElement.querySelector('.toast-title');
    expect(titleEl?.textContent).toContain('Corte de Agua en Sector A');
    const priorityEl = fixture.nativeElement.querySelector('.toast-priority-pill');
    expect(priorityEl?.textContent).toContain('Alta');
  });

  it('debe aplicar estilos de prioridad ALTA (amarillo pastel)', () => {
    const container = fixture.nativeElement.querySelector('.floating-toast-container');
    expect(container?.classList.contains('priority-high')).toBe(true);
    expect(container?.classList.contains('priority-urgent')).toBe(false);
  });

  it('debe aplicar estilos de prioridad URGENTE (rojo pastel) cuando corresponda', () => {
    modalServiceMock.currentFloatingToast.set(sampleUrgentToast);
    fixture.detectChanges();

    const container = fixture.nativeElement.querySelector('.floating-toast-container');
    expect(container?.classList.contains('priority-urgent')).toBe(true);
    const priorityEl = fixture.nativeElement.querySelector('.toast-priority-pill');
    expect(priorityEl?.textContent).toContain('Urgente');
  });

  it('debe llamar a dismissFloatingToast al pulsar el botón de cierre "X"', () => {
    const closeBtn = fixture.nativeElement.querySelector('.toast-close-btn');
    closeBtn.click();
    expect(modalServiceMock.dismissFloatingToast).toHaveBeenCalled();
  });

  it('no debe renderizar nada si currentFloatingToast es null', () => {
    modalServiceMock.currentFloatingToast.set(null);
    fixture.detectChanges();

    const container = fixture.nativeElement.querySelector('.floating-toast-container');
    expect(container).toBeNull();
  });
});
