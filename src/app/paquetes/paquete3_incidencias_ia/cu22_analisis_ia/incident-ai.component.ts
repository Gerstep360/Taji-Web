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
import { IconComponent } from '../../../shared/ui/icon.component';
import { ButtonComponent } from '../../../shared/ui/button.component';
import { AIAnalysis, AICatalog, AIState, IncidentAIApi } from './incident-ai.api';

@Component({
  selector: 'taji-incident-ai',
  imports: [FormsModule, JsonPipe, DecimalPipe, IconComponent, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './incident-ai.component.html',
  styleUrl: './incident-ai.component.scss',
})
export class IncidentAIComponent {
  readonly code = input.required<string>();
  readonly reviewed = output<void>();
  private readonly api = inject(IncidentAIApi);
  private readonly revision = signal(0);
  private previousCode = '';
  readonly state = signal<AIState | null>(null);
  readonly catalog = signal<AICatalog | null>(null);
  readonly latest = signal<AIAnalysis | null>(null);
  readonly waiting = signal(false);
  readonly busy = signal(false);
  readonly loading = signal(true);
  readonly pollPaused = signal(false);
  readonly error = signal('');
  category = '';
  priority = '';
  reason = '';
  overrideSafety = false;
  constructor() {
    this.api.catalogs().subscribe({
      next: (c) => this.catalog.set(c),
      error: () =>
        this.error.set('No se pudieron cargar los catálogos. Actualiza la página para revisarlos.'),
    });
    effect((onCleanup) => {
      const code = this.code();
      this.revision();
      if (code !== this.previousCode) {
        this.previousCode = code;
        this.category = '';
        this.priority = '';
        this.reason = '';
        this.overrideSafety = false;
        this.state.set(null);
        this.latest.set(null);
        this.waiting.set(false);
        this.error.set('');
      }
      let disposed = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const deadline = Date.now() + 120000;
      this.loading.set(true);
      this.pollPaused.set(false);
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
          if (waiting && Date.now() < deadline)
            timer = setTimeout(poll, data.processor?.available === false ? 5000 : 2000);
          else if (waiting) this.pollPaused.set(true);
        } catch {
          if (!disposed) {
            this.error.set(
              'No pudimos consultar el análisis. Tus cambios de revisión se conservan.',
            );
            this.pollPaused.set(true);
          }
        } finally {
          if (!disposed) this.loading.set(false);
        }
      };
      void poll();
      onCleanup(() => {
        disposed = true;
        if (timer) clearTimeout(timer);
      });
    });
  }
  refresh() {
    this.error.set('');
    this.revision.update((v) => v + 1);
  }
  async analyze() {
    if (this.busy() || this.waiting() || !this.state()?.can_analyze) return;
    const code = this.code();
    this.busy.set(true);
    this.error.set('');
    try {
      await firstValueFrom(this.api.analyze(code));
      if (this.code() !== code) return;
      this.category = '';
      this.priority = '';
      this.reason = '';
      this.overrideSafety = false;
      this.revision.update((v) => v + 1);
    } catch (e) {
      if (this.code() === code) this.showError(e);
    } finally {
      this.busy.set(false);
    }
  }
  async review() {
    const row = this.latest();
    if (
      !row ||
      this.busy() ||
      this.waiting() ||
      !this.state()?.can_review ||
      !this.category ||
      !this.priority ||
      this.reason.trim().length < 10 ||
      (this.overrideSafety && this.reason.trim().length < 20)
    )
      return;
    const code = this.code();
    this.busy.set(true);
    this.error.set('');
    try {
      await firstValueFrom(
        this.api.review(code, row.id, {
          category: +this.category,
          priority: +this.priority,
          reason: this.reason.trim(),
          safety_override: this.overrideSafety,
        }),
      );
      if (this.code() !== code) return;
      this.reviewed.emit();
      this.revision.update((v) => v + 1);
    } catch (e) {
      if (this.code() === code) this.showError(e);
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
        'No se pudo completar la operación. Puedes volver a intentar sin perder tus cambios.',
    );
  }
  confidence(value: number | null) {
    return Math.max(0, Math.min(100, +(value || 0) * 100));
  }
  failureLabel(code: string) {
    return (
      (
        {
          not_configured: 'Falta configurar NVIDIA en el servidor.',
          timeout:
            'NVIDIA superó el tiempo de espera. Puedes reintentar o continuar con revisión manual.',
          authentication_failed:
            'NVIDIA rechazó la credencial del servidor. La administración debe revisar la configuración.',
          rate_limited: 'NVIDIA limitó temporalmente las solicitudes. Espera antes de reintentar.',
          worker_interrupted:
            'El servidor se reinició durante el análisis. Puedes solicitarlo de nuevo.',
          model_unavailable: 'El modelo no está disponible para esta cuenta.',
          ungrounded_evidence:
            'No pudimos verificar las citas del modelo. Se requiere revisión humana.',
          ungrounded_image: 'El modelo citó una foto que no recibió. La propuesta no se aplicó.',
        } as Record<string, string>
      )[code] ||
      'No se pudo verificar la respuesta automática. El equipo puede revisar el reporte manualmente.'
    );
  }
  mediaLabel(reason: string) {
    return (
      (
        {
          image_limit: 'Se alcanzó el límite de fotos por análisis',
          vision_disabled: 'Análisis visual desactivado',
          unreadable_image: 'No se pudo leer la foto',
          unsupported_image: 'Formato o dimensiones no compatibles',
          file_too_large: 'La foto supera el límite',
          image_too_complex: 'La foto supera el tamaño de envío',
        } as Record<string, string>
      )[reason] || 'Foto no enviada'
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
  reviewLabel(value: string) {
    return (
      (
        {
          PENDING: 'Pendiente de revisión',
          ACCEPTED: 'Confirmado',
          CORRECTED: 'Corregido',
          REJECTED: 'Descartado',
        } as Record<string, string>
      )[value] || 'Sin revisión'
    );
  }
}
