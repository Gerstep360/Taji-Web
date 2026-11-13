import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ButtonComponent } from '../../../shared/ui/button.component';
import { IconComponent } from '../../../shared/ui/icon.component';
import { AIChoice, AICatalog, IncidentAIApi } from './incident-ai.api';

type CatalogKind = 'categories' | 'priorities';
interface CatalogDraft {
  name: string;
  description: string;
  default_staff_type: string;
  code: string;
  rank: number;
  target_minutes: number | null;
  min_score: number | null;
  max_score: number | null;
}
@Component({
  selector: 'taji-ai-catalog',
  imports: [FormsModule, ButtonComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ai-catalog.page.html',
  styleUrl: './ai-catalog.page.scss',
})
export class AICatalogPage {
  private readonly api = inject(IncidentAIApi);
  readonly data = signal<AICatalog | null>(null);
  readonly kind = signal<CatalogKind>('categories');
  readonly busy = signal(false);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly search = signal('');
  readonly status = signal('all');
  readonly editing = signal<AIChoice | null | undefined>(undefined);
  readonly pendingDisable = signal<AIChoice | null>(null);
  readonly rows = computed(() => this.data()?.[this.kind()] || []);
  readonly activeCount = computed(() => this.rows().filter((r) => r.is_active !== false).length);
  readonly filtered = computed(() =>
    this.rows().filter(
      (r) =>
        (this.status() === 'all' || (r.is_active !== false) === (this.status() === 'active')) &&
        `${r.name} ${r.code || ''} ${r.description || ''}`
          .toLocaleLowerCase()
          .includes(this.search().toLocaleLowerCase().trim()),
    ),
  );
  draft: CatalogDraft = this.emptyDraft();
  constructor() {
    void this.load();
  }
  private emptyDraft(): CatalogDraft {
    return {
      name: '',
      description: '',
      default_staff_type: '',
      code: '',
      rank: 5,
      target_minutes: null,
      min_score: null,
      max_score: null,
    };
  }
  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      this.data.set(await firstValueFrom(this.api.catalogs(true)));
    } catch {
      this.error.set('No se pudieron cargar los catálogos. Vuelve a intentar.');
    } finally {
      this.loading.set(false);
    }
  }
  selectKind(kind: CatalogKind) {
    if (this.busy()) return;
    this.kind.set(kind);
    this.editing.set(undefined);
    this.pendingDisable.set(null);
    this.search.set('');
    this.error.set('');
  }
  edit(row: AIChoice | null) {
    if (this.busy()) return;
    this.error.set('');
    this.message.set('');
    this.editing.set(row);
    this.draft = row
      ? {
          name: row.name,
          description: row.description || '',
          default_staff_type: row.default_staff_type || '',
          code: row.code || '',
          rank: row.rank || 1,
          target_minutes: row.target_minutes ?? null,
          min_score: row.min_score != null ? +row.min_score : null,
          max_score: row.max_score != null ? +row.max_score : null,
        }
      : this.emptyDraft();
    if (!row) this.draft.rank = Math.max(0, ...this.data()!.priorities.map((p) => p.rank || 0)) + 1;
  }
  staffName(code?: string | null) {
    return (
      this.data()?.staff_types?.find((s) => s.code === code)?.name || 'Sin equipo predeterminado'
    );
  }
  targetLabel(minutes?: number | null) {
    if (!minutes) return 'Sin plazo objetivo';
    return minutes % 1440 === 0
      ? `${minutes / 1440} días`
      : minutes % 60 === 0
        ? `${minutes / 60} horas`
        : `${minutes} minutos`;
  }
  async save() {
    if (this.busy() || this.editing() === undefined || !this.draft.name.trim()) return;
    const current = this.editing();
    let body: object;
    if (this.kind() === 'categories')
      body = {
        name: this.draft.name.trim(),
        description: this.draft.description.trim(),
        default_staff_type: this.draft.default_staff_type || null,
      };
    else {
      if (
        !this.draft.rank ||
        this.draft.rank < 1 ||
        this.draft.rank > 32767 ||
        (this.draft.target_minutes !== null && this.draft.target_minutes <= 0)
      ) {
        this.error.set('El orden debe ser un entero positivo y el plazo debe ser mayor que cero.');
        return;
      }
      body = {
        name: this.draft.name.trim(),
        ...(!current ? { code: this.draft.code.trim().toUpperCase() } : {}),
        rank: this.draft.rank,
        target_minutes: this.draft.target_minutes,
        min_score: this.draft.min_score,
        max_score: this.draft.max_score,
      };
    }
    const row = await this.persist(current?.id || null, body);
    if (row) {
      this.editing.set(undefined);
      this.message.set(current ? 'Cambios guardados.' : 'Nuevo valor agregado al catálogo.');
    }
  }
  requestToggle(row: AIChoice) {
    if (row.is_active === false) void this.toggle(row);
    else this.pendingDisable.set(row);
  }
  async toggle(row: AIChoice) {
    const saved = await this.persist(row.id, { is_active: row.is_active === false });
    if (saved) {
      this.pendingDisable.set(null);
      this.message.set(
        saved.is_active
          ? 'Valor reactivado y disponible para nuevos reportes.'
          : 'Valor desactivado. Su historial se conserva.',
      );
    }
  }
  private async persist(id: number | null, body: object): Promise<AIChoice | null> {
    if (this.busy()) return null;
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    try {
      const row = await firstValueFrom(this.api.writeCatalog(this.kind(), id, body));
      this.data.update((data) =>
        data
          ? {
              ...data,
              [this.kind()]: id
                ? data[this.kind()].map((r) => (r.id === id ? row : r))
                : [...data[this.kind()], row],
            }
          : data,
      );
      return row;
    } catch (e) {
      const d = (
        e as { error?: { error?: { message?: string; fields?: Record<string, string[]> } } }
      ).error?.error;
      this.error.set(
        Object.values(d?.fields || {})
          .flat()
          .join(' ') ||
          d?.message ||
          'No se pudo guardar. Comprueba que el nombre, código y orden no estén repetidos.',
      );
      return null;
    } finally {
      this.busy.set(false);
    }
  }
}
