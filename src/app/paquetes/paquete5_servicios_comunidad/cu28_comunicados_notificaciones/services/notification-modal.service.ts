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
  readonly currentFloatingToast = signal<NotificationItem | null>(null);
  readonly isProcessing = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  /** IDs de notificaciones postergadas con 'Ver después' durante la sesión actual para el modal */
  private readonly dismissedThisSession = new Set<string | number>();

  /** IDs de notificaciones cerradas con 'X' en la notificación flotante durante la sesión actual */
  private readonly floatingDismissedThisSession = new Set<string | number>();

  /**
   * Carga el estado actual de notificaciones y comprueba si hay comunicados de alta/urgente prioridad pendientes.
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
    // automáticamente modales ni notificaciones flotantes que interrumpan la consola de gestión
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

        // Buscar avisos pendientes de prioridad alta o urgente que no hayan sido postergados en el modal
        // Se prioriza URGENTE sobre ALTA
        const highPriorityPending = list
          .filter((n) => {
            const isHighOrUrgent = n.priority === 'HIGH' || n.priority === 'URGENT';
            const isDismissed = this.dismissedThisSession.has(n.id);
            return isHighOrUrgent && !isDismissed && !n.is_read;
          })
          .sort((a, b) => {
            if (a.priority === 'URGENT' && b.priority !== 'URGENT') return -1;
            if (b.priority === 'URGENT' && a.priority !== 'URGENT') return 1;
            return 0;
          });

        if (highPriorityPending.length > 0 && !this.currentHighPriority()) {
          // Mostrar primero el modal emergente principal
          this.currentHighPriority.set(highPriorityPending[0]);
          // Mientras el modal esté visible, la flotante permanece oculta
          this.currentFloatingToast.set(null);
        } else if (!this.currentHighPriority() && !this.currentFloatingToast()) {
          // Si no hay modal activo pero hay un aviso que ya fue postergado con 'Ver después'
          // y no ha sido cerrado en la barra flotante en esta sesión, mostrar la flotante
          const floatingCandidates = list
            .filter((n) => {
              const isHighOrUrgent = n.priority === 'HIGH' || n.priority === 'URGENT';
              const isFloatingDismissed = this.floatingDismissedThisSession.has(n.id);
              return isHighOrUrgent && !isFloatingDismissed && !n.is_read;
            })
            .sort((a, b) => {
              if (a.priority === 'URGENT' && b.priority !== 'URGENT') return -1;
              if (b.priority === 'URGENT' && a.priority !== 'URGENT') return 1;
              return 0;
            });

          if (floatingCandidates.length > 0) {
            this.currentFloatingToast.set(floatingCandidates[0]);
          }
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
   * Acción 'Ver después': Cierra el modal sin marcar como leído y activa inmediatamente la notificación flotante.
   */
  dismissForSession(): void {
    const current = this.currentHighPriority();
    if (current) {
      this.dismissedThisSession.add(current.id);
      // Activar notificación flotante si no ha sido descartada para la flotante en esta sesión
      if (!this.floatingDismissedThisSession.has(current.id)) {
        this.currentFloatingToast.set(current);
      }
    }
    this.currentHighPriority.set(null);
    this.errorMessage.set(null);
  }

  /**
   * Cierra la notificación flotante con el botón 'X' sin marcarla como leída en el backend.
   */
  dismissFloatingToast(): void {
    const current = this.currentFloatingToast();
    if (current) {
      this.floatingDismissedThisSession.add(current.id);
    }
    this.currentFloatingToast.set(null);
  }

  /**
   * Acción 'Entendido': Llama a la API para persistir la lectura en Backend, actualiza contador y cierra el modal/flotante.
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
        this.floatingDismissedThisSession.add(current.id);

        // Actualizar estado local
        this.notifications.update((list) =>
          list.map((n) => (n.id === current.id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
        );

        this.currentHighPriority.set(null);
        if (this.currentFloatingToast()?.id === current.id) {
          this.currentFloatingToast.set(null);
        }
      },
      error: () => {
        this.isProcessing.set(false);
        this.errorMessage.set('No se pudo confirmar la lectura. Por favor, reintenta.');
      },
    });
  }

  /**
   * Marca una notificación individual como leída desde la campana o enlace.
   */
  markRead(notificationId: number | string): void {
    this.api.markNotificationAsRead(notificationId).subscribe({
      next: () => {
        this.unreadCount.update((c) => Math.max(0, c - 1));
        this.notifications.update((list) =>
          list.map((n) => (n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
        );
        if (this.currentFloatingToast()?.id === notificationId) {
          this.currentFloatingToast.set(null);
        }
        if (this.currentHighPriority()?.id === notificationId) {
          this.currentHighPriority.set(null);
        }
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
        this.currentFloatingToast.set(null);
        this.currentHighPriority.set(null);
      },
      error: () => {},
    });
  }
}
