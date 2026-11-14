import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { IncidentsApi, IncidentDetail } from '../cu21_ciclo_atencion/incidents.api';
import { IncidentAIComponent } from './incident-ai.component';
import { IncidentAIApi, AIMetrics } from './incident-ai.api';
import { IconComponent } from '../../../shared/ui/icon.component';
import { AuthService } from '../../../core/auth/auth.service';
import { IncidentEvidenceComponent } from '../shared/incident-evidence.component';

@Component({
  selector: 'taji-incident-analysis',
  imports: [FormsModule, RouterLink, IncidentAIComponent, IconComponent, IncidentEvidenceComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './incident-analysis.page.scss',
  template: `
    <header class="page-heading">
      <div>
        <span class="eyebrow">Asistencia NVIDIA · decisión humana</span>
        <h1>Clasificación con IA</h1>
        <p>
          Revisa lo que detectó el modelo y confirma el criterio con el que se atenderá la
          incidencia.
        </p>
      </div>
      <a routerLink="/incidencias">Ir al seguimiento <span aria-hidden="true">↗</span></a>
    </header>
    @if (metrics(); as m) {
      <section class="metrics" aria-label="Actividad IA de los últimos 30 días">
        <div>
          <span>Análisis solicitados</span><strong>{{ m.total }}</strong>
        </div>
        <div>
          <span>Pendientes de revisión</span><strong>{{ m.pending_review }}</strong>
        </div>
        <div>
          <span>En proceso</span><strong>{{ m.processing }}</strong>
        </div>
        <div>
          <span>Análisis no completados</span><strong>{{ m.failed }}</strong>
        </div>
        <small>Últimos {{ m.period_days }} días · condominio activo</small>
      </section>
    }
    @if (error()) {
      <p class="error" role="alert">
        {{ error() }}<button (click)="load()">Reintentar consulta</button>
      </p>
    }
    @if (notice()) {
      <p class="notice" role="status">{{ notice() }}</p>
    }
    <div class="analysis-workspace">
      <section class="report-picker" aria-label="Reportes para analizar">
        <div class="picker-heading">
          <h2>Elige un reporte</h2>
          <button aria-label="Actualizar reportes" [disabled]="loading()" (click)="load()">
            <taji-icon name="refresh-cw" [size]="17" />
          </button>
        </div>
        <label for="ai-report-filter">Estado de atención</label
        ><select id="ai-report-filter" [(ngModel)]="filter" (ngModelChange)="page = 1; load()">
          <option value="">Todos los estados</option>
          <option value="pending">Pendientes de atención</option>
          <option value="overdue">Fecha objetivo vencida</option>
          <option value="resolved">Resueltos</option>
        </select>
        @if (loading()) {
          <p role="status" class="muted">Cargando reportes…</p>
        }
        @for (item of items(); track item.public_code) {
          <button
            class="report-choice"
            [class.selected]="selected()?.public_code === item.public_code"
            (click)="open(item.public_code)"
          >
            <span>{{ item.public_code }}</span
            ><strong>{{ item.title || 'Incidencia reportada' }}</strong
            ><small
              >{{ item.category?.name || 'Sin categoría' }} ·
              {{ item.priority?.name || 'Sin prioridad' }}</small
            >
          </button>
        } @empty {
          @if (!loading()) {
            <div class="empty-picker">
              <taji-icon name="inbox" [size]="26" />
              <p>No hay reportes en esta consulta.</p>
              <a routerLink="/reportar-incidencia">Reportar una incidencia</a>
            </div>
          }
        }
        <nav aria-label="Páginas de reportes">
          <button [disabled]="page <= 1 || loading()" (click)="page = page - 1; load()">
            Anterior</button
          ><span>{{ page }} / {{ pages() }}</span
          ><button [disabled]="page >= pages() || loading()" (click)="page = page + 1; load()">
            Siguiente
          </button>
        </nav>
      </section>
      <section class="analysis-detail" aria-label="Revisión del análisis">
        @if (opening()) {
          <p role="status">Abriendo reporte…</p>
        } @else if (selected(); as report) {
          <div class="source-report">
            <div class="source-heading">
              <span class="eyebrow">Reporte original · {{ report.public_code }}</span
              ><a routerLink="/incidencias" [queryParams]="{ codigo: report.public_code }"
                >Ver atención y avances ↗</a
              >
            </div>
            <h2>{{ report.title || 'Incidencia reportada' }}</h2>
            <p>{{ report.description }}</p>
            <taji-incident-evidence [attachments]="report.attachments || []" />
          </div>
          <taji-incident-ai [code]="report.public_code" (reviewed)="reviewed()" />
        } @else {
          <div class="analysis-empty">
            <span class="empty-symbol"><taji-icon name="sparkles" [size]="32" /></span>
            <h2>Del reporte a una decisión informada</h2>
            <p>
              Selecciona una incidencia para revisar su categoría, prioridad, peligros y
              recomendaciones.
            </p>
            <div class="principles">
              <div>
                <taji-icon name="search" [size]="19" /><strong>Comprende el contexto</strong
                ><span>Entidades, negaciones y señales de riesgo.</span>
              </div>
              <div>
                <taji-icon name="shield-check" [size]="19" /><strong
                  >Verifica antes de aplicar</strong
                ><span>La propuesta no reemplaza el criterio del equipo.</span>
              </div>
              <div>
                <taji-icon name="git-branch" [size]="19" /><strong>Conserva la trazabilidad</strong
                ><span>La predicción original y la revisión quedan guardadas.</span>
              </div>
            </div>
          </div>
        }
      </section>
    </div>
  `,
})
export class IncidentAnalysisPage {
  private readonly api = inject(IncidentsApi);
  private readonly ai = inject(IncidentAIApi);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  readonly items = signal<IncidentDetail[]>([]);
  readonly selected = signal<IncidentDetail | null>(null);
  readonly loading = signal(false);
  readonly opening = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly pages = signal(1);
  readonly metrics = signal<AIMetrics | null>(null);
  filter = '';
  page = 1;
  private selection = 0;
  constructor() {
    void this.load();
    void this.loadMetrics();
    const code = this.route.snapshot.queryParamMap.get('codigo');
    if (code) void this.open(code);
  }
  async loadMetrics() {
    const user = this.auth.user();
    if (
      !user?.is_superuser &&
      !user?.role?.permissions.some((p) => ['manage_incidents', 'review_incident_ai'].includes(p))
    )
      return;
    try {
      this.metrics.set(await firstValueFrom(this.ai.metrics()));
    } catch {
      this.metrics.set(null);
    }
  }
  async load() {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    try {
      const data = await firstValueFrom(this.api.list(this.filter, this.page));
      this.items.set(data.results);
      this.pages.set(Math.max(1, data.pagination.total_pages));
    } catch {
      this.error.set('No pudimos cargar los reportes. Revisa tu conexión.');
    } finally {
      this.loading.set(false);
    }
  }
  async open(code: string) {
    const selection = ++this.selection;
    this.opening.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      const item = await firstValueFrom(this.api.detail(code));
      if (selection === this.selection) this.selected.set(item);
    } catch {
      if (selection === this.selection) {
        this.selected.set(null);
        this.error.set('No se pudo abrir la incidencia o no tienes acceso.');
      }
    } finally {
      if (selection === this.selection) this.opening.set(false);
    }
  }
  reviewed() {
    this.notice.set(
      'Clasificación revisada y aplicada. El seguimiento ya muestra el nuevo criterio.',
    );
    void this.loadMetrics();
    void this.load();
  }
}
