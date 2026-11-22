import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationModalService } from '../services/notification-modal.service';
import { IconComponent } from '../../../../shared/ui/icon.component';

@Component({
  selector: 'taji-announcement-floating-toast',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    @if (modalService.currentFloatingToast(); as item) {
      <aside
        class="floating-toast-container"
        role="status"
        aria-live="polite"
        [class.priority-urgent]="item.priority === 'URGENT'"
        [class.priority-high]="item.priority === 'HIGH' || !item.priority"
      >
        <div class="toast-card">
          <div class="toast-icon-wrap" aria-hidden="true">
            <taji-icon
              [name]="item.priority === 'URGENT' ? 'alert-triangle' : 'bell'"
              [size]="18"
            />
          </div>

          <div class="toast-content">
            <div class="toast-header-row">
              <span class="toast-priority-pill">
                {{ item.priority === 'URGENT' ? 'Urgente' : 'Alta' }}
              </span>
              <span class="toast-title" [title]="item.title">{{ item.title }}</span>
            </div>
            <p class="toast-message">{{ item.message }}</p>
          </div>

          <button
            type="button"
            class="toast-close-btn"
            (click)="onClose()"
            aria-label="Cerrar notificación flotante"
            title="Cerrar aviso temporalmente"
          >
            <taji-icon name="x" [size]="15" />
          </button>
        </div>
      </aside>
    }
  `,
  styles: [
    `
      :host {
        display: contents;
      }

      .floating-toast-container {
        position: fixed;
        top: 1.25rem;
        left: 50%;
        transform: translateX(-50%);
        z-index: 1040;
        width: min(92vw, 480px);
        pointer-events: none;
        animation: toastSlideDown 0.28s cubic-bezier(0.16, 1, 0.3, 1);
      }

      .toast-card {
        pointer-events: auto;
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        padding: 0.75rem 1rem;
        border-radius: 12px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 6px 12px -3px rgba(0, 0, 0, 0.04);
        border: 1px solid transparent;
        transition: all 0.2s ease;
      }

      /* Prioridad ALTA: Amarillo pastel suave */
      .priority-high .toast-card {
        background: #fefce8;
        border-color: #fde047;
        color: #854d0e;

        .toast-icon-wrap {
          background: #fef08a;
          color: #b45309;
        }

        .toast-priority-pill {
          background: #fef08a;
          color: #92400e;
        }

        .toast-title {
          color: #713f12;
        }

        .toast-message {
          color: #854d0e;
        }

        .toast-close-btn {
          color: #a16207;

          &:hover {
            background: #fef08a;
            color: #713f12;
          }
        }
      }

      /* Prioridad URGENTE: Rojo pastel suave translúcido */
      .priority-urgent .toast-card {
        background: rgba(254, 242, 242, 0.95);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        border-color: #fca5a5;
        color: #991b1b;

        .toast-icon-wrap {
          background: #fee2e2;
          color: #dc2626;
        }

        .toast-priority-pill {
          background: #fee2e2;
          color: #b91c1c;
        }

        .toast-title {
          color: #7f1d1d;
        }

        .toast-message {
          color: #991b1b;
        }

        .toast-close-btn {
          color: #b91c1c;

          &:hover {
            background: #fee2e2;
            color: #7f1d1d;
          }
        }
      }

      .toast-icon-wrap {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        margin-top: 0.1rem;
      }

      .toast-content {
        flex: 1;
        min-width: 0;
      }

      .toast-header-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.2rem;
      }

      .toast-priority-pill {
        font-size: 0.65rem;
        font-weight: 800;
        padding: 0.1rem 0.4rem;
        border-radius: 4px;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        flex-shrink: 0;
      }

      .toast-title {
        font-size: 0.85rem;
        font-weight: 700;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .toast-message {
        margin: 0;
        font-size: 0.78rem;
        line-height: 1.4;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        opacity: 0.95;
      }

      .toast-close-btn {
        background: transparent;
        border: none;
        cursor: pointer;
        width: 24px;
        height: 24px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        flex-shrink: 0;
        transition: background 0.15s ease, color 0.15s ease;
      }

      @keyframes toastSlideDown {
        from {
          opacity: 0;
          transform: translate(-50%, -14px);
        }
        to {
          opacity: 1;
          transform: translate(-50%, 0);
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnouncementFloatingToastComponent {
  readonly modalService = inject(NotificationModalService);

  onClose(): void {
    this.modalService.dismissFloatingToast();
  }
}
