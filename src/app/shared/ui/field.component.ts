import { ChangeDetectionStrategy, Component, forwardRef, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

let nextId = 0;

@Component({
  selector: 'taji-field',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => FieldComponent), multi: true }],
  template: `
    <label [for]="inputId">{{ label }}</label>
    <div class="control" [class.invalid]="error">
      <span class="icon" aria-hidden="true">
        @switch (icon) {
          @case ('mail') { <svg viewBox="0 0 24 24"><path d="M4 6h16v12H4zM4 7l8 6 8-6"/></svg> }
          @case ('lock') { <svg viewBox="0 0 24 24"><path d="M6 10h12v10H6zM8.5 10V7.5a3.5 3.5 0 0 1 7 0V10M12 14v2"/></svg> }
          @case ('phone') { <svg viewBox="0 0 24 24"><path d="M7 3H4.5A1.5 1.5 0 0 0 3 4.5C3 13.6 10.4 21 19.5 21a1.5 1.5 0 0 0 1.5-1.5V17l-4-1-1.4 2a14.8 14.8 0 0 1-9.6-9.6L8 7 7 3Z"/></svg> }
          @default { <svg viewBox="0 0 24 24"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 8a7 7 0 0 0-14 0"/></svg> }
        }
      </span>
      <input
        [id]="inputId"
        [type]="visible ? 'text' : type"
        [value]="value"
        [placeholder]="placeholder"
        [autocomplete]="autocomplete"
        [disabled]="disabled"
        [attr.aria-invalid]="!!error"
        [attr.aria-describedby]="error ? inputId + '-error' : hint ? inputId + '-hint' : null"
        (input)="handleInput($event)"
        (blur)="onTouched()"
      />
      @if (type === 'password') {
        <button class="reveal" type="button" (click)="visible = !visible" [attr.aria-label]="visible ? 'Ocultar contraseña' : 'Mostrar contraseña'">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Zm9.5 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/></svg>
        </button>
      }
    </div>
    @if (error) { <p class="error" [id]="inputId + '-error'">{{ error }}</p> }
    @else if (hint) { <p class="hint" [id]="inputId + '-hint'">{{ hint }}</p> }
  `,
  styles: [`
    :host { display:block; }
    label { display:block; margin:0 0 .48rem .08rem; color:var(--taji-ink); font-size:.84rem; font-weight:680; }
    .control { min-height:3.18rem; padding:0 .9rem; display:flex; align-items:center; gap:.68rem; border:1px solid var(--taji-border); border-radius:.95rem; background:#fff; transition:border-color .18s ease,box-shadow .18s ease; }
    .control:focus-within { border-color:var(--taji-primary); box-shadow:0 0 0 4px var(--taji-focus); }
    .control.invalid { border-color:#e45e6b; }
    .icon { width:1.13rem; height:1.13rem; color:#8a99ac; flex:0 0 auto; }
    svg { width:100%; height:100%; fill:none; stroke:currentColor; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }
    input { min-width:0; flex:1; border:0; outline:0; background:transparent; color:var(--taji-ink); font:inherit; font-size:.94rem; }
    input::placeholder { color:#a4afbd; }
    .reveal { width:2rem; height:2rem; padding:.36rem; border:0; background:transparent; color:#8190a4; cursor:pointer; border-radius:.55rem; }
    .reveal:focus-visible { outline:2px solid var(--taji-primary); }
    .error,.hint { margin:.38rem 0 0 .08rem; font-size:.76rem; line-height:1.35; }
    .error { color:#b43c49; } .hint { color:var(--taji-muted); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FieldComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() type: 'text' | 'email' | 'password' | 'tel' = 'text';
  @Input() placeholder = '';
  @Input() autocomplete = '';
  @Input() icon: 'user' | 'mail' | 'lock' | 'phone' = 'user';
  @Input() hint = '';
  @Input() error = '';

  readonly inputId = `taji-field-${nextId++}`;
  value = '';
  disabled = false;
  visible = false;
  private onChange: (value: string) => void = () => undefined;
  onTouched: () => void = () => undefined;

  writeValue(value: string | null): void { this.value = value ?? ''; }
  registerOnChange(fn: (value: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void { this.disabled = disabled; }
  handleInput(event: Event): void {
    this.value = (event.target as HTMLInputElement).value;
    this.onChange(this.value);
  }
}
