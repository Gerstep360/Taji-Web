import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { LogoComponent } from '../ui/logo.component';

@Component({
  selector: 'taji-auth-shell',
  imports: [LogoComponent],
  template: `
    <main class="shell">
      <section class="story" aria-label="Taji, comunidad conectada">
        <header><taji-logo [light]="true" /></header>
        <div class="copy">
          <span class="eyebrow">Tu comunidad, en calma</span>
          <h1>Todo tu condominio,<br><em>más cerca.</em></h1>
          <p>Una experiencia simple y segura para residentes, personal y administración.</p>
        </div>
        <div class="scene" aria-hidden="true">
          <div class="sun"></div>
          <div class="building b1"><i></i><i></i><i></i><i></i></div>
          <div class="building b2"><i></i><i></i><i></i><i></i><i></i><i></i></div>
          <div class="building b3"><i></i><i></i><i></i><i></i></div>
          <div class="garden g1"></div><div class="garden g2"></div>
          <div class="status-card"><span class="check">✓</span><div><b>Acceso protegido</b><small>Tu sesión está segura</small></div></div>
        </div>
        <footer><span></span> Seguridad y confianza para tu hogar</footer>
      </section>
      <section class="content">
        <div class="mobile-brand"><taji-logo /></div>
        <div class="card" [class.wide]="wide"><ng-content /></div>
        <p class="legal">Al continuar aceptas nuestros términos y política de privacidad.</p>
      </section>
    </main>
  `,
  styleUrl: './auth-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthShellComponent {
  @Input() wide = false;
}

