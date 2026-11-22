import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { ApiClient } from '../../../core/api/api-client.service';
import { API_ENDPOINTS } from '../../../core/api/api-endpoints';
import {
  Agreement,
  AgreementAttachment,
  AgreementHistoryEntry,
  Assembly,
  AssemblyFilters,
  Paged,
  ResponsibleOption,
} from './asambleas.models';

type Body = Record<string, unknown>;

@Injectable({ providedIn: 'root' })
export class AsambleasApi {
  private readonly api = inject(ApiClient);

  listAssemblies(filters: AssemblyFilters = {}) {
    let params = new HttpParams().set('page_size', '20');
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== '') params = params.set(key, String(value));
    }
    return this.api.get<Paged<Assembly>>(API_ENDPOINTS.assemblies.root, { params });
  }

  createAssembly(payload: Body) {
    return this.api.post<Body, Assembly>(API_ENDPOINTS.assemblies.root, payload);
  }

  updateAssembly(id: number, payload: Body) {
    return this.api.patch<Body, Assembly>(API_ENDPOINTS.assemblies.detail(id), payload);
  }

  startAssembly(id: number) {
    return this.api.post<Body, Assembly>(API_ENDPOINTS.assemblies.start(id), {});
  }

  finishAssembly(id: number, minutesText: string) {
    return this.api.post<Body, Assembly>(API_ENDPOINTS.assemblies.finish(id), { minutes_text: minutesText });
  }

  cancelAssembly(id: number, reason: string) {
    return this.api.post<Body, Assembly>(API_ENDPOINTS.assemblies.cancel(id), { reason });
  }

  assemblyAgreements(id: number) {
    return this.api.get<Agreement[]>(API_ENDPOINTS.assemblies.agreements(id));
  }

  createAgreement(payload: Body) {
    return this.api.post<Body, Agreement>(API_ENDPOINTS.agreements.root, payload);
  }

  updateAgreement(id: number, payload: Body) {
    return this.api.patch<Body, Agreement>(API_ENDPOINTS.agreements.detail(id), payload);
  }

  startAgreement(id: number) {
    return this.api.post<Body, Agreement>(API_ENDPOINTS.agreements.start(id), {});
  }

  completeAgreement(id: number, payload: Body) {
    return this.api.post<Body, Agreement>(API_ENDPOINTS.agreements.complete(id), payload);
  }

  cancelAgreement(id: number, reason: string) {
    return this.api.post<Body, Agreement>(API_ENDPOINTS.agreements.cancel(id), { reason });
  }

  agreementHistory(id: number) {
    return this.api.get<AgreementHistoryEntry[]>(API_ENDPOINTS.agreements.history(id));
  }

  responsibles() {
    return this.api.get<ResponsibleOption[]>(API_ENDPOINTS.agreements.responsibles);
  }

  listAttachments(id: number) {
    return this.api.get<AgreementAttachment[]>(API_ENDPOINTS.agreements.attachments(id));
  }

  uploadAttachment(id: number, file: File, description: string) {
    const form = new FormData();
    form.append('file', file);
    if (description) form.append('description', description);
    return this.api.post<FormData, AgreementAttachment>(API_ENDPOINTS.agreements.attachments(id), form, undefined, 60000);
  }

  deleteAttachment(id: number, attachmentId: number) {
    return this.api.delete<void>(API_ENDPOINTS.agreements.attachment(id, attachmentId));
  }

  downloadAttachment(id: number, attachmentId: number) {
    return this.api.getBlob(API_ENDPOINTS.agreements.downloadAttachment(id, attachmentId));
  }
}
