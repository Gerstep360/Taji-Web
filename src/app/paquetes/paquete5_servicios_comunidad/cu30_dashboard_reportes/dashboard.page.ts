import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { AuthService } from '../../../core/auth/auth.service';
import { IconComponent } from '../../../shared/ui/icon.component';

@Component({
  selector: 'taji-dashboard-page',
  imports: [IconComponent],
  template: `
    <section class="welcome">
      <div>
        <span class="pill">Acceso confirmado</span>
        <h2>Bienvenido a tu comunidad Taji</h2>
        <p>Tu cuenta está lista. Los módulos del condominio se habilitarán en las siguientes etapas.</p>
      </div>
      <div class="welcome-art" aria-hidden="true"><span></span><i></i><b>✓</b></div>
    </section>
    <section class="stats" aria-label="Resumen de cuenta">
      <article>
        <span class="stat-icon blue"><taji-icon name="shield-check" [size]="18" /></span>
        <div><small>Tu rol</small><b>{{ user()?.role?.name ?? (user()?.is_superuser ? 'Administrador' : 'Sin asignar') }}</b></div>
      </article>
      <article>
        <span class="stat-icon green"><taji-icon name="shield" [size]="18" /></span>
        <div><small>Estado de cuenta</small><b>Activa y protegida</b></div>
      </article>
      <article>
        <span class="stat-icon violet"><taji-icon name="sparkles" [size]="18" /></span>
        <div><small>Permisos preparados</small><b>{{ user()?.role?.permissions?.length ?? (user()?.is_superuser ? 33 : 0) }}</b></div>
      </article>
    </section>
    <section class="content-grid">
      <article class="panel">
        <div class="panel-title"><div><span class="eyebrow">Acceso</span><h3>Permisos de tu rol</h3></div><span class="role-badge">{{ user()?.role?.name ?? (user()?.is_superuser ? 'Administrador' : 'Sin rol') }}</span></div>
        <div class="permissions">
          @for (permission of user()?.role?.permissions ?? []; track permission) { <span>{{ permissionLabel(permission) }}</span> }
          @if ((user()?.role?.permissions?.length ?? 0) === 0 && user()?.is_superuser) {
            <span>Acceso total de Administrador del Sistema</span>
          }
        </div>
      </article>
      <article class="panel profile-panel">
        <div class="panel-title"><div><span class="eyebrow">Cuenta</span><h3>Tus datos</h3></div></div>
        <dl><div><dt>Nombre</dt><dd>{{ user()?.full_name }}</dd></div><div><dt>Correo</dt><dd>{{ user()?.email }}</dd></div><div><dt>Teléfono</dt><dd>{{ user()?.phone || 'No registrado' }}</dd></div></dl>
      </article>
    </section>
    @if (user()?.resident_units?.length) {
      <section class="relationship-grid">
        <article class="panel">
          <div class="panel-title"><div><span class="eyebrow">Tu vivienda</span><h3>Unidades asociadas</h3></div></div>
          <div class="unit-list">
            @for (unit of user()?.resident_units ?? []; track unit.id) {
              <div class="unit-row"><div><strong>{{ unit.unit_code }}</strong><span>{{ unit.relation_type_display }}{{ unit.is_primary ? ' · Principal' : '' }}</span></div><small>Desde {{ unit.start_date }}</small></div>
            }
          </div>
          <p class="helper">La unidad principal es la vivienda que el sistema toma como residencia principal del usuario.</p>
        </article>
        <article class="panel">
          <div class="panel-title"><div><span class="eyebrow">Convivencia</span><h3>Personas vinculadas</h3></div></div>
          @if (user()?.linked_residents?.length) {
            <div class="unit-list">@for (person of user()?.linked_residents ?? []; track person.resident_id + person.unit_code) { <div class="unit-row"><div><strong>{{ person.full_name }}</strong><span>{{ person.relation_type_display }} · {{ person.unit_code }}</span></div></div> }</div>
          } @else { <p class="helper">No hay otras personas asociadas a tus unidades.</p> }
        </article>
      </section>
    }
  `,
  styleUrl: './dashboard.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  private readonly auth = inject(AuthService);
  readonly user = this.auth.user;

  permissionLabel(code: string): string {
    return code.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase());
  }
}
