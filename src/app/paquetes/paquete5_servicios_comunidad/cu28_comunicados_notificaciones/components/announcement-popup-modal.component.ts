import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationModalService } from '../services/notification-modal.service';
import { IconComponent } from '../../../../shared/ui/icon.component';

@Component({
  selector: 'taji-announcement-popup-modal',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    @if (modalService.currentHighPriority(); as item) {
      <div
        class="modal-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-announcement-title"
        aria-describedby="modal-announcement-desc"
      >
        <div class="modal-card" #modalCard tabindex="-1">
          <!-- Encabezado con ícono y badges -->
          <div class="modal-header">
            <div class="bell-icon-badge">
              <taji-icon name="bell" [size]="24" class="bell-svg" />
            </div>
            <div class="header-titles">
              <div class="badge-row">
                <span class="priority-badge">
                  <span class="pulse-dot"></span>
                  Prioridad {{ item.priority || 'Alta' }}
                </span>
                @if (item.audience) {
                  <span class="audience-badge">
                    Audiencia: {{ item.audience }}
                  </span>
                }
              </div>
              <span class="date-text">
                {{ item.sent_at || item.created_at | date: 'dd/MM/yyyy HH:mm' }}
              </span>
            </div>
          </div>

          <!-- Contenido del comunicado -->
          <div class="modal-body">
            <h2 id="modal-announcement-title" class="announcement-title">
              {{ item.title }}
            </h2>
            <div id="modal-announcement-desc" class="announcement-content">
              {{ item.message }}
            </div>

            @if (modalService.errorMessage(); as error) {
              <div class="error-banner" role="alert">
                <taji-icon name="alert-circle" [size]="16" />
                <span>{{ error }}</span>
              </div>
            }
          </div>

          <!-- Acciones -->
          <div class="modal-actions">
            <button
              type="button"
              class="btn-secondary"
              (click)="onDismiss()"
              [disabled]="modalService.isProcessing()"
            >
              Ver después
            </button>

            <button
              type="button"
              class="btn-primary"
              #primaryBtn
              (click)="onUnderstood()"
              [disabled]="modalService.isProcessing()"
            >
              @if (modalService.isProcessing()) {
                <span class="spinner"></span>
                <span>Confirmando...</span>
              } @else {
                <taji-icon name="check" [size]="16" />
                <span>Entendido</span>
              }
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 1050;
        background-color: rgba(15, 23, 42, 0.65);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1.5rem;
        animation: fadeIn 0.2s ease-out;
      }

      .modal-card {
        background: #ffffff;
        border-radius: 16px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        max-width: 540px;
        width: 100%;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        border: 1px solid #e2e8f0;
        animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        outline: none;
      }

      .modal-header {
        padding: 1.5rem 1.5rem 1rem;
        display: flex;
        align-items: center;
        gap: 1rem;
        border-bottom: 1px solid #f1f5f9;
        background: #fafafa;
      }

      .bell-icon-badge {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        background: #eef2ff;
        color: #4f46e5;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        border: 1px solid #e0e7ff;
      }

      .header-titles {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .badge-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      .priority-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        background: #fee2e2;
        color: #b91c1c;
        font-size: 0.75rem;
        font-weight: 700;
        padding: 0.2rem 0.55rem;
        border-radius: 9999px;
        letter-spacing: 0.025em;
        text-transform: uppercase;
      }

      .pulse-dot {
        width: 6px;
        height: 6px;
        background: #ef4444;
        border-radius: 50%;
        display: inline-block;
      }

      .audience-badge {
        background: #f1f5f9;
        color: #475569;
        font-size: 0.75rem;
        font-weight: 600;
        padding: 0.2rem 0.55rem;
        border-radius: 9999px;
      }

      .date-text {
        font-size: 0.75rem;
        color: #94a3b8;
      }

      .modal-body {
        padding: 1.5rem;
      }

      .announcement-title {
        margin: 0 0 0.75rem;
        font-size: 1.25rem;
        font-weight: 700;
        color: #0f172a;
        line-height: 1.35;
      }

      .announcement-content {
        color: #334155;
        font-size: 0.95rem;
        line-height: 1.6;
        white-space: pre-line;
      }

      .error-banner {
        margin-top: 1rem;
        padding: 0.75rem 1rem;
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 8px;
        color: #b91c1c;
        font-size: 0.85rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .modal-actions {
        padding: 1rem 1.5rem 1.5rem;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 0.75rem;
        background: #ffffff;
      }

      .btn-secondary {
        padding: 0.65rem 1.2rem;
        border-radius: 8px;
        font-size: 0.875rem;
        font-weight: 600;
        background: transparent;
        border: 1px solid #cbd5e1;
        color: #475569;
        cursor: pointer;
        transition: all 0.15s ease;

        &:hover:not(:disabled) {
          background: #f8fafc;
          border-color: #94a3b8;
          color: #1e293b;
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }

      .btn-primary {
        padding: 0.65rem 1.4rem;
        border-radius: 8px;
        font-size: 0.875rem;
        font-weight: 600;
        background: #4f46e5;
        border: 1px solid transparent;
        color: #ffffff;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        transition: all 0.15s ease;

        &:hover:not(:disabled) {
          background: #4338ca;
        }

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      }

      .spinner {
        width: 14px;
        height: 14px;
        border: 2px solid rgba(255, 255, 255, 0.4);
        border-top-color: #ffffff;
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(16px) scale(0.98);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnouncementPopupModalComponent {
  readonly modalService = inject(NotificationModalService);

  @ViewChild('primaryBtn') primaryBtn?: ElementRef<HTMLButtonElement>;

  @HostListener('keydown.escape')
  onEscape(): void {
    if (!this.modalService.isProcessing() && this.modalService.currentHighPriority()) {
      this.onDismiss();
    }
  }

  onDismiss(): void {
    this.modalService.dismissForSession();
  }

  onUnderstood(): void {
    this.modalService.markAsUnderstood();
  }
}
