import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { finalize } from 'rxjs';

import { apiErrorMessage, apiFieldErrors } from '../../../core/api-error';
import { RolesApi } from './cu2.api';
import { PendingResident, RoleDetail, RolePermission } from './cu2.models';

type ActiveTab = 'roles' | 'residents';

@Component({
  selector: 'taji-cu2-page',
  imports: [],
  template: `
    <section class="roles-page" aria-labelledby="roles-title">
      <header class="page-heading">
        <div>
          <span class="kicker">Administración · CU2</span>
          <h2 id="roles-title">Roles y Permisos</h2>
          <p>Configura permisos por rol y gestiona solicitudes de residentes.</p>
        </div>
      </header>

      <nav class="page-tabs" aria-label="Secciones de administración">
        <button
          type="button"
          class="page-tab"
          [class.active]="activeTab() === 'roles'"
          (click)="activeTab.set('roles')"
        >
          Roles y Permisos
        </button>
        <button
          type="button"
          class="page-tab"
          [class.active]="activeTab() === 'residents'"
          (click)="switchToResidents()"
        >
          Residentes pendientes
          @if (pendingResidents().length > 0) {
            <span class="tab-badge">{{ pendingResidents().length }}</span>
          }
        </button>
      </nav>

      @if (activeTab() === 'roles') {
        @if (loadError()) {
          <div class="notice error" role="alert">
            <span>{{ loadError() }}</span>
            <button type="button" (click)="loadAll()">Reintentar</button>
          </div>
        }

        @if (loadingRoles()) {
          <div class="loading-state" aria-label="Cargando roles">
            <span></span>
            <p>Cargando roles…</p>
          </div>
        } @else {
          <div class="roles-layout">
            <aside class="roles-sidebar" aria-label="Lista de roles">
              <h3>Roles del sistema</h3>
              <ul>
                @for (role of roles(); track role.slug) {
                  <li>
                    <button
                      type="button"
                      [class.active]="selectedRole()?.slug === role.slug"
                      (click)="selectRole(role)"
                      [attr.aria-pressed]="selectedRole()?.slug === role.slug"
                    >
                      <strong>{{ role.name }}</strong>
                      <small>{{ role.permissions.length }} permisos</small>
                    </button>
                  </li>
                }
              </ul>
            </aside>

            <div class="permissions-panel">
              @if (!selectedRole()) {
                <div class="empty-state">
                  <span>⊙</span>
                  <h3>Selecciona un rol</h3>
                  <p>Elige un rol de la lista para ver y editar sus permisos.</p>
                </div>
              } @else {
                <div class="panel-header">
                  <div>
                    <h3>{{ selectedRole()!.name }}</h3>
                    <p>{{ selectedRole()!.description }}</p>
                  </div>
                  <button
                    class="primary-action"
                    type="button"
                    [disabled]="saving() || !isDirty()"
                    (click)="saveChanges()"
                  >
                    @if (saving()) {
                      Guardando…
                    } @else {
                      Guardar cambios
                    }
                  </button>
                </div>

                @if (saveSuccess()) {
                  <div class="notice success" role="status">
                    <span aria-hidden="true">✓</span>Permisos actualizados correctamente.
                  </div>
                }
                @if (saveError()) {
                  <div class="notice error" role="alert">
                    <span>{{ saveError() }}</span>
                    <button type="button" (click)="clearSaveError()">✕</button>
                  </div>
                }

                @if (loadingPermissions()) {
                  <div class="loading-state" aria-label="Cargando permisos">
                    <span></span>
                    <p>Cargando permisos…</p>
                  </div>
                } @else {
                  @for (group of permissionGroups(); track group.module) {
                    <section class="permission-group" [attr.aria-label]="'Módulo ' + group.module">
                      <h4 class="group-title">{{ group.module }}</h4>
                      <ul class="permission-list">
                        @for (perm of group.permissions; track perm.code) {
                          <li class="permission-item" [class.forbidden]="isForbidden(perm.code)">
                            <label [class.disabled-label]="isForbidden(perm.code) || isMandatory(perm.code)">
                              <input
                                type="checkbox"
                                [checked]="isChecked(perm.code)"
                                [disabled]="isForbidden(perm.code) || isMandatory(perm.code)"
                                (change)="togglePermission(perm.code, $event)"
                              />
                              <div class="perm-info">
                                <span class="perm-name">{{ perm.name }}</span>
                                <code class="perm-code">{{ perm.code }}</code>
                                @if (isMandatory(perm.code)) {
                                  <span class="badge mandatory">Obligatorio</span>
                                }
                                @if (isForbidden(perm.code)) {
                                  <span class="badge forbidden">Restringido</span>
                                }
                              </div>
                            </label>
                          </li>
                        }
                      </ul>
                    </section>
                  }
                }
              }
            </div>
          </div>
        }
      }

      @if (activeTab() === 'residents') {
        <div class="residents-section">
          @if (residentsError()) {
            <div class="notice error" role="alert">
              <span>{{ residentsError() }}</span>
              <button type="button" (click)="loadPendingResidents()">Reintentar</button>
            </div>
          }

          @if (reviewNotice()) {
            <div class="notice success" role="status">
              <span aria-hidden="true">✓</span>{{ reviewNotice() }}
            </div>
          }

          @if (loadingResidents()) {
            <div class="loading-state" aria-label="Cargando residentes">
              <span></span>
              <p>Cargando residentes pendientes…</p>
            </div>
          } @else if (pendingResidents().length === 0) {
            <div class="empty-state">
              <span>✓</span>
              <h3>Sin solicitudes pendientes</h3>
              <p>No hay residentes esperando aprobación en este momento.</p>
            </div>
          } @else {
            <div class="residents-panel">
              <div class="panel-header">
                <div>
                  <h3>Solicitudes de Residentes</h3>
                  <p>Aprueba o rechaza las solicitudes de registro recibidas.</p>
                </div>
              </div>
              <table class="residents-table" aria-label="Residentes pendientes de aprobación">
                <thead>
                  <tr>
                    <th scope="col">Nombre</th>
                    <th scope="col">Correo</th>
                    <th scope="col">Registrado</th>
                    <th scope="col">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  @for (resident of pendingResidents(); track resident.id) {
                    <tr>
                      <td>{{ resident.full_name }}</td>
                      <td class="resident-email">{{ resident.email }}</td>
                      <td class="resident-date">{{ resident.date_joined.substring(0, 10) }}</td>
                      <td class="resident-actions">
                        <button
                          type="button"
                          class="action-btn approve"
                          [disabled]="reviewingId() === resident.id"
                          (click)="approveResident(resident.id)"
                        >
                          @if (reviewingId() === resident.id) { … } @else { Aprobar }
                        </button>
                        <button
                          type="button"
                          class="action-btn reject"
                          [disabled]="reviewingId() === resident.id"
                          (click)="rejectResident(resident.id)"
                        >
                          Rechazar
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }
    </section>
  `,
  styleUrl: './cu2.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Cu2Page implements OnInit {
  private readonly api = inject(RolesApi);

  // ── Roles tab ────────────────────────────────────────────────────────────
  readonly roles = signal<RoleDetail[]>([]);
  readonly allPermissions = signal<RolePermission[]>([]);
  readonly selectedRole = signal<RoleDetail | null>(null);
  readonly pendingCodes = signal<Set<string>>(new Set());

  readonly loadingRoles = signal(false);
  readonly loadingPermissions = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly saveError = signal<string | null>(null);
  readonly saveSuccess = signal(false);

  // ── Residents tab ────────────────────────────────────────────────────────
  readonly activeTab = signal<ActiveTab>('roles');
  readonly pendingResidents = signal<PendingResident[]>([]);
  readonly loadingResidents = signal(false);
  readonly residentsError = signal<string | null>(null);
  readonly reviewNotice = signal<string | null>(null);
  readonly reviewingId = signal<number | null>(null);

  // ── Computed ─────────────────────────────────────────────────────────────
  readonly isDirty = computed(() => {
    const role = this.selectedRole();
    if (!role) return false;
    const original = new Set(role.permissions.map((p) => p.code));
    const pending = this.pendingCodes();
    if (original.size !== pending.size) return true;
    for (const code of original) {
      if (!pending.has(code)) return true;
    }
    return false;
  });

  readonly permissionGroups = computed(() => {
    const groups = new Map<string, RolePermission[]>();
    for (const perm of this.allPermissions()) {
      const module = perm.module ?? 'general';
      if (!groups.has(module)) groups.set(module, []);
      groups.get(module)!.push(perm);
    }
    return Array.from(groups.entries()).map(([module, permissions]) => ({ module, permissions }));
  });

  ngOnInit(): void {
    this.loadAll();
    this.loadPendingResidents();
  }

  // ── Roles tab methods ─────────────────────────────────────────────────────
  loadAll(): void {
    this.loadError.set(null);
    this.loadingRoles.set(true);
    this.api
      .listRoles()
      .pipe(finalize(() => this.loadingRoles.set(false)))
      .subscribe({
        next: (roles) => this.roles.set(roles),
        error: (err) => this.loadError.set(apiErrorMessage(err) ?? 'Error cargando roles.'),
      });
    this.api.listPermissions().subscribe({
      next: (perms) => this.allPermissions.set(perms),
    });
  }

  selectRole(role: RoleDetail): void {
    this.saveSuccess.set(false);
    this.saveError.set(null);
    this.loadingPermissions.set(true);
    this.api
      .getRolePermissions(role.slug)
      .pipe(finalize(() => this.loadingPermissions.set(false)))
      .subscribe({
        next: (detail) => {
          this.selectedRole.set(detail);
          this.pendingCodes.set(new Set(detail.permissions.map((p) => p.code)));
        },
        error: (err) =>
          this.saveError.set(apiErrorMessage(err) ?? 'Error cargando permisos del rol.'),
      });
  }

  isChecked(code: string): boolean {
    return this.pendingCodes().has(code);
  }

  isMandatory(code: string): boolean {
    const slug = this.selectedRole()?.slug;
    if (!slug) return false;
    const mandatory: Record<string, string[]> = {
      administrador: ['manage_roles'],
    };
    return mandatory[slug]?.includes(code) ?? false;
  }

  isForbidden(code: string): boolean {
    const slug = this.selectedRole()?.slug;
    if (!slug) return false;
    const SECURITY_EXCLUSIVE = new Set([
      'validate_visits', 'register_entry_exit', 'capture_security_evidence', 'manage_shift_handover',
    ]);
    const EMPLOYEE_EXCLUSIVE = new Set([
      'view_assigned_work_orders', 'update_work_order_status', 'attach_work_evidence',
      'maintain_assets', 'view_assigned_cleaning_tasks', 'report_detected_issues',
      'complete_cleaning_tasks', 'access_assigned_external_orders',
    ]);
    const DIRECTIVA_FORBIDDEN = new Set([
      'manage_residents', 'manage_units', 'manage_staff', 'manage_incidents',
      'manage_maintenance', 'manage_visits', 'manage_reservations', 'manage_announcements',
      'manage_settings', 'manage_roles', 'register_visits', 'validate_visits',
      'register_entry_exit', 'capture_security_evidence', 'manage_shift_handover',
      'update_work_order_status', 'attach_work_evidence', 'maintain_assets',
      'report_detected_issues', 'complete_cleaning_tasks', 'access_assigned_external_orders',
      'report_incidents', 'reserve_areas',
    ]);
    const ADMIN_ONLY = new Set(['manage_roles']);

    switch (slug) {
      case 'seguridad':
        return ADMIN_ONLY.has(code) || code === 'register_visits' || EMPLOYEE_EXCLUSIVE.has(code);
      case 'directiva':
        return DIRECTIVA_FORBIDDEN.has(code);
      case 'mantenimiento':
      case 'limpieza':
      case 'proveedor-externo':
        return ADMIN_ONLY.has(code) || code === 'register_visits' || SECURITY_EXCLUSIVE.has(code);
      case 'residente':
        return ADMIN_ONLY.has(code) || SECURITY_EXCLUSIVE.has(code);
      case 'administrador':
        return false;
      default:
        return false;
    }
  }

  togglePermission(code: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const current = new Set(this.pendingCodes());
    if (checked) {
      current.add(code);
    } else {
      current.delete(code);
    }
    this.pendingCodes.set(current);
  }

  saveChanges(): void {
    const role = this.selectedRole();
    if (!role) return;
    this.saving.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(false);
    this.api
      .updateRolePermissions(role.slug, { permissions: Array.from(this.pendingCodes()) })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (updated) => {
          this.selectedRole.set(updated);
          this.pendingCodes.set(new Set(updated.permissions.map((p) => p.code)));
          this.roles.update((list) =>
            list.map((r) => (r.slug === updated.slug ? updated : r)),
          );
          this.saveSuccess.set(true);
        },
        error: (err) => {
          const fields = apiFieldErrors(err);
          const fieldMsg = fields?.['permissions']?.[0];
          this.saveError.set(
            fieldMsg ?? apiErrorMessage(err) ?? 'Error al guardar los permisos.',
          );
        },
      });
  }

  clearSaveError(): void {
    this.saveError.set(null);
  }

  // ── Residents tab methods ─────────────────────────────────────────────────
  switchToResidents(): void {
    this.activeTab.set('residents');
    this.reviewNotice.set(null);
  }

  loadPendingResidents(): void {
    this.residentsError.set(null);
    this.loadingResidents.set(true);
    this.api
      .listPendingResidents()
      .pipe(finalize(() => this.loadingResidents.set(false)))
      .subscribe({
        next: (residents) => this.pendingResidents.set(residents),
        error: (err) => this.residentsError.set(apiErrorMessage(err) ?? 'Error cargando residentes.'),
      });
  }

  approveResident(id: number): void {
    this.reviewNotice.set(null);
    this.reviewingId.set(id);
    this.api
      .reviewResident(id, 'approve')
      .pipe(finalize(() => this.reviewingId.set(null)))
      .subscribe({
        next: () => {
          this.pendingResidents.update((list) => list.filter((r) => r.id !== id));
          this.reviewNotice.set('Residente aprobado correctamente.');
        },
        error: (err) => this.residentsError.set(apiErrorMessage(err) ?? 'Error al aprobar.'),
      });
  }

  rejectResident(id: number): void {
    this.reviewNotice.set(null);
    this.reviewingId.set(id);
    this.api
      .reviewResident(id, 'reject')
      .pipe(finalize(() => this.reviewingId.set(null)))
      .subscribe({
        next: () => {
          this.pendingResidents.update((list) => list.filter((r) => r.id !== id));
          this.reviewNotice.set('Solicitud rechazada.');
        },
        error: (err) => this.residentsError.set(apiErrorMessage(err) ?? 'Error al rechazar.'),
      });
  }
}
