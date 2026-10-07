import { Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { VisitConsultationApi, VisitRow, VisitSection } from './visits.api';

@Component({
  selector: 'taji-visit-consultation',
  imports: [DatePipe, FormsModule],
  templateUrl: './visits.page.html',
  styleUrls: ['./visits.page.scss'],
})
export class VisitConsultationPage {
  private readonly api = inject(VisitConsultationApi);
  private readonly destroyRef = inject(DestroyRef);
  readonly tabs: { key: VisitSection; label: string }[] = [
    { key: 'expected', label: 'Esperadas' }, { key: 'inside', label: 'Dentro actualmente' }, { key: 'history', label: 'Historial' },
  ];
  section: VisitSection = 'expected';
  search = '';
  readonly rows = signal<VisitRow[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly selected = signal<VisitRow | null>(null);
  page = 1;
  pages = 1;
  private request = 0;
  constructor() { this.load(); }
  select(section: VisitSection) { this.section = section; this.selected.set(null); this.rows.set([]); this.load(1); }
  load(page = this.page) {
    const request = ++this.request;
    this.loading.set(true); this.error.set('');
    this.api.list(this.section, page, this.search.trim()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => {
        if (request !== this.request) return;
        this.rows.set(response.results); this.page = response.pagination.page;
        this.pages = response.pagination.total_pages; this.loading.set(false);
      },
      error: () => {
        if (request !== this.request) return;
        this.rows.set([]); this.error.set('No se pudieron consultar las visitas. Revisa tu conexión y permisos.'); this.loading.set(false);
      },
    });
  }
}
