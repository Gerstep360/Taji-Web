import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'taji-button',
  template: `
    <button
      [attr.type]="type"
      [class.secondary]="variant === 'secondary'"
      [class.ghost]="variant === 'ghost'"
      [disabled]="disabled || loading"
      (click)="pressed.emit()"
    >
      @if (loading) { <span class="spinner" aria-hidden="true"></span> }
      <span><ng-content /></span>
    </button>
  `,
  styles: [`
    :host { display:block; }
    button { width:100%; min-height:3.25rem; border:0; border-radius:1rem; padding:.8rem 1.25rem; display:flex; align-items:center; justify-content:center; gap:.65rem; background:linear-gradient(135deg,var(--taji-primary),var(--taji-primary-strong)); color:white; font:inherit; font-weight:720; letter-spacing:-.01em; cursor:pointer; box-shadow:0 12px 24px rgba(15,111,255,.2); transition:transform .18s ease,box-shadow .18s ease,opacity .18s ease; }
    button:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 16px 28px rgba(15,111,255,.27); }
    button:active:not(:disabled) { transform:translateY(0); }
    button:focus-visible { outline:3px solid var(--taji-focus); outline-offset:3px; }
    button:disabled { opacity:.58; cursor:not-allowed; }
    .secondary { color:var(--taji-ink); background:white; border:1px solid var(--taji-border); box-shadow:none; }
    .ghost { color:var(--taji-primary-strong); background:transparent; box-shadow:none; }
    .spinner { width:1rem; height:1rem; border:2px solid rgba(255,255,255,.4); border-top-color:white; border-radius:50%; animation:spin .7s linear infinite; }
    .secondary .spinner,.ghost .spinner { border-color:rgba(15,111,255,.25); border-top-color:var(--taji-primary); }
    @keyframes spin { to { transform:rotate(360deg); } }
    @media (prefers-reduced-motion:reduce) { button { transition:none; } .spinner { animation:none; } }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonComponent {
  @Input() type: 'button' | 'submit' = 'button';
  @Input() variant: 'primary' | 'secondary' | 'ghost' = 'primary';
  @Input() loading = false;
  @Input() disabled = false;
  @Output() readonly pressed = new EventEmitter<void>();
}
