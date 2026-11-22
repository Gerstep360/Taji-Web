import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ButtonComponent } from '../../../shared/ui/button.component';
import { IconComponent } from '../../../shared/ui/icon.component';
import {
  IncidentReportApi,
  ReportOptions,
  ReportDraft,
  ReportConfirmation,
  sectorContains,
  evidenceError,
} from './incident-report.api';

@Component({
  selector: 'taji-incident-report',
  imports: [FormsModule, RouterLink, ButtonComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './incident-report.page.scss',
  template: `
    <header class="page-heading">
      <div>
        <span class="eyebrow">Cuidemos nuestro condominio</span>
        <h1>Reportar incidencia</h1>
        <p>Cuéntanos qué pasó. El equipo podrá atenderlo y tú seguir cada avance.</p>
      </div>
      <a routerLink="/incidencias">Ver seguimiento <span aria-hidden="true">↗</span></a>
    </header>
    @if (confirmation(); as report) {
      <section class="confirmation" role="status">
        <div class="success-icon"><taji-icon name="check" [size]="30" /></div>
        <span class="eyebrow">Reporte recibido</span>
        <h2>Ya estamos al tanto</h2>
        <p>Guarda este código para consultar la atención de tu incidencia.</p>
        <strong class="report-code">{{ report.public_code }}</strong>
        <p>{{ report.category.name }} · {{ report.status_display }}</p>
        <p class="muted">
          La clasificación inicial puede ajustarse después de la revisión del equipo y la IA.
        </p>
        <a
          class="primary-link"
          routerLink="/incidencias"
          [queryParams]="{ codigo: report.public_code }"
          >Ver mi incidencia</a
        ><button class="text-button" (click)="reset()">Reportar otra incidencia</button>
      </section>
    } @else {
      <div class="report-layout">
        <section class="report-panel">
          @if (loading()) {
            <p role="status">Cargando categorías y ubicaciones…</p>
          }
          @if (error()) {
            <div role="alert" class="error">
              {{ error() }}
              @if (!options()) {
                <button (click)="load()">Volver a intentar</button>
              }
            </div>
          }
          @if (options(); as opts) {
            @if (!opts.categories.length || !opts.sectors.length) {
              <div class="empty" role="status">
                <h2>Falta configurar el condominio</h2>
                <p>
                  La administración debe agregar al menos una categoría y una ubicación antes de
                  recibir reportes.
                </p>
              </div>
            } @else {
              <form #form="ngForm" (ngSubmit)="submit()">
                <fieldset [disabled]="busy()">
                  <div class="section-heading">
                    <span class="section-icon"><taji-icon name="file-text" [size]="20" /></span>
                    <div>
                      <h2>¿Qué ocurrió?</h2>
                      <p>Los campos con * son obligatorios.</p>
                    </div>
                  </div>
                  <label for="report-title">Título <span class="optional">opcional</span></label
                  ><input
                    id="report-title"
                    name="title"
                    [(ngModel)]="draft.title"
                    maxlength="160"
                    placeholder="Ej. Filtración en el pasillo"
                  />
                  <label for="report-description">Descripción *</label
                  ><textarea
                    id="report-description"
                    name="description"
                    [(ngModel)]="draft.description"
                    required
                    maxlength="5000"
                    rows="5"
                    placeholder="Describe lo que viste, dónde sucede y desde cuándo."
                    aria-describedby="description-hint"
                  ></textarea
                  ><small id="description-hint"
                    >El texto y las fotos compatibles se enviarán a NVIDIA para proponer una clasificación. No incluyas contraseñas ni datos personales.
                    {{ draft.description.length }}/5000</small
                  >
                  <div class="fields-row">
                    <div>
                      <label for="report-category">Categoría *</label
                      ><select
                        id="report-category"
                        name="category"
                        [(ngModel)]="draft.category"
                        required
                      >
                        <option value="">Selecciona una categoría</option>
                        @for (c of opts.categories; track c.id) {
                          <option [value]="c.id">{{ c.name }}</option>
                        }
                      </select>
                    </div>
                    <div>
                      <label for="report-sector">Ubicación *</label
                      ><select
                        id="report-sector"
                        name="sector"
                        [(ngModel)]="draft.sector"
                        (ngModelChange)="locationChanged()"
                        required
                      >
                        <option value="">Selecciona una ubicación</option>
                        @for (s of opts.sectors; track s.id) {
                          <option [value]="s.id">{{ s.name }} · {{ s.code }}</option>
                        }
                      </select>
                    </div>
                  </div>
                  @if (draft.sector) {
                    <div class="fields-row">
                      <div>
                        <label for="report-unit"
                          >Unidad <span class="optional">opcional</span></label
                        ><select id="report-unit" name="unit" [(ngModel)]="draft.unit">
                          <option value="">No corresponde / área común</option>
                          @for (u of units(); track u.id) {
                            <option [value]="u.id">{{ u.code }}</option>
                          }</select
                        ><small>Solo aparecen unidades que puedes vincular.</small>
                      </div>
                      <div>
                        <label for="report-asset"
                          >Equipo o activo <span class="optional">opcional</span></label
                        ><select id="report-asset" name="asset" [(ngModel)]="draft.asset">
                          <option value="">Sin equipo asociado</option>
                          @for (a of assets(); track a.id) {
                            <option [value]="a.id">{{ a.name }} · {{ a.code }}</option>
                          }
                        </select>
                      </div>
                    </div>
                  }
                  <div class="section-heading evidence-heading">
                    <span class="section-icon"><taji-icon name="image" [size]="20" /></span>
                    <div>
                      <h2>Evidencias <span class="optional">opcionales</span></h2>
                      <p>Una imagen ayuda al equipo a entender mejor el problema.</p>
                    </div>
                  </div>
                  <label class="upload" for="report-files"
                    ><taji-icon name="upload" [size]="23" /><strong
                      >Agregar fotos o documentos</strong
                    ><span
                      >{{ opts.evidence_rules.allowed_extensions.join(', ').toUpperCase() }} · hasta
                      {{ opts.evidence_rules.max_files }} archivos de {{ fileLimit() }}</span
                    ></label
                  ><input
                    id="report-files"
                    class="file-input"
                    type="file"
                    multiple
                    [accept]="accept()"
                    (change)="addFiles($event)"
                  />
                  @if (fileError()) {
                    <p class="error" role="alert">{{ fileError() }}</p>
                  }
                  @for (file of files(); track $index) {
                    <div class="file-row">
                      <taji-icon name="file-text" [size]="17" /><span
                        >{{ file.name
                        }}<small>{{
                          file.size < 1024
                            ? file.size + ' bytes'
                            : (file.size / 1024).toFixed(0) + ' KB'
                        }}</small></span
                      ><button
                        type="button"
                        [attr.aria-label]="'Quitar ' + file.name"
                        (click)="removeFile($index)"
                      >
                        <taji-icon name="x" [size]="16" />
                      </button>
                    </div>
                  }
                  <div class="form-footer">
                    <p>El código, estado y prioridad inicial se asignan automáticamente.</p>
                    <taji-button
                      type="submit"
                      [loading]="busy()"
                      [disabled]="!form.valid || !draft.description.trim()"
                      >{{ busy() ? 'Enviando reporte…' : 'Enviar reporte' }}</taji-button
                    >
                  </div>
                </fieldset>
              </form>
            }
          }
        </section>
        <aside class="report-guide">
          <span class="guide-mark"><taji-icon name="git-branch" [size]="24" /></span>
          <h2>Tu reporte tiene seguimiento</h2>
          <ol>
            <li>
              <strong>Describe y envía</strong
              ><span>Indica la ubicación y agrega evidencias si las tienes.</span>
            </li>
            <li>
              <strong>El equipo revisa</strong
              ><span>La IA puede sugerir una clasificación; una persona la verifica.</span>
            </li>
            <li>
              <strong>Acompaña la solución</strong
              ><span>Consulta el estado, responsable y avances desde Seguimiento.</span>
            </li>
          </ol>
          <div class="safety-note">
            <taji-icon name="alert-triangle" [size]="20" />
            <p>
              <strong>Si hay peligro inmediato</strong>No esperes una respuesta de la app. Aléjate
              del riesgo y contacta a seguridad o a los servicios de emergencia locales.
            </p>
          </div>
        </aside>
      </div>
    }
  `,
})
export class IncidentReportPage {
  private readonly api = inject(IncidentReportApi);
  readonly options = signal<ReportOptions | null>(null);
  readonly files = signal<File[]>([]);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly fileError = signal('');
  readonly confirmation = signal<ReportConfirmation | null>(null);
  draft: ReportDraft = {
    title: '',
    description: '',
    category: '',
    sector: '',
    unit: '',
    asset: '',
  };
  constructor() {
    void this.load();
  }
  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      this.options.set(await firstValueFrom(this.api.options()));
    } catch {
      this.error.set(
        'No se pudieron cargar las opciones. Comprueba tu conexión y el condominio activo.',
      );
    } finally {
      this.loading.set(false);
    }
  }
  units() {
    return (this.options()?.units || []).filter((u) =>
      sectorContains(this.options()?.sectors || [], +this.draft.sector, u.sector),
    );
  }
  assets() {
    return (this.options()?.assets || []).filter((a) =>
      sectorContains(this.options()?.sectors || [], +this.draft.sector, a.sector),
    );
  }
  locationChanged() {
    this.draft.unit = '';
    this.draft.asset = '';
  }
  accept() {
    return (
      this.options()
        ?.evidence_rules.allowed_extensions.map((e) => '.' + e)
        .join(',') || ''
    );
  }
  fileLimit() {
    const bytes = this.options()?.evidence_rules.max_file_size_bytes || 0;
    return bytes >= 1048576
      ? (bytes / 1048576).toFixed(0) + ' MB'
      : Math.ceil(bytes / 1024) + ' KB';
  }
  addFiles(event: Event) {
    const input = event.target as HTMLInputElement;
    const merged = [...this.files(), ...Array.from(input.files || [])];
    const rules = this.options()?.evidence_rules;
    const error = rules ? evidenceError(merged, rules) : 'Espera a que carguen las opciones.';
    this.fileError.set(error);
    if (!error) this.files.set(merged);
    input.value = '';
  }
  removeFile(index: number) {
    this.files.update((files) => files.filter((_, i) => i !== index));
    this.fileError.set('');
  }
  async submit() {
    if (
      this.busy() ||
      this.confirmation() ||
      !this.draft.description.trim() ||
      !this.draft.category ||
      !this.draft.sector ||
      !this.options()
    )
      return;
    const problem = evidenceError(this.files(), this.options()!.evidence_rules);
    if (problem) {
      this.fileError.set(problem);
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      this.confirmation.set(await firstValueFrom(this.api.create(this.draft, this.files())));
      this.files.set([]);
    } catch (error) {
      const body = (
        error as { error?: { error?: { message?: string; fields?: Record<string, string[]> } } }
      ).error?.error;
      this.error.set(
        Object.values(body?.fields || {})
          .flat()
          .join(' ') ||
          body?.message ||
          'No se pudo enviar el reporte. Tus datos se conservaron; revisa la conexión antes de reintentar.',
      );
    } finally {
      this.busy.set(false);
    }
  }
  reset() {
    this.confirmation.set(null);
    this.draft = { title: '', description: '', category: '', sector: '', unit: '', asset: '' };
    this.error.set('');
    this.fileError.set('');
  }
}
