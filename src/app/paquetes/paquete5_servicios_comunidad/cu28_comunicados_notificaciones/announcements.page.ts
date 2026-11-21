import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import {
  AnnouncementItem,
  AnnouncementsApi,
  CreateAnnouncementDto,
} from './announcements.api';
import {
  AnnouncementAudience,
  AnnouncementPriority,
  AnnouncementStatus,
} from '../../../domain/models/notifications.models';

@Component({
  selector: 'taji-announcements-page',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './announcements.page.scss',
  template: `
    <header class="page-header">
      <div class="header-content">
        <span class="eyebrow">Servicios de Comunidad · CU28</span>
        <h1>Comunicados y Notificaciones</h1>
        <p class="subtitle">
          Emite avisos oficiales por audiencia y prioridad para mantener informada a la comunidad.
        </p>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary" (click)="openCreateModal()">
          <span class="icon">+</span> Nuevo Comunicado
        </button>
      </div>
    </header>

    @if (error()) {
      <div class="banner banner-error" role="alert">
        <span>{{ error() }}</span>
        <button class="btn-retry" (click)="load()">Reintentar</button>
      </div>
    }

    @if (successNotice()) {
      <div class="banner banner-success" role="status">
        <span>{{ successNotice() }}</span>
        <button class="btn-close" (click)="successNotice.set(null)">✕</button>
      </div>
    }

    <!-- FILTROS Y BÚSQUEDA -->
    <section class="filters-bar" aria-label="Filtros de comunicados">
      <div class="search-box">
        <input
          type="search"
          placeholder="Buscar comunicados por título o contenido…"
          [ngModel]="searchTerm()"
          (ngModelChange)="searchTerm.set($event)"
          (keyup.enter)="load()"
        />
        <button class="btn btn-secondary btn-sm" (click)="load()">Buscar</button>
      </div>

      <div class="select-filters">
        <label>
          <span>Audiencia</span>
          <select [ngModel]="audienceFilter()" (ngModelChange)="audienceFilter.set($event); load()">
            <option value="">Todas</option>
            <option value="ALL">Todos los usuarios</option>
            <option value="RESIDENTS">Residentes</option>
            <option value="STAFF">Personal operativo</option>
            <option value="SECURITY">Seguridad</option>
            <option value="MAINTENANCE">Mantenimiento</option>
            <option value="DIRECTIVE">Directiva</option>
          </select>
        </label>

        <label>
          <span>Prioridad</span>
          <select [ngModel]="priorityFilter()" (ngModelChange)="priorityFilter.set($event); load()">
            <option value="">Todas</option>
            <option value="URGENT">Urgente</option>
            <option value="HIGH">Alta</option>
            <option value="NORMAL">Normal</option>
            <option value="LOW">Baja</option>
          </select>
        </label>

        <label>
          <span>Estado</span>
          <select [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event); load()">
            <option value="">Todos</option>
            <option value="PUBLISHED">Publicados</option>
            <option value="DRAFT">Borradores</option>
            <option value="ARCHIVED">Archivados</option>
          </select>
        </label>
      </div>
    </section>

    <!-- LISTADO DE COMUNICADOS -->
    <section class="announcements-container" aria-label="Listado de comunicados">
      @if (loading()) {
        <div class="loading-state" role="status">
          <div class="spinner"></div>
          <p>Cargando comunicados oficiales…</p>
        </div>
      } @else if (items().length === 0) {
        <div class="empty-state">
          <p>No se encontraron comunicados con los criterios seleccionados.</p>
          <button class="btn btn-secondary btn-sm" (click)="resetFilters()">Restablecer filtros</button>
        </div>
      } @else {
        <div class="announcements-grid">
          @for (item of items(); track item.id) {
            <article class="announcement-card" [class.is-draft]="item.status === 'DRAFT'" [class.is-archived]="item.status === 'ARCHIVED'">
              <div class="card-header">
                <div class="badges">
                  <span class="badge priority-badge" [ngClass]="getPriorityClass(item.priority)">
                    {{ item.priority_display || item.priority }}
                  </span>
                  <span class="badge audience-badge">
                    {{ item.audience_display || item.audience }}
                  </span>
                  <span class="badge status-badge" [ngClass]="getStatusClass(item.status)">
                    {{ item.status_display || item.status }}
                  </span>
                </div>
                <div class="dates">
                  @if (item.published_at) {
                    <span class="date">Publicado: {{ item.published_at | date: 'dd/MM/yyyy HH:mm' }}</span>
                  } @else {
                    <span class="date">Creado: {{ item.created_at | date: 'dd/MM/yyyy' }}</span>
                  }
                </div>
              </div>

              <div class="card-body">
                <h3 class="card-title">{{ item.title }}</h3>
                <p class="card-text">{{ item.body }}</p>
                @if (item.expires_at) {
                  <p class="expiry-notice">
                    ⏰ Expira el {{ item.expires_at | date: 'dd/MM/yyyy HH:mm' }}
                  </p>
                }
              </div>

              <div class="card-footer">
                <span class="author">
                  Por: {{ item.created_by_name || 'Administración' }}
                </span>
                <div class="card-actions">
                  @if (item.status === 'DRAFT') {
                    <button class="btn btn-outline-success btn-xs" (click)="publishItem(item)">
                      Publicar
                    </button>
                    <button class="btn btn-outline-primary btn-xs" (click)="openEditModal(item)">
                      Editar
                    </button>
                  }
                  @if (item.status !== 'ARCHIVED') {
                    <button class="btn btn-outline-danger btn-xs" (click)="archiveItem(item)">
                      Archivar
                    </button>
                  }
                </div>
              </div>
            </article>
          }
        </div>
      }
    </section>

    <!-- MODAL DE CREACIÓN / EDICIÓN -->
    @if (isFormOpen()) {
      <div class="modal-backdrop" (click)="closeModal()">
        <div class="modal-card" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
          <div class="modal-header">
            <h2>{{ editingItem() ? 'Editar Comunicado' : 'Nuevo Comunicado Oficial' }}</h2>
            <button class="btn-close" (click)="closeModal()">✕</button>
          </div>

          <form class="modal-form" (ngSubmit)="saveAnnouncement()">
            <div class="form-group">
              <label for="ann-title">Título *</label>
              <input
                id="ann-title"
                type="text"
                maxlength="160"
                required
                [(ngModel)]="formTitle"
                name="title"
                placeholder="Ej. Limpieza general de tanques de agua"
              />
            </div>

            <div class="form-group">
              <label for="ann-body">Contenido / Mensaje *</label>
              <textarea
                id="ann-body"
                rows="5"
                required
                [(ngModel)]="formBody"
                name="body"
                placeholder="Escribe el detalle del comunicado que se notificará a los residentes..."
              ></textarea>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="ann-audience">Audiencia Destino *</label>
                <select id="ann-audience" [(ngModel)]="formAudience" name="audience" required>
                  <option value="ALL">Todos los usuarios (Comunidad)</option>
                  <option value="RESIDENTS">Solo Residentes / Copropietarios</option>
                  <option value="STAFF">Todo el Personal</option>
                  <option value="SECURITY">Seguridad y Portería</option>
                  <option value="MAINTENANCE">Personal de Mantenimiento</option>
                  <option value="DIRECTIVE">Mesa Directiva</option>
                </select>
              </div>

              <div class="form-group">
                <label for="ann-priority">Prioridad *</label>
                <select id="ann-priority" [(ngModel)]="formPriority" name="priority" required>
                  <option value="LOW">Baja (Informativo)</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">Alta</option>
                  <option value="URGENT">Urgente (Alerta prioritaria)</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label for="ann-expires">Fecha y hora de expiración (opcional)</label>
              <input
                id="ann-expires"
                type="datetime-local"
                [(ngModel)]="formExpiresAt"
                name="expires_at"
              />
            </div>

            @if (formError()) {
              <p class="form-error">{{ formError() }}</p>
            }

            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" (click)="closeModal()">Cancelar</button>
              @if (!editingItem()) {
                <button
                  type="button"
                  class="btn btn-outline-primary"
                  [disabled]="formSubmitting()"
                  (click)="saveAnnouncement(false)"
                >
                  Guardar Borrador
                </button>
              }
              <button
                type="button"
                class="btn btn-primary"
                [disabled]="formSubmitting()"
                (click)="saveAnnouncement(true)"
              >
                {{ editingItem() ? 'Guardar Cambios' : 'Publicar Ahora' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
})
export class AnnouncementsPage implements OnInit {
  private readonly api = inject(AnnouncementsApi);

  readonly items = signal<AnnouncementItem[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly successNotice = signal<string | null>(null);

  // Filtros
  readonly audienceFilter = signal<string>('');
  readonly priorityFilter = signal<string>('');
  readonly statusFilter = signal<string>('');
  readonly searchTerm = signal<string>('');

  // Modal / Form
  readonly isFormOpen = signal<boolean>(false);
  readonly editingItem = signal<AnnouncementItem | null>(null);
  readonly formSubmitting = signal<boolean>(false);
  readonly formError = signal<string | null>(null);

  formTitle = '';
  formBody = '';
  formAudience: AnnouncementAudience = 'ALL';
  formPriority: AnnouncementPriority = 'NORMAL';
  formExpiresAt: string | null = null;

  ngOnInit() {
    this.load();
  }

  async load() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const response = await firstValueFrom(
        this.api.list({
          audience: this.audienceFilter() || undefined,
          priority: this.priorityFilter() || undefined,
          status: this.statusFilter() || undefined,
          search: this.searchTerm() || undefined,
        }),
      );
      const data = response?.results ?? (Array.isArray(response) ? response : []);
      this.items.set(data as AnnouncementItem[]);
    } catch (err: unknown) {
      this.error.set('No pudimos cargar los comunicados. Intenta de nuevo.');
    } finally {
      this.loading.set(false);
    }
  }

  resetFilters() {
    this.audienceFilter.set('');
    this.priorityFilter.set('');
    this.statusFilter.set('');
    this.searchTerm.set('');
    this.load();
  }

  openCreateModal() {
    this.editingItem.set(null);
    this.formTitle = '';
    this.formBody = '';
    this.formAudience = 'ALL';
    this.formPriority = 'NORMAL';
    this.formExpiresAt = null;
    this.formError.set(null);
    this.isFormOpen.set(true);
  }

  openEditModal(item: AnnouncementItem) {
    this.editingItem.set(item);
    this.formTitle = item.title;
    this.formBody = item.body;
    this.formAudience = item.audience;
    this.formPriority = item.priority;
    this.formExpiresAt = item.expires_at ? item.expires_at.slice(0, 16) : null;
    this.formError.set(null);
    this.isFormOpen.set(true);
  }

  closeModal() {
    this.isFormOpen.set(false);
    this.editingItem.set(null);
  }

  async saveAnnouncement(publishNow: boolean = false) {
    if (!this.formTitle.trim()) {
      this.formError.set('Ingresa un título para el comunicado.');
      return;
    }
    if (!this.formBody.trim()) {
      this.formError.set('Ingresa el contenido del comunicado.');
      return;
    }

    this.formSubmitting.set(true);
    this.formError.set(null);

    const dto: CreateAnnouncementDto = {
      title: this.formTitle.trim(),
      body: this.formBody.trim(),
      audience: this.formAudience,
      priority: this.formPriority,
      status: publishNow ? 'PUBLISHED' : 'DRAFT',
      expires_at: this.formExpiresAt ? new Date(this.formExpiresAt).toISOString() : null,
    };

    try {
      const current = this.editingItem();
      if (current) {
        await firstValueFrom(this.api.update(current.id, dto));
        this.successNotice.set('Comunicado actualizado correctamente.');
      } else {
        await firstValueFrom(this.api.create(dto));
        this.successNotice.set(
          publishNow
            ? 'Comunicado publicado y notificaciones enviadas a la audiencia.'
            : 'Borrador guardado exitosamente.',
        );
      }
      this.closeModal();
      this.load();
    } catch (err: unknown) {
      this.formError.set('No pudimos guardar el comunicado. Verifica los datos.');
    } finally {
      this.formSubmitting.set(false);
    }
  }

  async publishItem(item: AnnouncementItem) {
    try {
      await firstValueFrom(this.api.publish(item.id));
      this.successNotice.set(`"${item.title}" publicado y notificado a los usuarios.`);
      this.load();
    } catch (err) {
      this.error.set('No se pudo publicar el comunicado.');
    }
  }

  async archiveItem(item: AnnouncementItem) {
    try {
      await firstValueFrom(this.api.archive(item.id));
      this.successNotice.set(`"${item.title}" archivado.`);
      this.load();
    } catch (err) {
      this.error.set('No se pudo archivar el comunicado.');
    }
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'URGENT':
        return 'priority-urgent';
      case 'HIGH':
        return 'priority-high';
      case 'NORMAL':
        return 'priority-normal';
      default:
        return 'priority-low';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PUBLISHED':
        return 'status-published';
      case 'DRAFT':
        return 'status-draft';
      case 'ARCHIVED':
        return 'status-archived';
      default:
        return '';
    }
  }
}
