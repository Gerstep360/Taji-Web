import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { AppConfigService } from '../../../core/api/app-config.service';
import { IconComponent } from '../../../shared/ui/icon.component';
import { IncidentEvidence } from './incident-evidence.model';

@Component({
  selector: 'taji-incident-evidence',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './incident-evidence.component.html',
  styleUrl: './incident-evidence.component.scss',
})
export class IncidentEvidenceComponent {
  readonly attachments = input<IncidentEvidence[]>([]);
  private readonly config = inject(AppConfigService);
  private readonly injector = inject(Injector);
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('viewer');
  readonly failures = signal<Set<number>>(new Set());
  readonly selectedIndex = signal<number | null>(null);
  readonly photos = computed(() => (this.attachments() || []).filter((a) => this.isImage(a)));
  readonly documents = computed(() => (this.attachments() || []).filter((a) => !this.isImage(a)));
  readonly selected = computed(() => {
    const index = this.selectedIndex();
    return index === null ? null : this.photos()[index] || null;
  });
  private opener: HTMLElement | null = null;
  constructor() {
    inject(DestroyRef).onDestroy(() => this.dialog()?.nativeElement.close());
  }
  isImage(file: IncidentEvidence) {
    return file.file_type === 'IMAGE' || file.file_type_display?.toLowerCase() === 'imagen';
  }
  safeUrl(value?: string | null): string | null {
    if (!value) return null;
    try {
      const base = this.config.config().apiBaseUrl;
      const url = new URL(value, window.location.origin);
      const api = new URL(base);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
      if (url.origin !== api.origin && url.origin !== window.location.origin) return null;
      return url.href;
    } catch {
      return null;
    }
  }
  preview(file: IncidentEvidence) {
    return this.safeUrl(file.preview_url);
  }
  fail(id: number) {
    this.failures.update((ids) => new Set(ids).add(id));
  }
  retry(id: number) {
    this.failures.update((ids) => {
      const next = new Set(ids);
      next.delete(id);
      return next;
    });
  }
  open(index: number) {
    this.opener = document.activeElement as HTMLElement;
    this.selectedIndex.set(index);
    afterNextRender(
      () => {
        const dialog = this.dialog()?.nativeElement;
        if (dialog && !dialog.open) dialog.showModal();
      },
      { injector: this.injector },
    );
  }
  close() {
    this.dialog()?.nativeElement.close();
  }
  closed() {
    this.selectedIndex.set(null);
    if (this.opener?.isConnected) this.opener.focus();
  }
  move(delta: number) {
    const index = this.selectedIndex();
    if (index !== null)
      this.selectedIndex.set(Math.max(0, Math.min(this.photos().length - 1, index + delta)));
  }
  keydown(event: KeyboardEvent) {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      this.move(event.key === 'ArrowLeft' ? -1 : 1);
    }
  }
}
