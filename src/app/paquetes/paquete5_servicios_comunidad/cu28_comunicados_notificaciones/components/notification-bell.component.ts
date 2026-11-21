import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NotificationModalService } from '../services/notification-modal.service';
import { IconComponent } from '../../../../shared/ui/icon.component';
import { NotificationItem } from '../announcements.api';

@Component({
  selector: 'taji-notification-bell',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  template: `
    <div class="bell-container" #containerRef>
      <button
        type="button"
        class="bell-btn"
        (click)="toggleDropdown()"
        [attr.aria-expanded]="isOpen()"
        aria-label="Notificaciones"
        title="Centro de notificaciones"
      >
        <taji-icon name="bell" [size]="18" />
        @if (modalService.unreadCount() > 0) {
          <span class="unread-badge">
            {{ modalService.unreadCount() > 99 ? '99+' : modalService.unreadCount() }}
          </span>
        }
      </button>

      @if (isOpen()) {
        <div class="notifications-dropdown" role="menu">
          <div class="dropdown-header">
            <div class="header-title">
              <span class="title-text">Notificaciones</span>
              @if (modalService.unreadCount() > 0) {
                <span class="header-pill">{{ modalService.unreadCount() }} nuevas</span>
              }
            </div>

            @if (modalService.unreadCount() > 0) {
              <button
                type="button"
                class="mark-all-btn"
                (click)="markAllAsRead()"
                title="Marcar todas como leídas"
              >
                Marcar todas
              </button>
            }
          </div>

          <div class="notifications-list">
            @if (modalService.notifications().length === 0) {
              <div class="empty-notifications">
                <taji-icon name="bell" [size]="28" class="empty-icon" />
                <p>No tienes notificaciones registradas</p>
              </div>
            } @else {
              @for (item of modalService.notifications(); track item.id) {
                <div
                  class="notification-item"
                  [class.is-unread]="!item.is_read"
                  (click)="onNotificationClick(item)"
                >
                  <div class="item-status">
                    @if (!item.is_read) {
                      <span class="dot-unread" title="No leída"></span>
                    }
                  </div>

                  <div class="item-content">
                    <div class="item-top">
                      @if (item.priority === 'HIGH' || item.priority === 'URGENT') {
                        <span class="pill-priority-high">
                          {{ item.priority }}
                        </span>
                      }
                      <span class="item-title">{{ item.title }}</span>
                    </div>

                    <p class="item-message">{{ item.message }}</p>

                    <div class="item-meta">
                      <span class="item-time">
                        {{ item.sent_at || item.created_at | date: 'dd/MM/yyyy HH:mm' }}
                      </span>
                      @if (!item.is_read) {
                        <button
                          type="button"
                          class="mark-read-link"
                          (click)="markAsRead($event, item.id)"
                        >
                          Marcar leída
                        </button>
                      }
                    </div>
                  </div>
                </div>
              }
            }
          </div>

          <div class="dropdown-footer">
            <a
              routerLink="/comunicados"
              class="view-all-link"
              (click)="closeDropdown()"
            >
              <span>Ver todos los comunicados</span>
              <taji-icon name="chevron-right" [size]="14" />
            </a>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        vertical-align: middle;
      }

      .bell-container {
        position: relative;
        display: inline-flex;
        align-items: center;
      }

      .bell-btn {
        position: relative;
        width: 38px;
        height: 38px;
        border-radius: 10px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        color: #475569;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.15s ease;

        &:hover {
          background: #f1f5f9;
          color: #1e293b;
          border-color: #cbd5e1;
        }
      }

      .unread-badge {
        position: absolute;
        top: -4px;
        right: -4px;
        background: #ef4444;
        color: #ffffff;
        font-size: 0.65rem;
        font-weight: 800;
        min-width: 18px;
        height: 18px;
        padding: 0 4px;
        border-radius: 9999px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #ffffff;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      }

      .notifications-dropdown {
        position: absolute;
        top: calc(100% + 8px);
        right: 0;
        width: 360px;
        max-width: calc(100vw - 32px);
        background: #ffffff;
        border-radius: 14px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
        border: 1px solid #e2e8f0;
        z-index: 1000;
        overflow: hidden;
        animation: dropDown 0.15s cubic-bezier(0.16, 1, 0.3, 1);
      }

      .dropdown-header {
        padding: 0.85rem 1rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #fafafa;
        border-bottom: 1px solid #f1f5f9;
      }

      .header-title {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .title-text {
        font-weight: 700;
        font-size: 0.95rem;
        color: #0f172a;
      }

      .header-pill {
        background: #e0e7ff;
        color: #4338ca;
        font-size: 0.7rem;
        font-weight: 700;
        padding: 0.15rem 0.5rem;
        border-radius: 9999px;
      }

      .mark-all-btn {
        background: none;
        border: none;
        color: #4f46e5;
        font-size: 0.75rem;
        font-weight: 600;
        cursor: pointer;
        padding: 0.2rem 0.4rem;
        border-radius: 4px;

        &:hover {
          background: #eef2ff;
        }
      }

      .notifications-list {
        max-height: 380px;
        overflow-y: auto;
      }

      .empty-notifications {
        padding: 2.5rem 1rem;
        text-align: center;
        color: #94a3b8;

        .empty-icon {
          margin-bottom: 0.5rem;
          color: #cbd5e1;
        }

        p {
          margin: 0;
          font-size: 0.875rem;
        }
      }

      .notification-item {
        padding: 0.85rem 1rem;
        border-bottom: 1px solid #f1f5f9;
        display: flex;
        gap: 0.75rem;
        cursor: pointer;
        transition: background 0.12s ease;

        &:hover {
          background: #f8fafc;
        }

        &.is-unread {
          background: #f8faff;

          &:hover {
            background: #f0f4ff;
          }
        }
      }

      .item-status {
        width: 8px;
        flex-shrink: 0;
        display: flex;
        align-items: flex-start;
        padding-top: 0.35rem;
      }

      .dot-unread {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #4f46e5;
      }

      .item-content {
        flex: 1;
        min-width: 0;
      }

      .item-top {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        margin-bottom: 0.2rem;
      }

      .pill-priority-high {
        background: #fee2e2;
        color: #dc2626;
        font-size: 0.65rem;
        font-weight: 800;
        padding: 0.1rem 0.35rem;
        border-radius: 4px;
        text-transform: uppercase;
      }

      .item-title {
        font-size: 0.875rem;
        font-weight: 700;
        color: #1e293b;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .item-message {
        margin: 0 0 0.35rem;
        font-size: 0.8rem;
        color: #64748b;
        line-height: 1.4;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .item-meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .item-time {
        font-size: 0.7rem;
        color: #94a3b8;
      }

      .mark-read-link {
        background: none;
        border: none;
        font-size: 0.7rem;
        font-weight: 600;
        color: #4f46e5;
        cursor: pointer;
        padding: 0;

        &:hover {
          text-decoration: underline;
        }
      }

      .dropdown-footer {
        padding: 0.75rem 1rem;
        background: #fafafa;
        border-top: 1px solid #f1f5f9;
        text-align: center;
      }

      .view-all-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.35rem;
        font-size: 0.8rem;
        font-weight: 600;
        color: #4f46e5;
        text-decoration: none;

        &:hover {
          text-decoration: underline;
        }
      }

      @keyframes dropDown {
        from {
          opacity: 0;
          transform: translateY(-6px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationBellComponent {
  readonly modalService = inject(NotificationModalService);
  private readonly elementRef = inject(ElementRef);

  readonly isOpen = signal<boolean>(false);

  toggleDropdown(): void {
    const next = !this.isOpen();
    this.isOpen.set(next);
    if (next) {
      this.modalService.loadAllNotifications();
    }
  }

  closeDropdown(): void {
    this.isOpen.set(false);
  }

  markAsRead(event: Event, id: number | string): void {
    event.stopPropagation();
    this.modalService.markRead(id);
  }

  markAllAsRead(): void {
    this.modalService.markAllRead();
  }

  onNotificationClick(item: NotificationItem): void {
    if (!item.is_read) {
      this.modalService.markRead(item.id);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closeDropdown();
    }
  }

  @HostListener('keydown.escape')
  onEscape(): void {
    this.closeDropdown();
  }
}
