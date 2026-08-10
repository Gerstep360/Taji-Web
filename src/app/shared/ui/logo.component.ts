import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'taji-logo',
  imports: [RouterLink],
  template: `
    <a class="logo" [class.light]="light" [routerLink]="link" aria-label="Taji, ir al inicio">
      <img class="mark" src="/assets/brand/taji-icon.svg" width="44" height="44" alt="" aria-hidden="true" />
      <span class="word">taji</span>
    </a>
  `,
  styles: [`
    :host { display:inline-flex; }
    .logo { display:flex; align-items:center; gap:.58rem; color:inherit; text-decoration:none; }
    .mark { width:2.6rem; height:2.6rem; display:block; filter:drop-shadow(0 6px 10px rgba(7,84,213,.12)); }
    .word { font-size:1.58rem; line-height:1; font-weight:800; letter-spacing:-.05em; }
    .light { color:white; }
    .light .mark { filter:brightness(0) invert(1) drop-shadow(0 6px 10px rgba(0,32,93,.14)); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogoComponent {
  @Input() link = '/';
  @Input() light = false;
}
