import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AIChoice, AICatalog, IncidentAIApi } from './incident-ai.api';

@Component({
  selector: 'taji-ai-catalog',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      :host {
        display: block;
      }
      h1 {
        letter-spacing: -0.04em;
      }
      .columns {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.5rem;
      }
      section {
        border: 1px solid #d6e2f4;
        border-radius: 1rem;
        background: white;
        padding: 1.3rem;
      }
      form,
      label {
        display: grid;
        gap: 0.7rem;
      }
      form {
        margin-top: 1rem;
      }
      input,
      button {
        font: inherit;
        padding: 0.75rem;
        border: 1px solid #ccdbee;
        border-radius: 0.65rem;
      }
      button {
        cursor: pointer;
        color: #1265d9;
        background: #f5f9ff;
      }
      label {
        font-size: 0.85rem;
      }
      p {
        color: #60748b;
      }
      ul {
        padding-left: 1.2rem;
      }
      .error {
        color: #a52a3d;
      }
      @media (max-width: 750px) {
        .columns {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  template: `<h1>Catálogos de incidencias</h1>
    <p>
      Las categorías y prioridades se comparten entre condominios. Los nuevos valores estarán
      disponibles para NVIDIA sin entrenar otro modelo.
    </p>
    @if (error()) {
      <p role="alert" class="error">{{ error() }}</p>
    }
    @if (message()) {
      <p role="status">{{ message() }}</p>
    }
    <div class="columns">
      <section>
        <h2>Categorías</h2>
        <ul>
          @for (c of data()?.categories; track c.id) {
            <li>
              {{ c.name }} <small>{{ c.code }}</small>
            </li>
          }
        </ul>
        <form (ngSubmit)="createCategory()">
          <label
            >Nombre visible<input name="name" [(ngModel)]="name" maxlength="100" required /></label
          ><label
            >Qué incluye<input
              name="description"
              [(ngModel)]="description"
              maxlength="240" /></label
          ><small>El código interno se genera automáticamente.</small
          ><button [disabled]="busy() || !name.trim()">Agregar categoría</button>
        </form>
      </section>
      <section>
        <h2>Prioridades</h2>
        <ul>
          @for (p of data()?.priorities; track p.id) {
            <li>{{ p.name }} · orden {{ p.rank }}</li>
          }
        </ul>
        <form (ngSubmit)="createPriority()">
          <label
            >Código<input
              name="code"
              [(ngModel)]="code"
              pattern="[A-Z_]+"
              maxlength="20"
              required
              placeholder="Ej. ESPECIAL" /></label
          ><label
            >Nombre visible<input
              name="priorityName"
              [(ngModel)]="priorityName"
              maxlength="40"
              required /></label
          ><label
            >Orden de urgencia<input
              name="rank"
              type="number"
              min="1"
              [(ngModel)]="rank"
              required /></label
          ><label
            >Plazo objetivo en minutos<input
              name="minutes"
              type="number"
              min="1"
              [(ngModel)]="minutes"
              required /></label
          ><button [disabled]="busy() || !priorityName.trim() || !code.trim()">
            Agregar prioridad
          </button>
        </form>
      </section>
    </div>`,
})
export class AICatalogPage {
  private readonly api = inject(IncidentAIApi);
  readonly data = signal<AICatalog | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  name = '';
  description = '';
  code = '';
  priorityName = '';
  rank = 5;
  minutes = 60;
  constructor() {
    void this.load();
  }
  private async load() {
    try {
      this.data.set(await firstValueFrom(this.api.catalogs()));
    } catch {
      this.error.set('No se pudieron cargar los catálogos.');
    }
  }
  private async save(kind: string, body: object) {
    this.busy.set(true);
    this.error.set('');
    try {
      await firstValueFrom(this.api.writeCatalog(kind, null, body));
      await this.load();
      this.message.set('Valor agregado al catálogo.');
      return true;
    } catch (e) {
      const d = (
        e as { error?: { error?: { message?: string; fields?: Record<string, string[]> } } }
      ).error?.error;
      this.error.set(
        Object.values(d?.fields || {})
          .flat()
          .join(' ') ||
          d?.message ||
          'No se pudo guardar. Verifica valores duplicados y orden.',
      );
      return false;
    } finally {
      this.busy.set(false);
    }
  }
  async createCategory() {
    if (
      await this.save('categories', {
        name: this.name.trim(),
        description: this.description.trim(),
      })
    ) {
      this.name = '';
      this.description = '';
    }
  }
  async createPriority() {
    if (
      await this.save('priorities', {
        code: this.code.trim().toUpperCase(),
        name: this.priorityName.trim(),
        rank: +this.rank,
        target_minutes: +this.minutes,
      })
    ) {
      this.code = '';
      this.priorityName = '';
    }
  }
}
