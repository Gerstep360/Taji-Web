import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from '../../../../core/auth/auth.service';
import {
  AnnouncementsApi,
  NotificationItem,
} from '../announcements.api';

@Injectable({ providedIn: 'root' })
export class NotificationModalService {
  private readonly api = inject(AnnouncementsApi);
  private readonly auth = inject(AuthService);

  readonly unreadCount = signal<number>(0);
  readonly notifications = signal<NotificationItem[]>([]);
  readonly currentHighPriority = signal<NotificationItem | null>(null);
  readonly isProcessing = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  /** IDs de notificaciones postergadas con 'Ver después' durante la sesión actual */
  private readonly dismissedThisSession = new Set<string | number>();

  /**
   * Carga el estado actual de notificaciones y comprueba si hay comunicados de alta prioridad pendientes.
   */
  checkPendingHighPriority(): void {
    const user = this.auth.user();
    if (!user) return;

    // Siempre actualizamos el recuento de la campana
    this.api.getUnreadCount().subscribe({
      next: (res) => this.unreadCount.set(res?.unread_count ?? 0),
      error: () => {},
    });

    // Regla 2.1 y 3.2: Administradores emisores con permiso manage_announcements no reciben
    // automáticamente modales emergentes que interrumpan la consola de gestión
    const permissions = user.role?.permissions ?? [];
    const isManager =
      user.is_superuser ||
      permissions.includes('manage_announcements') ||
      ['admin', 'administrador'].includes(user.role?.slug ?? '');

    if (isManager) {
      return;
    }

    this.api.getNotifications(true).subscribe({
      next: (response) => {
        const list = Array.isArray(response)
          ? response
          : (response as { results: NotificationItem[] })?.results ?? [];

        this.notifications.set(list);

        // Buscar avisos pendientes de prioridad alta o urgente que no hayan sido postergados en esta sesión
        const highPriorityPending = list.filter((n) => {
          const isHigh = n.priority === 'HIGH' || n.priority === 'URGENT';
          const isDismissed = this.dismissedThisSession.has(n.id);
          return isHigh && !isDismissed && !n.is_read;
        });

        if (highPriorityPending.length > 0 && !this.currentHighPriority()) {
          // Mostrar el primer comunicado de alta prioridad
          this.currentHighPriority.set(highPriorityPending[0]);
        }
      },
      error: () => {},
    });
  }

  /**
   * Carga todas las notificaciones (leídas y no leídas) para la campana.
   */
  loadAllNotifications(): void {
    this.api.getUnreadCount().subscribe({
      next: (res) => this.unreadCount.set(res?.unread_count ?? 0),
      error: () => {},
    });

    this.api.getNotifications(false).subscribe({
      next: (response) => {
        const list = Array.isArray(response)
          ? response
          : (response as { results: NotificationItem[] })?.results ?? [];
        this.notifications.set(list);
      },
      error: () => {},
    });
  }

  /**
   * Acción 'Ver después': Cierra el modal sin marcar como leído y evita que vuelva a salir en la sesión.
   */
  dismissForSession(): void {
    const current = this.currentHighPriority();
    if (current) {
      this.dismissedThisSession.add(current.id);
    }
    this.currentHighPriority.set(null);
    this.errorMessage.set(null);
  }

  /**
   * Acción 'Entendido': Llama a la API para persistir la lectura en Backend, actualiza contador y cierra el modal.
   */
  markAsUnderstood(): void {
    const current = this.currentHighPriority();
    if (!current) return;

    this.isProcessing.set(true);
    this.errorMessage.set(null);

    this.api.markNotificationAsRead(current.id).subscribe({
      next: () => {
        this.isProcessing.set(false);
        this.unreadCount.update((c) => Math.max(0, c - 1));
        this.dismissedThisSession.add(current.id);

        // Actualizar estado local
        this.notifications.update((list) =>
          list.map((n) => (n.id === current.id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
        );

        this.currentHighPriority.set(null);
        // Revisar si existe otro comunicado prioritario pendiente
        this.checkNextPending();
      },
      error: () => {
        this.isProcessing.set(false);
        this.errorMessage.set('No se pudo confirmar la lectura. Por favor, reintenta.');
      },
    });
  }

  /**
   * Marca una notificación individual como leída desde la campana.
   */
  markRead(notificationId: number | string): void {
    this.api.markNotificationAsRead(notificationId).subscribe({
      next: () => {
        this.unreadCount.update((c) => Math.max(0, c - 1));
        this.notifications.update((list) =>
          list.map((n) => (n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
        );
      },
      error: () => {},
    });
  }

  /**
   * Marca todas las notificaciones como leídas.
   */
  markAllRead(): void {
    this.api.markAllNotificationsAsRead().subscribe({
      next: () => {
        this.unreadCount.set(0);
        this.notifications.update((list) =>
          list.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
        );
      },
      error: () => {},
    });
  }

  private checkNextPending(): void {
    const user = this.auth.user();
    if (!user) return;

    const remaining = this.notifications().filter((n) => {
      const isHigh = n.priority === 'HIGH' || n.priority === 'URGENT';
      const isDismissed = this.dismissedThisSession.has(n.id);
      return isHigh && !isDismissed && !n.is_read;
    });

    if (remaining.length > 0) {
      this.currentHighPriority.set(remaining[0]);
    }
  }
}
