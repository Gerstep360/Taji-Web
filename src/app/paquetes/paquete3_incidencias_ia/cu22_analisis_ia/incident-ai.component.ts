import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { JsonPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AIAnalysis, AICatalog, AIState, IncidentAIApi } from './incident-ai.api';

@Component({
  selector: 'taji-incident-ai',
  imports: [FormsModule, JsonPipe, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './incident-ai.component.scss',
  template: ` <section class="ai-panel" aria-labelledby="ai-heading">
    <header>
      <div>
        <span class="eyebrow">Asistencia NVIDIA · revisión humana</span>
        <h3 id="ai-heading">Análisis de la incidencia</h3>
      </div>
      @if (state()?.can_analyze) {
        <button type="button" [disabled]="busy() || waiting()" (click)="analyze()">
          {{ waiting() ? 'Analizando…' : latest() ? 'Analizar de nuevo' : 'Analizar con IA' }}
        </button>
      }
    </header>
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }
    @if (waiting()) {
      <p class="waiting" role="status">
        {{
          latest()?.execution_status === 'QUEUED'
            ? 'En espera de análisis. Puedes seguir trabajando.'
            : 'NVIDIA está revisando el reporte…'
        }}
      </p>
    }
    @if (latest(); as a) {
      @if (a.execution_status === 'FAILED') {
        <p class="error" role="status">
          No se pudo completar el análisis automático. La incidencia sigue disponible y puede
          clasificarse manualmente.
        </p>
      }
      @if (a.execution_status === 'SUCCEEDED' || a.review) {
        <p class="status">
          {{ a.review ? 'Revisado por ' + a.review.reviewer : 'Propuesta pendiente de revisión' }}
        </p>
        <div class="results">
          <div>
            <span>Categoría</span><strong>{{ a.category?.name || 'Por revisar' }}</strong>
          </div>
          <div>
            <span>Prioridad</span><strong>{{ a.priority?.name || 'Por revisar' }}</strong>
          </div>
          <div>
            <span>Confianza del modelo</span
            ><strong>{{
              a.confidence !== null
                ? (+a.confidence * 100 | number: '1.0-0') + '%'
                : 'Sin estimación'
            }}</strong>
          </div>
        </div>
        <p>{{ a.summary }}</p>
        @if (a.confidence !== null && +a.confidence < 0.65) {
          <p class="caution">
            La confianza es baja: conviene verificar la categoría y la prioridad.
          </p>
        }
        <h4>Peligros y contexto</h4>
        <ul>
          @for (r of a.risks; track $index) {
            <li>
              <strong>{{ r.name }}</strong> · {{ contextLabel(r.context)
              }}<small>«{{ r.evidence }}»</small>
            </li>
          } @empty {
            <li>No se identificaron peligros específicos. Esto no garantiza ausencia de riesgo.</li>
          }
        </ul>
        @if (a.safety_findings.length) {
          <details>
            <summary>Comprobaciones de seguridad</summary>
            <ul>
              @for (f of a.safety_findings; track $index) {
                <li>
                  {{ f.name }} · {{ f.active ? 'Activa' : contextLabel(f.context)
                  }}<small>«{{ f.evidence }}»</small>
                </li>
              }
            </ul>
          </details>
        }
        <h4>Acciones sugeridas</h4>
        <ul>
          @for (r of a.recommendations; track $index) {
            <li>{{ r }}</li>
          } @empty {
            <li>Solicita una revisión al equipo responsable.</li>
          }
        </ul>
        @if (a.entities.length) {
          <details>
            <summary>Qué entendió del reporte</summary>
            <ul>
              @for (e of a.entities; track $index) {
                <li>{{ e.text_value }} · {{ contextLabel(e.normalized_value) }}</li>
              }
            </ul>
          </details>
        }
        @if (a.review) {
          <p class="review-note">{{ a.review.reason }}</p>
        }
      }
      @if (state()?.can_review && a.review_status === 'PENDING' && !waiting()) {
        <form (ngSubmit)="review()">
          <h4>
            {{
              a.execution_status === 'FAILED'
                ? 'Clasificar manualmente'
                : 'Verificar o corregir la propuesta'
            }}
          </h4>
          <p>
            La clasificación oficial se actualiza al guardar esta revisión. La predicción original
            se conserva.
          </p>
          <div class="form-grid">
            <label
              >Categoría<select name="aiCategory" [(ngModel)]="category" required>
                <option value="">Selecciona una categoría</option>
                @for (c of catalog()?.categories; track c.id) {
                  <option [value]="c.id">{{ c.name }}</option>
                }
              </select></label
            >
            <label
              >Prioridad<select name="aiPriority" [(ngModel)]="priority" required>
                <option value="">Selecciona una prioridad</option>
                @for (p of catalog()?.priorities; track p.id) {
                  <option [value]="p.id">{{ p.name }}</option>
                }
              </select></label
            >
          </div>
          <label
            >Motivo de la revisión<textarea
              name="aiReason"
              [(ngModel)]="reason"
              minlength="10"
              maxlength="2000"
              rows="2"
              required
              placeholder="Explica qué verificaste o qué corregiste"
            ></textarea>
          </label>
          <label class="check"
            ><input name="override" type="checkbox" [(ngModel)]="overrideSafety" />Confirmo una
            excepción a las señales de seguridad (requiere explicación detallada).</label
          >
          <button
            type="submit"
            class="primary"
            [disabled]="busy() || !category || !priority || reason.trim().length < 10"
          >
            {{ busy() ? 'Guardando…' : 'Guardar revisión y aplicar clasificación' }}
          </button>
        </form>
      }
      @if (state()?.can_review && a.original_prediction) {
        <details>
          <summary>Predicción original · solo lectura</summary>
          <pre>{{ a.original_prediction | json }}</pre>
        </details>
      }
      <small class="metadata"
        >{{ a.model }} · {{ a.model_version
        }}{{
          a.duration_ms !== null ? ' · ' + (a.duration_ms / 1000 | number: '1.1-1') + ' s' : ''
        }}</small
      >
      @if ((state()?.analyses?.length || 0) > 1) {
        <details>
          <summary>Análisis anteriores</summary>
          @for (old of state()?.analyses?.slice(1); track old.id) {
            <p>
              #{{ old.id }} · {{ old.category?.name || 'Sin clasificación' }} ·
              {{ old.priority?.name || 'Por revisar' }} · {{ old.review_status }}
            </p>
          }
        </details>
      }
    } @else {
      <p class="empty">
        Todavía no hay un análisis. La IA ayudará a proponer categoría, prioridad y acciones; el
        equipo conserva la decisión final.
      </p>
    }
  </section>`,
})
export class IncidentAIComponent {
  readonly code = input.required<string>();
  readonly reviewed = output<void>();
  private readonly api = inject(IncidentAIApi);
  private readonly revision = signal(0);
  readonly state = signal<AIState | null>(null);
  readonly catalog = signal<AICatalog | null>(null);
  readonly latest = signal<AIAnalysis | null>(null);
  readonly waiting = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  category = '';
  priority = '';
  reason = '';
  overrideSafety = false;
  constructor() {
    this.api
      .catalogs()
      .subscribe({
        next: (c) => this.catalog.set(c),
        error: () => this.error.set('No se pudieron cargar los catálogos.'),
      });
    effect((onCleanup) => {
      const code = this.code();
      this.revision();
      let disposed = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const deadline = Date.now() + 120000;
      const poll = async () => {
        try {
          const data = await firstValueFrom(this.api.state(code));
          if (disposed) return;
          this.state.set(data);
          const row = data.analyses[0] || null;
          this.latest.set(row);
          const waiting = row?.execution_status === 'QUEUED' || row?.execution_status === 'RUNNING';
          this.waiting.set(waiting);
          if (!waiting && row && !this.category) {
            this.category = row.category?.id.toString() || '';
            this.priority = row.priority?.id.toString() || '';
          }
          if (waiting && Date.now() < deadline) timer = setTimeout(poll, 2000);
          else if (waiting)
            this.error.set(
              'El análisis sigue pendiente. Vuelve a abrir la incidencia para actualizarlo.',
            );
        } catch {
          if (!disposed)
            this.error.set(
              'No se pudo consultar el análisis. Intenta abrir la incidencia nuevamente.',
            );
        }
      };
      void poll();
      onCleanup(() => {
        disposed = true;
        if (timer) clearTimeout(timer);
      });
    });
  }
  async analyze() {
    this.busy.set(true);
    this.error.set('');
    try {
      await firstValueFrom(this.api.analyze(this.code()));
      this.category = '';
      this.priority = '';
      this.reason = '';
      this.revision.update((v) => v + 1);
    } catch (e) {
      this.showError(e);
    } finally {
      this.busy.set(false);
    }
  }
  async review() {
    const a = this.latest();
    if (!a) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await firstValueFrom(
        this.api.review(this.code(), a.id, {
          category: +this.category,
          priority: +this.priority,
          reason: this.reason.trim(),
          safety_override: this.overrideSafety,
        }),
      );
      this.reviewed.emit();
      this.revision.update((v) => v + 1);
    } catch (e) {
      this.showError(e);
    } finally {
      this.busy.set(false);
    }
  }
  private showError(e: unknown) {
    const data = (
      e as { error?: { error?: { message?: string; fields?: Record<string, string[]> } } }
    ).error?.error;
    this.error.set(
      Object.values(data?.fields || {})
        .flat()
        .join(' ') ||
        data?.message ||
        'No se pudo completar la operación.',
    );
  }
  contextLabel(value: string) {
    return (
      (
        {
          present: 'Presente',
          negated: 'Negado en el reporte',
          distant: 'Fuera del peligro',
          past: 'Hecho pasado',
          uncertain: 'Por verificar',
          drill: 'Simulacro',
        } as Record<string, string>
      )[value] || value
    );
  }
}
