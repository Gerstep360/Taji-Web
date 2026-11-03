import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AssetHistory } from '../models/asset-qr.models';

type HistoryTab = 'incidents' | 'workorders' | 'plans';

@Component({
  selector: 'taji-asset-history',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (history) {
      <div class="history-container">
        <div class="history-header">
          <h2>Historial del activo</h2>
          <button type="button" (click)="back.emit()" class="btn-back">← Volver</button>
        </div>

        <!-- Tabs -->
        <nav class="history-tabs" aria-label="Secciones del historial">
          <button
            type="button"
            [class.active]="activeTab() === 'incidents'"
            (click)="activeTab.set('incidents')"
            class="tab-button"
          >
            Incidencias
            <span class="count">{{ history.incidents.length }}</span>
          </button>
          <button
            type="button"
            [class.active]="activeTab() === 'workorders'"
            (click)="activeTab.set('workorders')"
            class="tab-button"
          >
            Órdenes de trabajo
            <span class="count">{{ history.work_orders.length }}</span>
          </button>
          <button
            type="button"
            [class.active]="activeTab() === 'plans'"
            (click)="activeTab.set('plans')"
            class="tab-button"
          >
            Planes de mantenimiento
            <span class="count">{{ history.maintenance_plans.length }}</span>
          </button>
        </nav>

        <!-- Content -->
        <div class="history-content">
          @if (activeTab() === 'incidents') {
            @if (history.incidents.length === 0) {
              <div class="empty-state">
                <p>No hay incidencias registradas para este activo.</p>
              </div>
            } @else {
              <div class="items-list">
                @for (incident of history.incidents; track incident.id) {
                  <div class="item-card">
                    <div class="item-header">
                      <strong>{{ incident.title }}</strong>
                      <span class="item-code">{{ incident.public_code }}</span>
                    </div>
                    <div class="item-meta">
                      <span class="status" [class]="'status-' + incident.status.toLowerCase()">
                        {{ incident.status }}
                      </span>
                      <span class="date">{{ formatDate(incident.created_at) }}</span>
                    </div>
                  </div>
                }
              </div>
            }
          }

          @if (activeTab() === 'workorders') {
            @if (history.work_orders.length === 0) {
              <div class="empty-state">
                <p>No hay órdenes de trabajo registradas para este activo.</p>
              </div>
            } @else {
              <div class="items-list">
                @for (order of history.work_orders; track order.id) {
                  <div class="item-card">
                    <div class="item-header">
                      <strong>{{ order.title }}</strong>
                      <span class="item-code">{{ order.public_code }}</span>
                    </div>
                    <div class="item-details">
                      <span class="work-type">{{ order.work_type }}</span>
                      <span class="status" [class]="'status-' + order.status.toLowerCase()">
                        {{ order.status }}
                      </span>
                    </div>
                    @if (order.scheduled_for) {
                      <div class="item-meta">
                        <span>Programado: {{ formatDate(order.scheduled_for) }}</span>
                      </div>
                    }
                    @if (order.completed_at) {
                      <div class="item-meta">
                        <span>Completado: {{ formatDate(order.completed_at) }}</span>
                      </div>
                    }
                  </div>
                }
              </div>
            }
          }

          @if (activeTab() === 'plans') {
            @if (history.maintenance_plans.length === 0) {
              <div class="empty-state">
                <p>No hay planes de mantenimiento asociados a este activo.</p>
              </div>
            } @else {
              <div class="items-list">
                @for (plan of history.maintenance_plans; track plan.id) {
                  <div class="item-card">
                    <div class="item-header">
                      <strong>{{ plan.name }}</strong>
                      <span class="active-badge" [class.inactive]="!plan.is_active">
                        {{ plan.is_active ? 'Activo' : 'Inactivo' }}
                      </span>
                    </div>
                    <div class="item-details">
                      <span>Cada {{ plan.frequency_days }} días</span>
                    </div>
                    @if (plan.last_completed_at) {
                      <div class="item-meta">
                        <span>Última ejecución: {{ formatDate(plan.last_completed_at) }}</span>
                      </div>
                    }
                    <div class="item-meta">
                      <span>Próxima ejecución: {{ formatDate(plan.next_due_at) }}</span>
                    </div>
                  </div>
                }
              </div>
            }
          }
        </div>
      </div>
    }
  `,
  styles: `
    .history-container {
      padding: 1rem 0;
      overflow-wrap: anywhere;
      max-width: 700px;
      margin: 0 auto;
    }

    .history-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }

    h2 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 700;
      color: #1f2937;
    }

    .btn-back {
      background: none;
      border: none;
      color: #3b82f6;
      font-weight: 500;
      cursor: pointer;
      padding: 0.5rem;
    }

    .btn-back:hover {
      text-decoration: underline;
    }

    .history-tabs {
      flex-wrap: wrap;
      display: flex;
      gap: 0;
      border-bottom: 2px solid #e5e7eb;
      margin-bottom: 2rem;
    }

    .tab-button {
      background: none;
      border: none;
      padding: 1rem 1.5rem;
      font-weight: 500;
      color: #6b7280;
      cursor: pointer;
      position: relative;
      transition: color 0.2s;
    }

    .tab-button:hover {
      color: #374151;
    }

    .tab-button.active {
      color: #3b82f6;
    }

    .tab-button.active::after {
      content: '';
      position: absolute;
      bottom: -2px;
      left: 0;
      right: 0;
      height: 2px;
      background-color: #3b82f6;
    }

    .count {
      display: inline-block;
      margin-left: 0.5rem;
      background-color: #f3f4f6;
      padding: 0.125rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .history-content {
      min-height: 200px;
    }

    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
      color: #6b7280;
    }

    .empty-state p {
      margin: 0;
      font-size: 0.95rem;
    }

    .items-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .item-card {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 0.75rem;
      padding: 1.25rem;
    }

    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.75rem;
      gap: 1rem;
    }

    .item-header strong {
      color: #1f2937;
      font-size: 0.95rem;
      line-height: 1.4;
    }

    .item-code {
      display: inline-block;
      font-family: 'Courier New', monospace;
      font-size: 0.75rem;
      background-color: #f3f4f6;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      color: #6b7280;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .active-badge {
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 600;
      background-color: #dcfce7;
      color: #166534;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      flex-shrink: 0;
    }

    .active-badge.inactive {
      background-color: #f3f4f6;
      color: #6b7280;
    }

    .item-details {
      display: flex;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
      flex-wrap: wrap;
    }

    .work-type {
      display: inline-block;
      font-size: 0.75rem;
      background-color: #eff6ff;
      color: #1e40af;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
    }

    .status {
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      background-color: #f3f4f6;
      color: #6b7280;
    }

    .status-pending {
      background-color: #fef3c7;
      color: #92400e;
    }

    .status-in_progress {
      background-color: #dbeafe;
      color: #1e40af;
    }

    .status-completed {
      background-color: #dcfce7;
      color: #166534;
    }

    .status-cancelled {
      background-color: #fee2e2;
      color: #991b1b;
    }

    .status-open {
      background-color: #fecaca;
      color: #7c2d12;
    }

    .item-meta {
      font-size: 0.875rem;
      color: #6b7280;
    }

    .item-meta span {
      display: block;
    }
  `,
})
export class AssetHistoryComponent {
  @Input() history: AssetHistory | null = null;
  @Output() back = new EventEmitter<void>();

  activeTab = signal<HistoryTab>('incidents');

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  }
}
