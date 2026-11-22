import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, Subject, debounceTime, takeUntil } from 'rxjs';

import { apiErrorMessage, apiFieldErrors } from '../../../core/api-error';
import { AuthService } from '../../../core/auth/auth.service';
import { AsambleasApi } from './asambleas.api';
import {
  Agreement,
  AgreementAttachment,
  AgreementHistoryEntry,
  Assembly,
  AssemblyFilters,
  AssemblyStatus,
  ResponsibleOption,
} from './asambleas.models';

const ASSEMBLY_LABELS: Record<AssemblyStatus, string> = {
  SCHEDULED: 'Programada',
  IN_PROGRESS: 'En curso',
  FINISHED: 'Finalizada',
  CANCELLED: 'Cancelada',
};
const HISTORY_LABELS: Record<string, string> = {
  CU29_AGREEMENT_CREATED: 'Acuerdo registrado',
  CU29_AGREEMENT_UPDATED: 'Acuerdo actualizado',
  CU29_AGREEMENT_STARTED: 'Ejecución iniciada',
  CU29_AGREEMENT_COMPLETED: 'Acuerdo completado',
  CU29_AGREEMENT_CANCELLED: 'Acuerdo cancelado',
  CU29_AGREEMENT_ATTACHMENT_ADDED: 'Evidencia adjuntada',
  CU29_AGREEMENT_ATTACHMENT_REMOVED: 'Evidencia eliminada',
};

type ReasonDialog = { kind: 'assembly' | 'agreement'; id: number; title: string };

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIso(local: string): string | null {
  return local ? new Date(local).toISOString() : null;
}

@Component({
  selector: 'taji-asambleas-page',
  imports: [ReactiveFormsModule, DatePipe, DecimalPipe],
  template: `
    <section class="asambleas-page" aria-labelledby="asambleas-title">
      <header class="page-heading">
        <div>
          <span class="kicker">Servicios y Comunidad · CU29</span>
          <h2 id="asambleas-title">Asambleas y acuerdos</h2>
          <p>Programa asambleas, registra el acta y da seguimiento a los acuerdos, plazos y evidencias.</p>
        </div>
        @if (canManage()) {
          <button class="primary-action" type="button" (click)="openCreateAssembly()">
            <span aria-hidden="true">+</span> Programar asamblea
          </button>
        }
      </header>

      @if (!canManage() && canTrack()) {
        <div class="notice info" role="status">Tienes acceso de solo lectura a asambleas y acuerdos.</div>
      }
      @if (!canTrack()) {
        <div class="notice info" role="status">Aquí ves las próximas asambleas programadas del condominio.</div>
      }
      @if (loadError()) {
        <div class="notice error" role="alert">
          <span>{{ loadError() }}</span>
          <button type="button" (click)="load()">Reintentar</button>
        </div>
      }

      <form class="filters" [formGroup]="filters" aria-label="Filtros de asambleas">
        <label class="search-field">
          <span class="sr-only">Buscar asamblea</span>
          <input formControlName="search" type="search" placeholder="Buscar por título, descripción o lugar" />
        </label>
        @if (canTrack()) {
          <label>
            <span>Estado</span>
            <select formControlName="status">
              <option value="">Todos los estados</option>
              @for (option of assemblyStatusOptions; track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
          </label>
        }
      </form>

      <section [attr.aria-busy]="loading()">
        @if (loading()) {
          <div class="loading-state" role="status"><p>Cargando asambleas…</p></div>
        } @else if (!assemblies().length) {
          <div class="empty-state">
            <h3>No hay asambleas para mostrar</h3>
            <p>{{ canManage() ? 'Programa la primera asamblea del condominio.' : 'Cuando se programe una asamblea la verás aquí.' }}</p>
          </div>
        } @else {
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Asamblea</th>
                  <th>Fecha</th>
                  <th>Lugar</th>
                  <th>Estado</th>
                  @if (canTrack()) {
                    <th>Acuerdos</th>
                  }
                  <th><span class="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                @for (assembly of assemblies(); track assembly.id) {
                  <tr [class.is-selected]="selected()?.id === assembly.id">
                    <td>
                      <button type="button" class="link-cell" (click)="openDetail(assembly)">
                        <strong>{{ assembly.title }}</strong>
                        <small>{{ assembly.description || 'Sin descripción' }}</small>
                      </button>
                    </td>
                    <td>{{ assembly.scheduled_at | date: 'dd/MM/yyyy HH:mm' }}</td>
                    <td>{{ assembly.location || '—' }}</td>
                    <td>
                      <span [class]="'status-badge status-' + assembly.status.toLowerCase()">{{ assembly.status_display }}</span>
                    </td>
                    @if (canTrack()) {
                      <td class="counter">
                        <strong>{{ assembly.open_agreements_count ?? 0 }}</strong> abiertos / {{ assembly.agreements_count ?? 0 }}
                      </td>
                    }
                    <td>
                      <div class="row-actions">
                        <button type="button" (click)="openDetail(assembly)">{{ canTrack() ? 'Abrir' : 'Ver' }}</button>
                        @if (canManage() && assembly.status === 'SCHEDULED') {
                          <button type="button" (click)="openEditAssembly(assembly)">Editar</button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
        @if (totalPages() > 1) {
          <nav aria-label="Paginación de asambleas" class="row-actions">
            <button type="button" [disabled]="loading() || currentPage() <= 1" (click)="changePage(currentPage() - 1)">Anterior</button>
            <span>Página {{ currentPage() }} de {{ totalPages() }}</span>
            <button type="button" [disabled]="loading() || currentPage() >= totalPages()" (click)="changePage(currentPage() + 1)">Siguiente</button>
          </nav>
        }
      </section>
    </section>

    @if (selected(); as assembly) {
      <div class="drawer-backdrop" (click)="closeDetail()"></div>
      <aside class="ficha" role="dialog" aria-modal="true" aria-labelledby="ficha-title">
        <header>
          <div>
            <span class="kicker">Asamblea</span>
            <h2 id="ficha-title">{{ assembly.title }}</h2>
            <p>
              <span [class]="'status-badge status-' + assembly.status.toLowerCase()">{{ assembly.status_display }}</span>
            </p>
          </div>
          <button type="button" class="close" (click)="closeDetail()" aria-label="Cerrar">×</button>
        </header>

        @if (actionError()) {
          <div class="notice error" role="alert">{{ actionError() }}</div>
        }

        <dl class="ficha-data">
          <div><dt>Fecha y hora</dt><dd>{{ assembly.scheduled_at | date: 'dd/MM/yyyy HH:mm' }}</dd></div>
          <div><dt>Lugar</dt><dd>{{ assembly.location || '—' }}</dd></div>
          <div><dt>Descripción</dt><dd>{{ assembly.description || '—' }}</dd></div>
          @if (canTrack()) {
            <div><dt>Programada por</dt><dd>{{ assembly.created_by_name || '—' }}</dd></div>
          }
        </dl>

        @if (canManage()) {
          <div class="ficha-actions">
            @if (assembly.status === 'SCHEDULED') {
              <button type="button" class="primary-mini" [disabled]="busy()" (click)="startAssembly(assembly)">Iniciar asamblea</button>
              <button type="button" (click)="openEditAssembly(assembly)">Editar datos</button>
            }
            @if (assembly.status === 'IN_PROGRESS') {
              <button type="button" class="primary-mini" (click)="openFinish(assembly)">Finalizar con acta</button>
            }
            @if (assembly.status === 'SCHEDULED' || assembly.status === 'IN_PROGRESS') {
              <button type="button" class="danger" (click)="openReason('assembly', assembly.id, assembly.title)">Cancelar asamblea</button>
            }
          </div>
        }

        @if (canTrack()) {
          <section class="minutes">
            <h3>Acta</h3>
            @if (canManage() && (assembly.status === 'IN_PROGRESS' || assembly.status === 'FINISHED')) {
              <textarea [formControl]="minutesControl" placeholder="Registra el acta de la asamblea…" aria-label="Acta de la asamblea"></textarea>
              <div class="row-actions">
                <button type="button" [disabled]="busy() || minutesControl.value === (assembly.minutes_text || '')" (click)="saveMinutes(assembly)">
                  Guardar acta
                </button>
              </div>
            } @else if (assembly.minutes_text) {
              <p class="minutes-read">{{ assembly.minutes_text }}</p>
            } @else {
              <p class="muted">El acta se registra cuando la asamblea está en curso o finalizada.</p>
            }
          </section>

          <section>
            <div class="section-head">
              <h3>Acuerdos ({{ agreements().length }})</h3>
              @if (canManage() && (assembly.status === 'IN_PROGRESS' || assembly.status === 'FINISHED')) {
                <button type="button" class="secondary-action" (click)="openCreateAgreement()">+ Nuevo acuerdo</button>
              }
            </div>
            @if (agreementsLoading()) {
              <p class="muted">Cargando acuerdos…</p>
            } @else if (!agreements().length) {
              <p class="muted">Todavía no hay acuerdos registrados para esta asamblea.</p>
            } @else {
              <ul class="agreement-list">
                @for (agreement of agreements(); track agreement.id) {
                  <li class="agreement-card" [class.is-overdue]="agreement.is_overdue">
                    <div class="agreement-top">
                      <strong>{{ agreement.title }}</strong>
                      <span [class]="'status-badge status-' + agreement.status.toLowerCase()">{{ agreement.status_display }}</span>
                    </div>
                    @if (agreement.description) {
                      <p class="agreement-desc">{{ agreement.description }}</p>
                    }
                    <div class="agreement-meta">
                      <span>Responsable<b>{{ agreement.responsible_name || 'Sin asignar' }}</b></span>
                      <span>Plazo<b>{{ agreement.due_at ? (agreement.due_at | date: 'dd/MM/yyyy HH:mm') : 'Sin plazo' }}</b></span>
                      <span>Presupuesto<b>{{ agreement.estimated_budget ? (agreement.estimated_budget | number: '1.2-2') : '—' }}</b></span>
                      <span>Costo real<b>{{ agreement.actual_cost ? (agreement.actual_cost | number: '1.2-2') : '—' }}</b></span>
                    </div>
                    <div class="row-actions">
                      <button type="button" (click)="openAgreementDetail(agreement)">
                        Evidencias ({{ agreement.attachments_count }}) e historial
                      </button>
                      @if (canManage() && agreement.status !== 'COMPLETED' && agreement.status !== 'CANCELLED') {
                        <button type="button" (click)="openEditAgreement(agreement)">Editar</button>
                        @if (agreement.status === 'PENDING') {
                          <button type="button" class="primary-mini" [disabled]="busy()" (click)="startAgreement(agreement)">Iniciar</button>
                        }
                        <button type="button" class="primary-mini" (click)="openComplete(agreement)">Completar</button>
                        <button type="button" class="danger" (click)="openReason('agreement', agreement.id, agreement.title)">Cancelar</button>
                      }
                    </div>
                  </li>
                }
              </ul>
            }
          </section>
        }
      </aside>
    }

    @if (assemblyEditorOpen()) {
      <div class="modal-backdrop over" (click)="assemblyEditorOpen.set(false)"></div>
      <div class="modal-card over" role="dialog" aria-modal="true" aria-labelledby="assembly-editor-title">
        <header class="modal-header">
          <h3 id="assembly-editor-title">{{ editingAssembly() ? 'Editar asamblea' : 'Programar asamblea' }}</h3>
          <button type="button" class="close" (click)="assemblyEditorOpen.set(false)" aria-label="Cerrar">×</button>
        </header>
        @if (formError()) {
          <div class="notice error" role="alert">{{ formError() }}</div>
        }
        <form [formGroup]="assemblyForm" (ngSubmit)="saveAssembly()" novalidate>
          <label class="modal-field">
            <span>Título *</span>
            <input formControlName="title" type="text" maxlength="180" placeholder="Asamblea general ordinaria" />
            <small class="error-text">{{ fieldError('title') }}</small>
          </label>
          <label class="modal-field">
            <span>Fecha y hora *</span>
            <input formControlName="scheduled_at" type="datetime-local" />
            <small class="error-text">{{ fieldError('scheduled_at') }}</small>
          </label>
          <label class="modal-field">
            <span>Lugar</span>
            <input formControlName="location" type="text" maxlength="160" placeholder="Salón comunal" />
            <small class="error-text">{{ fieldError('location') }}</small>
          </label>
          <label class="modal-field">
            <span>Descripción / orden del día</span>
            <textarea formControlName="description" rows="3"></textarea>
          </label>
          <div class="modal-actions">
            <button type="button" class="secondary" (click)="assemblyEditorOpen.set(false)">Cancelar</button>
            <button type="submit" class="primary" [disabled]="saving()">{{ saving() ? 'Guardando…' : 'Guardar asamblea' }}</button>
          </div>
        </form>
      </div>
    }

    @if (finishTarget(); as target) {
      <div class="modal-backdrop over" (click)="finishTarget.set(null)"></div>
      <div class="modal-card over" role="dialog" aria-modal="true" aria-labelledby="finish-title">
        <header class="modal-header">
          <h3 id="finish-title">Finalizar «{{ target.title }}»</h3>
          <button type="button" class="close" (click)="finishTarget.set(null)" aria-label="Cerrar">×</button>
        </header>
        @if (formError()) {
          <div class="notice error" role="alert">{{ formError() }}</div>
        }
        <label class="modal-field">
          <span>Acta de la asamblea * (mínimo 10 caracteres)</span>
          <textarea [formControl]="finishMinutes" rows="7"></textarea>
        </label>
        <div class="modal-actions">
          <button type="button" class="secondary" (click)="finishTarget.set(null)">Volver</button>
          <button type="button" class="primary" [disabled]="saving() || finishMinutes.value.trim().length < 10" (click)="confirmFinish()">
            {{ saving() ? 'Finalizando…' : 'Finalizar asamblea' }}
          </button>
        </div>
      </div>
    }

    @if (reasonDialog(); as dialog) {
      <div class="modal-backdrop over" (click)="reasonDialog.set(null)"></div>
      <div class="modal-card over" role="dialog" aria-modal="true" aria-labelledby="reason-title">
        <header class="modal-header">
          <h3 id="reason-title">Cancelar «{{ dialog.title }}»</h3>
          <button type="button" class="close" (click)="reasonDialog.set(null)" aria-label="Cerrar">×</button>
        </header>
        @if (formError()) {
          <div class="notice error" role="alert">{{ formError() }}</div>
        }
        <label class="modal-field">
          <span>Motivo {{ dialog.kind === 'agreement' ? '*' : '(opcional)' }}</span>
          <textarea [formControl]="reasonControl" rows="3" maxlength="200"></textarea>
        </label>
        <div class="modal-actions">
          <button type="button" class="secondary" (click)="reasonDialog.set(null)">Volver</button>
          <button type="button" class="primary" [disabled]="saving() || (dialog.kind === 'agreement' && reasonControl.value.trim().length < 3)" (click)="confirmCancel()">
            Confirmar cancelación
          </button>
        </div>
      </div>
    }

    @if (agreementEditorOpen()) {
      <div class="modal-backdrop over" (click)="agreementEditorOpen.set(false)"></div>
      <div class="modal-card wide over" role="dialog" aria-modal="true" aria-labelledby="agreement-editor-title">
        <header class="modal-header">
          <h3 id="agreement-editor-title">{{ editingAgreement() ? 'Editar acuerdo' : 'Nuevo acuerdo' }}</h3>
          <button type="button" class="close" (click)="agreementEditorOpen.set(false)" aria-label="Cerrar">×</button>
        </header>
        @if (formError()) {
          <div class="notice error" role="alert">{{ formError() }}</div>
        }
        <form [formGroup]="agreementForm" (ngSubmit)="saveAgreement()" novalidate>
          <label class="modal-field">
            <span>Título *</span>
            <input formControlName="title" type="text" maxlength="180" placeholder="Reparar el portón principal" />
            <small class="error-text">{{ fieldError('title') }}</small>
          </label>
          <label class="modal-field">
            <span>Descripción</span>
            <textarea formControlName="description" rows="2"></textarea>
          </label>
          <div class="two-cols">
            <label class="modal-field">
              <span>Responsable</span>
              <select formControlName="responsible_user">
                <option value="">Sin asignar</option>
                @for (person of responsibles(); track person.id) {
                  <option [value]="person.id">{{ person.name }} ({{ person.role }})</option>
                }
              </select>
              <small class="error-text">{{ fieldError('responsible_user') }}</small>
            </label>
            <label class="modal-field">
              <span>Plazo</span>
              <input formControlName="due_at" type="datetime-local" />
              <small class="error-text">{{ fieldError('due_at') }}</small>
            </label>
            <label class="modal-field">
              <span>Presupuesto estimado</span>
              <input formControlName="estimated_budget" type="number" min="0" step="0.01" />
              <small class="error-text">{{ fieldError('estimated_budget') }}</small>
            </label>
            @if (editingAgreement() && editingAgreement()!.status !== 'PENDING') {
              <label class="modal-field">
                <span>Costo real</span>
                <input formControlName="actual_cost" type="number" min="0" step="0.01" />
                <small class="error-text">{{ fieldError('actual_cost') }}</small>
              </label>
            }
          </div>
          <div class="modal-actions">
            <button type="button" class="secondary" (click)="agreementEditorOpen.set(false)">Cancelar</button>
            <button type="submit" class="primary" [disabled]="saving()">{{ saving() ? 'Guardando…' : 'Guardar acuerdo' }}</button>
          </div>
        </form>
      </div>
    }

    @if (completeTarget(); as target) {
      <div class="modal-backdrop over" (click)="completeTarget.set(null)"></div>
      <div class="modal-card over" role="dialog" aria-modal="true" aria-labelledby="complete-title">
        <header class="modal-header">
          <h3 id="complete-title">Completar «{{ target.title }}»</h3>
          <button type="button" class="close" (click)="completeTarget.set(null)" aria-label="Cerrar">×</button>
        </header>
        @if (formError()) {
          <div class="notice error" role="alert">{{ formError() }}</div>
        }
        <form [formGroup]="completeForm" (ngSubmit)="confirmComplete()" novalidate>
          <label class="modal-field">
            <span>Costo real final (opcional)</span>
            <input formControlName="actual_cost" type="number" min="0" step="0.01" />
            <small class="error-text">{{ fieldError('actual_cost') }}</small>
          </label>
          <label class="modal-field">
            <span>Comentario (opcional)</span>
            <textarea formControlName="comment" rows="2" maxlength="200"></textarea>
          </label>
          <div class="modal-actions">
            <button type="button" class="secondary" (click)="completeTarget.set(null)">Volver</button>
            <button type="submit" class="primary" [disabled]="saving()">{{ saving() ? 'Guardando…' : 'Marcar como completado' }}</button>
          </div>
        </form>
      </div>
    }

    @if (agreementDetail(); as agreement) {
      <div class="modal-backdrop over" (click)="closeAgreementDetail()"></div>
      <div class="modal-card wide over" role="dialog" aria-modal="true" aria-labelledby="agreement-detail-title">
        <header class="modal-header">
          <h3 id="agreement-detail-title">{{ agreement.title }}</h3>
          <button type="button" class="close" (click)="closeAgreementDetail()" aria-label="Cerrar">×</button>
        </header>
        @if (detailError()) {
          <div class="notice error" role="alert">{{ detailError() }}</div>
        }

        <section>
          <h3>Evidencias</h3>
          @if (canManage() && agreement.status !== 'CANCELLED') {
            <div class="upload-form">
              <input type="file" #fileInput accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx" (change)="onFileSelected($event)" aria-label="Archivo de evidencia" />
              <input type="text" [formControl]="attachmentDescription" maxlength="200" placeholder="Descripción de la evidencia (opcional)" />
              <span class="hint">PDF, imágenes, Word o Excel. Máximo 10 MB y 10 archivos por acuerdo.</span>
              <div class="row-actions">
                <button type="button" [disabled]="!pendingFile() || uploading()" (click)="uploadPending(fileInput)">
                  {{ uploading() ? 'Subiendo…' : 'Subir evidencia' }}
                </button>
              </div>
            </div>
          }
          @if (detailLoading()) {
            <p class="muted">Cargando…</p>
          } @else if (!attachments().length) {
            <p class="muted">Sin evidencias adjuntas.</p>
          } @else {
            <ul class="attachment-list">
              @for (file of attachments(); track file.id) {
                <li>
                  <span>
                    <strong>{{ file.file_name }}</strong><br />
                    <small>{{ file.description || 'Sin descripción' }} · {{ file.uploaded_by_name }} · {{ file.created_at | date: 'dd/MM/yyyy HH:mm' }}</small>
                  </span>
                  <span class="row-actions">
                    <button type="button" (click)="download(agreement, file)">Descargar</button>
                    @if (canManage()) {
                      <button type="button" class="danger" (click)="removeAttachment(agreement, file)">Eliminar</button>
                    }
                  </span>
                </li>
              }
            </ul>
          }
        </section>

        <section>
          <h3>Historial de seguimiento</h3>
          @if (!detailLoading() && !history().length) {
            <p class="muted">Sin movimientos registrados.</p>
          } @else {
            <ul class="timeline">
              @for (entry of history(); track entry.id) {
                <li>
                  <strong>{{ historyLabel(entry.action_code) }}</strong>
                  <span>{{ entry.description }}</span>
                  <small>{{ entry.actor_name }} · {{ entry.occurred_at | date: 'dd/MM/yyyy HH:mm' }}</small>
                </li>
              }
            </ul>
          }
        </section>
      </div>
    }
  `,
  styleUrl: './asambleas.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AsambleasPage implements OnInit {
  private readonly api = inject(AsambleasApi);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly tenantChanged = new Subject<void>();
  private tenantId = this.auth.user()?.active_tenant?.id;
  private listRevision = 0;

  readonly assemblyStatusOptions = (Object.keys(ASSEMBLY_LABELS) as AssemblyStatus[]).map((value) => ({
    value,
    label: ASSEMBLY_LABELS[value],
  }));

  readonly assemblies = signal<Assembly[]>([]);
  readonly currentPage = signal(1);
  readonly totalPages = signal(1);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);

  readonly selected = signal<Assembly | null>(null);
  readonly agreements = signal<Agreement[]>([]);
  readonly agreementsLoading = signal(false);
  readonly responsibles = signal<ResponsibleOption[]>([]);
  readonly actionError = signal<string | null>(null);
  readonly busy = signal(false);

  readonly assemblyEditorOpen = signal(false);
  readonly editingAssembly = signal<Assembly | null>(null);
  readonly agreementEditorOpen = signal(false);
  readonly editingAgreement = signal<Agreement | null>(null);
  readonly finishTarget = signal<Assembly | null>(null);
  readonly completeTarget = signal<Agreement | null>(null);
  readonly reasonDialog = signal<ReasonDialog | null>(null);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  readonly formFields = signal<Record<string, string>>({});

  readonly agreementDetail = signal<Agreement | null>(null);
  readonly attachments = signal<AgreementAttachment[]>([]);
  readonly history = signal<AgreementHistoryEntry[]>([]);
  readonly detailLoading = signal(false);
  readonly detailError = signal<string | null>(null);
  readonly pendingFile = signal<File | null>(null);
  readonly uploading = signal(false);

  readonly canManage = computed(() => {
    const user = this.auth.user();
    return !!user && (user.is_superuser || !!user.role?.permissions.includes('manage_assemblies'));
  });
  readonly canTrack = computed(() => {
    const user = this.auth.user();
    return (
      !!user &&
      (user.is_superuser ||
        !!user.role?.permissions.includes('manage_assemblies') ||
        !!user.role?.permissions.includes('track_assembly_decisions'))
    );
  });

  readonly filters = this.fb.nonNullable.group({ search: '', status: '' as string });
  readonly minutesControl = this.fb.nonNullable.control('');
  readonly finishMinutes = this.fb.nonNullable.control('');
  readonly reasonControl = this.fb.nonNullable.control('');
  readonly attachmentDescription = this.fb.nonNullable.control('');
  readonly assemblyForm = this.fb.nonNullable.group({
    title: ['', Validators.required],
    scheduled_at: ['', Validators.required],
    location: '',
    description: '',
  });
  readonly agreementForm = this.fb.nonNullable.group({
    title: ['', Validators.required],
    description: '',
    responsible_user: '',
    due_at: '',
    estimated_budget: '',
    actual_cost: '',
  });
  readonly completeForm = this.fb.nonNullable.group({ actual_cost: '', comment: '' });

  constructor() {
    effect(() => {
      const tenantId = this.auth.user()?.active_tenant?.id;
      if (tenantId === this.tenantId) return;
      this.tenantId = tenantId;
      untracked(() => {
        this.tenantChanged.next();
        this.assemblies.set([]);
        this.closeAll();
        this.loadError.set(null);
        this.filters.reset();
        if (tenantId) this.load();
      });
    });
  }

  ngOnInit(): void {
    this.filters.valueChanges
      .pipe(debounceTime(300), takeUntil(this.tenantChanged), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.currentPage.set(1);
        this.load();
      });
    this.load();
  }

  private closeAll(): void {
    this.selected.set(null);
    this.agreements.set([]);
    this.assemblyEditorOpen.set(false);
    this.agreementEditorOpen.set(false);
    this.finishTarget.set(null);
    this.completeTarget.set(null);
    this.reasonDialog.set(null);
    this.agreementDetail.set(null);
    this.saving.set(false);
    this.busy.set(false);
  }

  private guard<T>(source: Observable<T>) {
    return source.pipe(takeUntil(this.tenantChanged), takeUntilDestroyed(this.destroyRef));
  }

  fieldError(field: string): string {
    return this.formFields()[field] ?? '';
  }

  historyLabel(code: string): string {
    return HISTORY_LABELS[code] ?? code;
  }

  changePage(page: number): void {
    if (this.loading() || page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.load();
  }

  load(): void {
    const revision = ++this.listRevision;
    this.loading.set(true);
    this.loadError.set(null);
    const raw = this.filters.getRawValue();
    const criteria: AssemblyFilters = {
      page: this.currentPage(),
      search: raw.search || undefined,
      status: (raw.status || '') as AssemblyFilters['status'],
    };
    this.guard(this.api.listAssemblies(criteria)).subscribe({
      next: (page) => {
        if (revision !== this.listRevision) return;
        this.assemblies.set(page.results);
        this.totalPages.set(Math.max(1, page.pagination?.total_pages ?? 1));
        this.loading.set(false);
        const open = this.selected();
        if (open) {
          const fresh = page.results.find((item) => item.id === open.id);
          if (fresh) this.selected.set(fresh);
        }
      },
      error: (error) => {
        if (revision !== this.listRevision) return;
        this.loadError.set(apiErrorMessage(error));
        this.loading.set(false);
      },
    });
  }

  private applyAssembly(updated: Assembly): void {
    this.selected.set(updated);
    this.minutesControl.setValue(updated.minutes_text ?? '');
    this.assemblies.update((list) => list.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
    this.load();
  }

  // ----- Asambleas -----

  openDetail(assembly: Assembly): void {
    this.selected.set(assembly);
    this.actionError.set(null);
    this.minutesControl.setValue(assembly.minutes_text ?? '');
    this.agreements.set([]);
    if (this.canTrack()) {
      this.loadAgreements(assembly.id);
      if (this.canManage() && !this.responsibles().length) this.loadResponsibles();
    }
  }

  closeDetail(): void {
    this.selected.set(null);
    this.agreements.set([]);
  }

  private loadAgreements(assemblyId: number): void {
    this.agreementsLoading.set(true);
    this.guard(this.api.assemblyAgreements(assemblyId)).subscribe({
      next: (rows) => {
        this.agreements.set(rows);
        this.agreementsLoading.set(false);
      },
      error: (error) => {
        this.actionError.set(apiErrorMessage(error));
        this.agreementsLoading.set(false);
      },
    });
  }

  private loadResponsibles(): void {
    this.guard(this.api.responsibles()).subscribe({
      next: (rows) => this.responsibles.set(rows),
      error: () => this.responsibles.set([]),
    });
  }

  openCreateAssembly(): void {
    this.editingAssembly.set(null);
    this.formError.set(null);
    this.formFields.set({});
    this.assemblyForm.reset({ title: '', scheduled_at: '', location: '', description: '' });
    this.assemblyEditorOpen.set(true);
  }

  openEditAssembly(assembly: Assembly): void {
    this.editingAssembly.set(assembly);
    this.formError.set(null);
    this.formFields.set({});
    this.assemblyForm.reset({
      title: assembly.title,
      scheduled_at: toLocalInput(assembly.scheduled_at),
      location: assembly.location,
      description: assembly.description,
    });
    this.assemblyEditorOpen.set(true);
  }

  saveAssembly(): void {
    if (this.assemblyForm.invalid) {
      this.assemblyForm.markAllAsTouched();
      this.formError.set('Completa el título y la fecha de la asamblea.');
      return;
    }
    this.saving.set(true);
    this.formError.set(null);
    this.formFields.set({});
    const raw = this.assemblyForm.getRawValue();
    const payload = {
      title: raw.title,
      scheduled_at: toIso(raw.scheduled_at),
      location: raw.location,
      description: raw.description,
    };
    const editing = this.editingAssembly();
    const request = editing ? this.api.updateAssembly(editing.id, payload) : this.api.createAssembly(payload);
    this.guard(request).subscribe({
      next: (assembly) => {
        this.saving.set(false);
        this.assemblyEditorOpen.set(false);
        if (editing) this.applyAssembly(assembly);
        else this.load();
      },
      error: (error) => {
        this.saving.set(false);
        this.formError.set(apiErrorMessage(error));
        this.formFields.set(apiFieldErrors(error));
      },
    });
  }

  startAssembly(assembly: Assembly): void {
    this.runAssemblyAction(this.api.startAssembly(assembly.id));
  }

  openFinish(assembly: Assembly): void {
    this.formError.set(null);
    this.finishMinutes.setValue(assembly.minutes_text ?? '');
    this.finishTarget.set(assembly);
  }

  confirmFinish(): void {
    const target = this.finishTarget();
    if (!target) return;
    this.saving.set(true);
    this.formError.set(null);
    this.guard(this.api.finishAssembly(target.id, this.finishMinutes.value.trim())).subscribe({
      next: (assembly) => {
        this.saving.set(false);
        this.finishTarget.set(null);
        this.applyAssembly(assembly);
      },
      error: (error) => {
        this.saving.set(false);
        this.formError.set(apiErrorMessage(error));
      },
    });
  }

  saveMinutes(assembly: Assembly): void {
    this.runAssemblyAction(this.api.updateAssembly(assembly.id, { minutes_text: this.minutesControl.value }));
  }

  private runAssemblyAction(request: Observable<Assembly>): void {
    this.busy.set(true);
    this.actionError.set(null);
    this.guard(request).subscribe({
      next: (assembly) => {
        this.busy.set(false);
        this.applyAssembly(assembly);
      },
      error: (error) => {
        this.busy.set(false);
        this.actionError.set(apiErrorMessage(error));
      },
    });
  }

  // ----- Cancelaciones (asamblea y acuerdo comparten diálogo) -----

  openReason(kind: ReasonDialog['kind'], id: number, title: string): void {
    this.formError.set(null);
    this.reasonControl.setValue('');
    this.reasonDialog.set({ kind, id, title });
  }

  confirmCancel(): void {
    const dialog = this.reasonDialog();
    if (!dialog) return;
    this.saving.set(true);
    this.formError.set(null);
    const reason = this.reasonControl.value.trim();
    const done = () => {
      this.saving.set(false);
      this.reasonDialog.set(null);
    };
    const fail = (error: unknown) => {
      this.saving.set(false);
      this.formError.set(apiErrorMessage(error));
    };
    if (dialog.kind === 'assembly') {
      this.guard(this.api.cancelAssembly(dialog.id, reason)).subscribe({
        next: (assembly) => {
          done();
          this.applyAssembly(assembly);
        },
        error: fail,
      });
    } else {
      this.guard(this.api.cancelAgreement(dialog.id, reason)).subscribe({
        next: () => {
          done();
          this.refreshAgreements();
        },
        error: fail,
      });
    }
  }

  // ----- Acuerdos -----

  private refreshAgreements(): void {
    const assembly = this.selected();
    if (assembly) {
      this.loadAgreements(assembly.id);
      this.load();
    }
  }

  openCreateAgreement(): void {
    this.editingAgreement.set(null);
    this.formError.set(null);
    this.formFields.set({});
    this.agreementForm.reset({ title: '', description: '', responsible_user: '', due_at: '', estimated_budget: '', actual_cost: '' });
    this.agreementEditorOpen.set(true);
  }

  openEditAgreement(agreement: Agreement): void {
    this.editingAgreement.set(agreement);
    this.formError.set(null);
    this.formFields.set({});
    this.agreementForm.reset({
      title: agreement.title,
      description: agreement.description,
      responsible_user: agreement.responsible_user ? String(agreement.responsible_user) : '',
      due_at: toLocalInput(agreement.due_at),
      estimated_budget: agreement.estimated_budget ?? '',
      actual_cost: agreement.actual_cost ?? '',
    });
    this.agreementEditorOpen.set(true);
  }

  saveAgreement(): void {
    const assembly = this.selected();
    if (!assembly) return;
    if (this.agreementForm.invalid) {
      this.agreementForm.markAllAsTouched();
      this.formError.set('Escribe el título del acuerdo.');
      return;
    }
    this.saving.set(true);
    this.formError.set(null);
    this.formFields.set({});
    const raw = this.agreementForm.getRawValue();
    const editing = this.editingAgreement();
    const payload: Record<string, unknown> = {
      title: raw.title,
      description: raw.description,
      responsible_user: raw.responsible_user ? Number(raw.responsible_user) : null,
      due_at: toIso(raw.due_at),
      estimated_budget: raw.estimated_budget === '' ? null : raw.estimated_budget,
    };
    if (editing && editing.status !== 'PENDING') {
      payload['actual_cost'] = raw.actual_cost === '' ? null : raw.actual_cost;
    }
    if (!editing) payload['assembly'] = assembly.id;
    const request = editing ? this.api.updateAgreement(editing.id, payload) : this.api.createAgreement(payload);
    this.guard(request).subscribe({
      next: () => {
        this.saving.set(false);
        this.agreementEditorOpen.set(false);
        this.refreshAgreements();
      },
      error: (error) => {
        this.saving.set(false);
        this.formError.set(apiErrorMessage(error));
        this.formFields.set(apiFieldErrors(error));
      },
    });
  }

  startAgreement(agreement: Agreement): void {
    this.busy.set(true);
    this.actionError.set(null);
    this.guard(this.api.startAgreement(agreement.id)).subscribe({
      next: () => {
        this.busy.set(false);
        this.refreshAgreements();
      },
      error: (error) => {
        this.busy.set(false);
        this.actionError.set(apiErrorMessage(error));
      },
    });
  }

  openComplete(agreement: Agreement): void {
    this.formError.set(null);
    this.formFields.set({});
    this.completeForm.reset({ actual_cost: agreement.actual_cost ?? '', comment: '' });
    this.completeTarget.set(agreement);
  }

  confirmComplete(): void {
    const target = this.completeTarget();
    if (!target) return;
    this.saving.set(true);
    this.formError.set(null);
    this.formFields.set({});
    const raw = this.completeForm.getRawValue();
    const payload: Record<string, unknown> = { comment: raw.comment };
    if (raw.actual_cost !== '') payload['actual_cost'] = raw.actual_cost;
    this.guard(this.api.completeAgreement(target.id, payload)).subscribe({
      next: () => {
        this.saving.set(false);
        this.completeTarget.set(null);
        this.refreshAgreements();
      },
      error: (error) => {
        this.saving.set(false);
        this.formError.set(apiErrorMessage(error));
        this.formFields.set(apiFieldErrors(error));
      },
    });
  }

  // ----- Evidencias e historial -----

  openAgreementDetail(agreement: Agreement): void {
    this.agreementDetail.set(agreement);
    this.detailError.set(null);
    this.attachments.set([]);
    this.history.set([]);
    this.pendingFile.set(null);
    this.attachmentDescription.setValue('');
    this.loadDetail(agreement.id);
  }

  closeAgreementDetail(): void {
    this.agreementDetail.set(null);
    this.refreshAgreements();
  }

  private loadDetail(agreementId: number): void {
    this.detailLoading.set(true);
    this.guard(this.api.listAttachments(agreementId)).subscribe({
      next: (rows) => this.attachments.set(rows),
      error: (error) => this.detailError.set(apiErrorMessage(error)),
    });
    this.guard(this.api.agreementHistory(agreementId)).subscribe({
      next: (rows) => {
        this.history.set(rows);
        this.detailLoading.set(false);
      },
      error: (error) => {
        this.detailError.set(apiErrorMessage(error));
        this.detailLoading.set(false);
      },
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.pendingFile.set(input.files?.item(0) ?? null);
  }

  uploadPending(input: HTMLInputElement): void {
    const agreement = this.agreementDetail();
    const file = this.pendingFile();
    if (!agreement || !file) return;
    this.uploading.set(true);
    this.detailError.set(null);
    this.guard(this.api.uploadAttachment(agreement.id, file, this.attachmentDescription.value.trim())).subscribe({
      next: () => {
        this.uploading.set(false);
        this.pendingFile.set(null);
        this.attachmentDescription.setValue('');
        input.value = '';
        this.loadDetail(agreement.id);
      },
      error: (error) => {
        this.uploading.set(false);
        this.detailError.set(apiErrorMessage(error));
      },
    });
  }

  removeAttachment(agreement: Agreement, file: AgreementAttachment): void {
    if (!confirm(`¿Eliminar la evidencia «${file.file_name}»?`)) return;
    this.guard(this.api.deleteAttachment(agreement.id, file.id)).subscribe({
      next: () => this.loadDetail(agreement.id),
      error: (error) => this.detailError.set(apiErrorMessage(error)),
    });
  }

  download(agreement: Agreement, file: AgreementAttachment): void {
    this.guard(this.api.downloadAttachment(agreement.id, file.id)).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.file_name;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: (error) => this.detailError.set(apiErrorMessage(error)),
    });
  }
}
