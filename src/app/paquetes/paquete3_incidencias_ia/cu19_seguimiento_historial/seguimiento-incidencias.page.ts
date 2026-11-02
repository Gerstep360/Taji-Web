import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { IconComponent } from '../../../shared/ui/icon.component';
import { SeguimientoIncidenciasApi } from './seguimiento-incidencias.api';
import { IncidentListItem } from './seguimiento-incidencias.models';
import { IncidentReportOptions } from '../cu18_registrar_incidencia/registrar-incidencia.models';
import { IncidentDetailComponent } from './incident-detail.component';

@Component({
  selector: 'taji-seguimiento-incidencias-page',
  imports: [ReactiveFormsModule, DatePipe, IconComponent, IncidentDetailComponent],
  templateUrl: './seguimiento-incidencias.page.html',
  styleUrl: './seguimiento-incidencias.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeguimientoIncidenciasPage implements OnInit {
  private readonly api = inject(SeguimientoIncidenciasApi);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal<boolean>(false);
  readonly loadError = signal<string>('');
  readonly successMessage = signal<string>('');

  readonly incidents = signal<IncidentListItem[]>([]);
  readonly options = signal<IncidentReportOptions | null>(null);

  // Selected incident for detail view (T092)
  readonly selectedIncidentId = signal<number | null>(null);

  readonly filters = this.fb.nonNullable.group({
    search: [''],
    status: [''],
    category: [0],
    priority: [0],
    sector: [0],
  });

  readonly hasFilters = computed(() => {
    const f = this.filters.value;
    return !!f.search?.trim() || !!f.status || Number(f.category) > 0 || Number(f.priority) > 0 || Number(f.sector) > 0;
  });

  ngOnInit(): void {
    this.loadOptions();
    this.loadIncidents();
  }

  loadOptions(): void {
    this.api.options().subscribe({
      next: (res) => this.options.set(res),
      error: () => this.options.set(null),
    });
  }

  loadIncidents(): void {
    this.loading.set(true);
    this.loadError.set('');

    const raw = this.filters.value;
    const params: any = {};
    if (raw.search?.trim()) params.search = raw.search.trim();
    if (raw.status) params.status = raw.status;
    if (Number(raw.category) > 0) params.category = Number(raw.category);
    if (Number(raw.priority) > 0) params.priority = Number(raw.priority);
    if (Number(raw.sector) > 0) params.sector = Number(raw.sector);

    this.api.list(params).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (Array.isArray(res)) {
          this.incidents.set(res);
        } else if (res && Array.isArray(res.results)) {
          this.incidents.set(res.results);
        } else {
          this.incidents.set([]);
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.loadError.set(err?.error?.detail || 'Error al cargar el tablero de incidencias.');
      },
    });
  }

  onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.loadIncidents();
    }
  }

  clearFilters(): void {
    this.filters.setValue({
      search: '',
      status: '',
      category: 0,
      priority: 0,
      sector: 0,
    });
    this.loadIncidents();
  }

  openDetail(id: number): void {
    this.selectedIncidentId.set(id);
  }

  closeDetail(): void {
    this.selectedIncidentId.set(null);
  }

  onIncidentUpdated(): void {
    this.loadIncidents();
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'REPORTED': return 'Reportada';
      case 'REVIEWED': return 'Revisada';
      case 'ASSIGNED': return 'Asignada';
      case 'IN_PROGRESS': return 'En Proceso';
      case 'RESOLVED': return 'Resuelta';
      case 'CLOSED': return 'Cerrada';
      case 'CANCELLED': return 'Cancelada';
      default: return status;
    }
  }

  statusBadgeClass(status: string): string {
    switch (status) {
      case 'REPORTED': return 'badge-reported';
      case 'REVIEWED': return 'badge-reviewed';
      case 'ASSIGNED': return 'badge-assigned';
      case 'IN_PROGRESS': return 'badge-progress';
      case 'RESOLVED': return 'badge-resolved';
      case 'CLOSED': return 'badge-closed';
      case 'CANCELLED': return 'badge-cancelled';
      default: return '';
    }
  }
}
