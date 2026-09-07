import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'taji-logo',
  imports: [RouterLink],
  template: `
    <a class="logo" [class.light]="light" [routerLink]="link" aria-label="Taji, ir al inicio">
      <svg class="mark" viewBox="0 0 64 64" fill="none" role="img" aria-hidden="true">
        <defs>
          <linearGradient id="taji-logo-blue" x1="10" y1="8" x2="54" y2="58" gradientUnits="userSpaceOnUse">
            <stop stop-color="#168CFF" />
            <stop offset="1" stop-color="#0754D5" />
          </linearGradient>
          <filter id="taji-logo-shadow" x="4" y="5" width="56" height="58" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#0754D5" flood-opacity=".22" />
          </filter>
        </defs>
        <g filter="url(#taji-logo-shadow)">
          <path d="M32 5.5 54 17.8v28.4L32 58.5 10 46.2V17.8L32 5.5Z" fill="url(#taji-logo-blue)" />
          <path
            d="M32 10.8 49.5 20.6v22.8L32 53.2l-17.5-9.8V20.6L32 10.8Z"
            stroke="#fff"
            stroke-opacity=".28"
            stroke-width="1.5"
          />
        </g>
        <path
          d="M19.5 23.2 32 16.3l12.5 6.9"
          stroke="#fff"
          stroke-width="4"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path d="M23 27h18" stroke="#fff" stroke-width="4" stroke-linecap="round" />
        <path d="M32 27v18.5" stroke="#fff" stroke-width="4" stroke-linecap="round" />
        <path d="M23 35v8M41 35v8" stroke="#A9D9FF" stroke-width="3" stroke-linecap="round" />
        <circle cx="32" cy="45.5" r="2" fill="#7CE6BC" />
      </svg>
      <span class="word">taji</span>
    </a>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }
      .logo {
        display: flex;
        align-items: center;
        gap: 0.58rem;
        color: inherit;
        text-decoration: none;
      }
      .mark {
        width: 2.6rem;
        height: 2.6rem;
        display: block;
        filter: drop-shadow(0 6px 10px rgba(7, 84, 213, 0.12));
      }
      .word {
        font-size: 1.58rem;
        line-height: 1;
        font-weight: 800;
        letter-spacing: -0.05em;
      }
      .light {
        color: white;
      }
      .light .mark {
        filter: brightness(0) invert(1) drop-shadow(0 6px 10px rgba(0, 32, 93, 0.14));
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogoComponent {
  @Input() link = '/';
  @Input() light = false;
}
