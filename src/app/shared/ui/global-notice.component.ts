import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { GlobalNoticeService } from '../../core/errors/global-notice.service';

@Component({
  selector: 'taji-global-notice',
  template: `
    @if (notice(); as current) {
      <div class="notice" [class.warning]="current.tone === 'warning'" role="alert">
        <span>{{ current.message }}</span>
        <button type="button" aria-label="Cerrar mensaje" (click)="dismiss()">×</button>
      </div>
    }
  `,
  styles: [`
    :host { position:fixed; z-index:1000; top:1rem; right:1rem; width:min(25rem,calc(100vw - 2rem)); }
    .notice { padding:.9rem 1rem; display:flex; align-items:flex-start; gap:1rem; border:1px solid #ffd1d7; border-radius:.9rem; color:#8f2733; background:#fff1f2; box-shadow:0 1rem 2.5rem rgba(45,55,72,.16); font-size:.86rem; line-height:1.45; }
    .notice.warning { color:#7a4b05; border-color:#f5d99e; background:#fff8e8; }
    span { flex:1; }
    button { border:0; padding:0; color:inherit; background:transparent; font-size:1.25rem; line-height:1; cursor:pointer; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobalNoticeComponent {
  private readonly notices = inject(GlobalNoticeService);
  readonly notice = this.notices.notice;

  dismiss(): void {
    this.notices.clear();
  }
}
