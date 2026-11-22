import { HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client.service';
import { API_ENDPOINTS } from '../../../core/api/api-endpoints';
import { HANDLE_ERRORS_LOCALLY } from '../../../core/errors/api-error.interceptor';
import { IncidentReport, IncidentReportDraft, IncidentReportOptions } from './registrar-incidencia.models';

@Injectable({ providedIn: 'root' })
export class RegistrarIncidenciaApi {
  private readonly api = inject(ApiClient);

  options(): Observable<IncidentReportOptions> {
    return this.api.get<IncidentReportOptions>(API_ENDPOINTS.incidents.options, { context: localErrors() });
  }

  /**
   * Envía la incidencia como multipart. Solo viajan los campos que el usuario
   * decide: prioridad, reportante, condominio y estado los fija el backend.
   */
  create(draft: IncidentReportDraft): Observable<IncidentReport> {
    const body = new FormData();
    const title = draft.title.trim();
    if (title) body.append('title', title);
    body.append('description', draft.description.trim());
    body.append('category', String(draft.category));
    body.append('sector', String(draft.sector));
    if (draft.unit !== null) body.append('unit', String(draft.unit));
    if (draft.asset !== null) body.append('asset', String(draft.asset));
    for (const file of draft.evidences) body.append('evidences', file, file.name);

    return this.api.post<FormData, IncidentReport>(API_ENDPOINTS.incidents.root, body, {
      context: localErrors(),
    });
  }
}

/** La pantalla muestra el 403/503 sin redirigir, para no perder el formulario. */
function localErrors(): HttpContext {
  return new HttpContext().set(HANDLE_ERRORS_LOCALLY, true);
}
