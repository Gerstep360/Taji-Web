import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'taji-password-meter',
  template: `
    <div class="meter" aria-live="polite">
      <div class="bars" aria-hidden="true">
        @for (item of [1, 2, 3, 4]; track item) { <span [class.active]="score >= item"></span> }
      </div>
      <span>{{ label }}</span>
    </div>
  `,
  styles: [`
    .meter { display:flex; align-items:center; gap:.75rem; color:var(--taji-muted); font-size:.76rem; }
    .bars { flex:1; display:grid; grid-template-columns:repeat(4,1fr); gap:.28rem; }
    .bars span { height:.25rem; border-radius:1rem; background:var(--taji-border); transition:background .2s ease; }
    .bars span.active { background:var(--meter-color,#f59e0b); }
  `],
  host: { '[style.--meter-color]': 'color' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordMeterComponent {
  @Input() password = '';

  get score(): number {
    let value = 0;
    if (this.password.length >= 10) value++;
    if (/[a-z]/.test(this.password) && /[A-Z]/.test(this.password)) value++;
    if (/\d/.test(this.password)) value++;
    if (/[^A-Za-z0-9]/.test(this.password)) value++;
    return value;
  }

  get label(): string {
    return ['Usa al menos 10 caracteres', 'Básica', 'Buena', 'Fuerte', 'Muy fuerte'][this.score];
  }

  get color(): string {
    return ['#cbd5e1', '#ef4444', '#f59e0b', '#20a874', '#0f6fff'][this.score];
  }
}
