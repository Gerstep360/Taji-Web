import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IncidentEvidenceComponent } from '../shared/incident-evidence.component';
import { IncidentsApi, IncidentDetail, AttentionAlert } from './incidents.api';

@Component({
  selector: 'taji-incidents-page',
  imports: [FormsModule, DatePipe, RouterLink, IncidentEvidenceComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './incidents.page.scss',
  template: `
    <header>
      <span class="eyebrow">Atención del condominio</span>
      <h1>Seguimiento de incidencias</h1>
      <p>Consulta lo ocurrido, coordina al equipo y acompaña cada solución.</p>
    </header>
    @if (error()) {
      <p class="error" role="alert">{{ error() }} <button (click)="load()">Reintentar</button></p>
    }
    @if (notice()) {
      <p role="status">{{ notice() }}</p>
    }
    @if (alerts().length) {
      <details class="alerts">
        <summary>{{ alerts().length }} alertas de atención</summary>
        @for (a of alerts(); track a.kind + a.code) {
          <p>
            {{ a.kind.startsWith('INCIDENT') ? 'Incidencia atrasada' : 'Mantenimiento' }} ·
            {{ a.title }} · {{ a.due_at | date: 'dd/MM/yyyy HH:mm' }}
          </p>
        }
      </details>
    }
    <div class="workspace">
      <section class="directory" aria-label="Incidencias">
        <label
          >Mostrar<select [(ngModel)]="filter" [disabled]="loading()" (change)="page = 1; load()">
            <option value="">Todas</option>
            <option value="pending">Pendientes</option>
            <option value="overdue">Vencidas</option>
            <option value="resolved">Resueltas</option>
          </select></label
        >
        @if (loading()) {
          <p role="status">Cargando incidencias…</p>
        }
        @for (item of items(); track item.public_code) {
          <button
            class="incident"
            [class.selected]="detail()?.public_code === item.public_code"
            (click)="open(item.public_code)"
          >
            <span class="code">{{ item.public_code }}</span
            ><strong>{{ item.title || 'Incidencia reportada' }}</strong>
            <span>{{ item.status_display }} · {{ item.priority?.name || 'Sin prioridad' }}</span>
            @if (item.is_overdue) {
              <span class="overdue">Fecha objetivo vencida</span>
            }
          </button>
        } @empty {
          @if (!loading()) {
            <p>No hay incidencias en esta consulta.</p>
          }
        }
        <nav aria-label="Paginación">
          <button [disabled]="page <= 1 || loading()" (click)="page = page - 1; load()">
            Anterior</button
          ><span>{{ page }} / {{ pages() }}</span
          ><button [disabled]="page >= pages() || loading()" (click)="page = page + 1; load()">
            Siguiente
          </button>
        </nav>
      </section>
      <section class="detail" aria-label="Detalle de incidencia" [attr.aria-busy]="busy()">
        @if (detail(); as d) {
          <div class="detail-heading">
            <div>
              <span class="code">{{ d.public_code }}</span>
              <h2>{{ d.title || 'Incidencia reportada' }}</h2>
            </div>
            <span class="badge">{{ d.status_display }}</span>
          </div>
          <p class="description">{{ d.description }}</p>
          <dl>
            <div>
              <dt>Responsable actual</dt>
              <dd>{{ d.current_assignee?.full_name || 'Por asignar' }}</dd>
            </div>
            <div>
              <dt>Fecha objetivo</dt>
              <dd [class.overdue]="d.is_overdue">
                {{ d.due_at ? (d.due_at | date: 'dd/MM/yyyy HH:mm') : 'Por definir' }}
              </dd>
            </div>
          </dl>
          <p>
            <a routerLink="/analisis-incidencias" [queryParams]="{ codigo: d.public_code }"
              >Consultar análisis y clasificación con IA →</a
            >
          </p>
          @if (transitions().length) {
            <form
              (ngSubmit)="mutate('change-status', { status: nextStatus, comment: statusComment })"
            >
              <h3>Actualizar atención</h3>
              <label
                >Nuevo estado<select name="status" [(ngModel)]="nextStatus" required>
                  <option value="" disabled>Selecciona un estado</option>
                  @for (t of transitions(); track t.value) {
                    <option [value]="t.value">{{ t.label }}</option>
                  }
                </select></label
              >
              <label
                >Motivo o solución (visible al reportante)<textarea
                  name="reason"
                  [(ngModel)]="statusComment"
                  maxlength="300"
                  rows="2"
                ></textarea></label
              ><button class="primary" [disabled]="busy() || !nextStatus">Guardar estado</button>
            </form>
          }
          @if (d.can_modify_target_date) {
            <details>
              <summary>Asignación y fecha objetivo</summary>
              <form (ngSubmit)="mutate('assign', { staff_id: +staffId, reason: assignmentReason })">
                <label
                  >Persona responsable<select name="staff" [(ngModel)]="staffId" required>
                    <option value="">Selecciona una persona</option>
                    @for (s of staff(); track s.id) {
                      <option [value]="s.id">{{ s.name }}</option>
                    }
                  </select></label
                ><label
                  >Motivo<input
                    name="assignmentReason"
                    [(ngModel)]="assignmentReason"
                    maxlength="240" /></label
                ><button [disabled]="busy() || !staffId">Asignar responsable</button>
              </form>
              <form (ngSubmit)="setDate()">
                <label
                  >Atender hasta<input
                    name="due"
                    type="datetime-local"
                    [(ngModel)]="due"
                    required /></label
                ><button [disabled]="busy() || !due">Guardar fecha</button>
              </form>
            </details>
          }
          <h3>Línea de tiempo</h3>
          <ol class="timeline">
            @for (h of d.status_history; track h.id) {
              <li>
                <strong>{{ h.to_status_display }}</strong
                ><time>{{ h.changed_at | date: 'dd/MM/yyyy HH:mm' }}</time>
                <p>{{ h.comment }}</p>
                <small>{{ h.changed_by?.full_name || 'Sistema' }}</small>
              </li>
            } @empty {
              <li>Sin cambios registrados.</li>
            }
          </ol>
          <taji-incident-evidence [attachments]="d.attachments || []" />
          <h3>Asignaciones</h3>
          @for (a of d.assignments; track a.id) {
            <p>
              {{ a.assigned_to.full_name }} · {{ a.assigned_at | date: 'dd/MM/yyyy HH:mm' }} ·
              {{ a.ended_at ? 'Finalizada' : 'Actual' }}<br /><small>{{ a.reason }}</small>
            </p>
          } @empty {
            <p class="muted">Sin asignaciones.</p>
          }
          <h3>Conversación</h3>
          @for (c of d.public_comments.concat(d.internal_comments); track c.id) {
            <article class="comment">
              <strong>{{ c.author?.full_name || 'Usuario' }}</strong
              ><small
                >{{ c.visibility === 'INTERNAL' ? ' · Solo equipo' : ' · Público' }} ·
                {{ c.created_at | date: 'dd/MM/yyyy HH:mm' }}</small
              >
              <p>{{ c.body }}</p>
            </article>
          }
          <form (ngSubmit)="postComment()">
            <label
              >Agregar comentario<textarea
                name="comment"
                [(ngModel)]="comment"
                required
                rows="3"
                maxlength="10000"
              ></textarea>
            </label>
            @if (d.can_post_internal_comments) {
              <label
                >Visibilidad<select name="visibility" [(ngModel)]="visibility">
                  <option value="PUBLIC">Público · visible al residente</option>
                  <option value="INTERNAL">Interno · solo equipo autorizado</option>
                </select></label
              >
            }
            <button class="primary" [disabled]="busy() || !comment.trim()">
              Enviar comentario
            </button>
          </form>
        } @else {
          <div class="empty">
            <h2>Cada incidencia, con su historia</h2>
            <p>Selecciona una incidencia para consultar su seguimiento.</p>
          </div>
        }
      </section>
    </div>
  `,
})
export class IncidentsPage {
  private readonly api = inject(IncidentsApi);
  private readonly route = inject(ActivatedRoute);
  readonly items = signal<IncidentDetail[]>([]);
  readonly detail = signal<IncidentDetail | null>(null);
  readonly transitions = signal<{ value: string; label: string }[]>([]);
  readonly staff = signal<{ id: number; name: string }[]>([]);
  readonly alerts = signal<AttentionAlert[]>([]);
  readonly error = signal('');
  readonly notice = signal('');
  readonly busy = signal(false);
  readonly loading = signal(false);
  readonly pages = signal(1);
  filter = '';
  page = 1;
  nextStatus = '';
  statusComment = '';
  staffId = '';
  assignmentReason = '';
  due = '';
  comment = '';
  visibility = 'PUBLIC';
  constructor() {
    void this.load();
    const code = this.route.snapshot.queryParamMap.get('codigo');
    if (code) void this.open(code);
    this.api.alerts().subscribe({ next: (a) => this.alerts.set(a), error: () => {} });
  }
  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      const r = await firstValueFrom(this.api.list(this.filter, this.page));
      this.items.set(r.results);
      this.pages.set(Math.max(1, r.pagination.total_pages));
    } catch {
      this.error.set('No se pudo cargar la consulta. Revisa tu conexión.');
    } finally {
      this.loading.set(false);
    }
  }
  async open(code: string) {
    if (this.busy()) return;
    this.comment = '';
    this.statusComment = '';
    this.staffId = '';
    this.assignmentReason = '';
    this.due = '';
    this.visibility = 'PUBLIC';
    this.notice.set('');
    this.busy.set(true);
    this.error.set('');
    this.detail.set(null);
    try {
      await this.refresh(code);
    } catch {
      this.error.set('No se pudo abrir la incidencia. Puede que ya no tengas acceso.');
    } finally {
      this.busy.set(false);
    }
  }
  private async refresh(code: string) {
    const [d, t] = await Promise.all([
      firstValueFrom(this.api.detail(code)),
      firstValueFrom(this.api.transitions(code)),
    ]);
    this.detail.set(d);
    this.transitions.set(t);
    this.nextStatus = '';
    if (d.can_modify_target_date) this.staff.set(await firstValueFrom(this.api.assignees()));
  }
  async mutate(action: string, body: object) {
    const code = this.detail()?.public_code;
    if (!code || this.busy()) return false;
    this.busy.set(true);
    this.error.set('');
    try {
      await firstValueFrom(this.api.action(code, action, body));
      await this.refresh(code);
      await this.load();
      this.notice.set('Cambio guardado.');
      return true;
    } catch (e: unknown) {
      const r = e as {
        error?: { error?: { message?: string; fields?: Record<string, string[]> } };
      };
      this.error.set(
        Object.values(r.error?.error?.fields || {})
          .flat()
          .join(' ') ||
          r.error?.error?.message ||
          'No se pudo guardar el cambio.',
      );
      return false;
    } finally {
      this.busy.set(false);
    }
  }
  async postComment() {
    if (await this.mutate('comments', { body: this.comment.trim(), visibility: this.visibility }))
      this.comment = '';
  }
  setDate() {
    if (this.due) void this.mutate('set-target-date', { due_at: new Date(this.due).toISOString() });
  }
}
