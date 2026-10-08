import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import { ApiClient } from '../../../core/api/api-client.service';
import { apiErrorMessage, apiErrorMessageWithTrace } from '../../../core/api-error';
import { VisitantesApi } from '../cu08_visitantes/visitantes.api';
import { VisitAuthorization } from '../cu08_visitantes/visitantes.models';

export interface VisitQrDetail {
  id?: number;
  authorization_id?: number;
  authorization?: any;
  issued?: boolean;
  active?: boolean;
  payload?: string | null;
  expires_in_seconds?: number;
  image_format?: string;
  image_media_type?: string;
  image_base64?: string | null;
  rotated?: boolean;
}

@Component({
  selector: 'app-pases-qr-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pases-qr.page.html',
  styleUrls: ['./pases-qr.page.scss'],
})
export class PasesQrPage implements OnInit {
  private readonly api = inject(ApiClient);
  private readonly visitantesApi = inject(VisitantesApi);
  private readonly destroyRef = inject(DestroyRef);

  readonly visits = signal<VisitAuthorization[]>([]);
  readonly loadingVisits = signal<boolean>(false);
  readonly selectedVisit = signal<VisitAuthorization | null>(null);

  readonly qrDetail = signal<VisitQrDetail | null>(null);
  readonly loadingQr = signal<boolean>(false);
  readonly isRotating = signal<boolean>(false);
  readonly successMsg = signal<string | null>(null);
  readonly errorMsg = signal<string | null>(null);
  readonly copiedToken = signal<boolean>(false);

  // Filters
  readonly searchTerm = signal<string>('');
  readonly filterStatus = signal<string>('ALL');

  readonly filteredVisits = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const status = this.filterStatus();
    let list = this.visits();

    if (status !== 'ALL') {
      list = list.filter((v) => v.status === status);
    }

    if (term) {
      list = list.filter((v) => {
        const name = (v.visitor?.full_name || '').toLowerCase();
        const doc = (v.visitor?.document_number || '').toLowerCase();
        const unit = (v.unit_detail?.code || String(v.unit || '')).toLowerCase();
        const resident = (v.resident?.full_name || '').toLowerCase();
        const purpose = (v.purpose || '').toLowerCase();
        return (
          name.includes(term) ||
          doc.includes(term) ||
          unit.includes(term) ||
          resident.includes(term) ||
          purpose.includes(term)
        );
      });
    }

    return list;
  });

  ngOnInit(): void {
    this.loadVisits();
  }

  loadVisits(): void {
    this.loadingVisits.set(true);
    this.errorMsg.set(null);
    this.visitantesApi
      .list({ page_size: 100 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const items = res.results || [];
          this.visits.set(items);
          this.loadingVisits.set(false);

          if (items.length > 0 && !this.selectedVisit()) {
            this.selectVisit(items[0]);
          }
        },
        error: (reason: unknown) => {
          this.errorMsg.set(
            apiErrorMessage(reason, 'No fue posible cargar el listado de visitas.'),
          );
          this.loadingVisits.set(false);
        },
      });
  }

  selectVisit(visit: VisitAuthorization): void {
    this.selectedVisit.set(visit);
    this.errorMsg.set(null);
    this.successMsg.set(null);
    this.copiedToken.set(false);
    this.generateOrFetchQr(visit.id, true);
  }

  generateOrFetchQr(visitId: number, isManualRefresh = false): void {
    if (isManualRefresh) {
      this.isRotating.set(true);
    } else {
      this.loadingQr.set(true);
    }
    this.errorMsg.set(null);

    // Siempre enviamos force: true para que el backend entregue el payload y el SVG del código QR en vivo
    this.api
      .post<any, VisitQrDetail>(`/visit-qr/${visitId}/generate/?image_format=svg`, {
        force: true,
        image_format: 'svg',
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (qr) => {
          this.qrDetail.set(qr);
          this.loadingQr.set(false);
          this.isRotating.set(false);
          if (isManualRefresh) {
            this.successMsg.set('Pase QR generado y actualizado con éxito.');
          }
        },
        error: (reason: unknown) => {
          // El backend explica por que no emite (visita expirada, cancelada, fuera
          // de ventana). Ese motivo se conservaba en un 400 y se reemplazaba por un
          // texto generico, dejando al usuario sin saber que corregir.
          //
          // Con `apiErrorMessageWithTrace`, un 503/500 añade el `trace_id` del
          // servidor: sin el, quien ve el fallo no puede decir cual fue.
          const motivo = apiErrorMessageWithTrace(
            reason,
            'No se pudo generar el pase QR. Verifique el estado de la visita.',
          );

          // Fallback a consulta directa si la visita está finalizada o expirada
          this.api
            .get<VisitQrDetail>(`/visit-qr/${visitId}/`)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: (qr) => {
                this.qrDetail.set(qr);
                this.loadingQr.set(false);
                this.isRotating.set(false);
                // La consulta directa no devuelve la imagen: el token en claro solo
                // existe durante la emision. Sin este aviso el panel aparecia vacio
                // sin explicar la causa.
                this.errorMsg.set(
                  qr.issued
                    ? motivo
                    : `${motivo} Esta visita todavía no tiene un pase QR emitido.`,
                );
              },
              error: () => {
                this.errorMsg.set(motivo);
                this.loadingQr.set(false);
                this.isRotating.set(false);
              },
            });
        },
      });
  }

  getQrImageSrc(): string | null {
    const qr = this.qrDetail();
    if (!qr || !qr.image_base64) return null;
    const media = qr.image_media_type || 'image/svg+xml';
    return `data:${media};base64,${qr.image_base64}`;
  }

  copyToken(): void {
    const payload = this.qrDetail()?.payload;
    if (!payload) return;
    navigator.clipboard.writeText(payload).then(() => {
      this.copiedToken.set(true);
      setTimeout(() => this.copiedToken.set(false), 2500);
    });
  }

  downloadQr(): void {
    const qr = this.qrDetail();
    if (!qr || !qr.image_base64) return;
    const visit = this.selectedVisit();
    const visitorName = visit?.visitor?.full_name?.replace(/\s+/g, '_') || 'visita';
    const link = document.createElement('a');
    link.href = `data:${qr.image_media_type || 'image/svg+xml'};base64,${qr.image_base64}`;
    link.download = `pase_qr_${visitorName}_${visit?.unit_detail?.code || 'taji'}.svg`;
    link.click();
  }
}


