import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { LogoComponent } from '../../shared/ui/logo.component';

type ErrorPageData = {
  code: string;
  title: string;
  message: string;
};

@Component({
  selector: 'taji-system-error-page',
  imports: [LogoComponent, RouterLink],
  template: `
    <main>
      <taji-logo />
      <section>
        <span>{{ page.code }}</span>
        <h1>{{ page.title }}</h1>
        <p>{{ page.message }}</p>
        <a routerLink="/inicio">Volver al inicio</a>
      </section>
    </main>
  `,
  styles: [`
    :host { min-height:100dvh; display:block; background:var(--taji-canvas); }
    main { min-height:100dvh; padding:clamp(1.5rem,5vw,4rem); display:flex; flex-direction:column; }
    section { width:min(34rem,100%); margin:auto; padding:clamp(1.5rem,4vw,3rem); border:1px solid var(--taji-border); border-radius:1.5rem; background:white; text-align:center; box-shadow:0 1.5rem 4rem rgba(36,61,95,.1); }
    section>span { color:var(--taji-primary); font-size:3.5rem; font-weight:850; letter-spacing:-.06em; }
    h1 { margin:.6rem 0; font-size:clamp(1.6rem,4vw,2.3rem); letter-spacing:-.04em; }
    p { margin:0 auto 1.6rem; max-width:27rem; color:var(--taji-muted); line-height:1.6; }
    a { min-height:3rem; padding:.7rem 1.2rem; display:inline-flex; align-items:center; border-radius:.9rem; color:white; background:var(--taji-primary); text-decoration:none; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SystemErrorPage {
  readonly page = inject(ActivatedRoute).snapshot.data as ErrorPageData;
}
