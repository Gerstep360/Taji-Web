import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'taji-alert',
  template: `
    @if (message) {
      <div class="alert" [class.success]="tone === 'success'" [class.info]="tone === 'info'" role="status">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-14v4m0 4h.01"/></svg>
        <span>{{ message }}</span>
      </div>
    }
  `,
  styles: [`
    .alert { display:flex; align-items:flex-start; gap:.7rem; padding:.85rem 1rem; border-radius:.9rem; color:#9f2f3b; background:#fff1f2; border:1px solid #ffd8dd; font-size:.88rem; line-height:1.45; }
    .alert.success { color:#166448; background:#ecfdf5; border-color:#c6f1df; }
    .alert.info { color:#255b9b; background:#eff7ff; border-color:#d5e8ff; }
    svg { width:1.1rem; flex:0 0 auto; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; margin-top:.08rem; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertComponent {
  @Input() message = '';
  @Input() tone: 'error' | 'success' | 'info' = 'error';
}
