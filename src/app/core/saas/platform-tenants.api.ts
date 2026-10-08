import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiClient } from '../api/api-client.service';
import { API_ENDPOINTS } from '../api/api-endpoints';

/**
 * Un condominio (tenant) tal como lo ve la consola global de la plataforma.
 *
 * `users_count`, `sectors_count`, `units_count`, `residents_count` y
 * `staff_count` llegan calculados por el servidor; el backend los agrega en la
 * misma consulta para no pedir una llamada por condominio.
 */
export interface PlatformTenant {
  id: number;
  name: string;
  slug: string | null;
  status: string;
  is_active: boolean;
  address: string;
  phone: string;
  email: string;
  timezone: string;
  created_at: string;

  users_count: number;
  sectors_count: number;
  units_count: number;
  residents_count: number;
  staff_count: number;

  /** Vacio si el condominio no tiene plan contratado. */
  plan_name: string;
  subscription_status: string;
  subscription_status_display: string;
  is_subscription_valid: boolean;
  /** `null` si no hay suscripcion: "sin plan" no es "plan vencido". */
  days_left: number | null;
  current_period_end: string | null;
}

/** Totales de la plataforma para las tarjetas del encabezado. */
export interface PlatformTenantsSummary {
  tenants: number;
  active_tenants: number;
  inactive_tenants: number;
  with_subscription: number;
  without_subscription: number;
  units: number;
  residents: number;
  staff: number;
  users: number;
}

/** Una pagina del listado, ya normalizada para la tabla. */
export interface PlatformTenantPage {
  rows: PlatformTenant[];
  total: number;
  page: number;
  totalPages: number;
}

export interface PlatformTenantQuery {
  search?: string;
  status?: string;
  subscription_status?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

/** Envoltura cruda del paginador del backend. */
interface PagedResponse {
  count?: number;
  page?: number;
  total_pages?: number;
  results?: PlatformTenant[];
}

/**
 * Cliente de la consola global de tenants.
 *
 * Es estrictamente de lectura: no expone ningun metodo que cree, modifique o
 * elimine tenants. El alta y la edicion siguen correspondiendo al
 * `TenantViewSet` del backend, que exige su propia intencion explicita.
 */
@Injectable({ providedIn: 'root' })
export class PlatformTenantsApi {
  private readonly api = inject(ApiClient);

  list(query: PlatformTenantQuery = {}): Observable<PlatformTenantPage> {
    let params = new HttpParams();
    if (query.search?.trim()) params = params.set('search', query.search.trim());
    if (query.status) params = params.set('status', query.status);
    if (query.subscription_status) params = params.set('subscription_status', query.subscription_status);
    if (query.ordering) params = params.set('ordering', query.ordering);
    if (query.page) params = params.set('page', String(query.page));
    if (query.page_size) params = params.set('page_size', String(query.page_size));

    return this.api
      .get<PagedResponse>(API_ENDPOINTS.saas.platformTenants, { params })
      .pipe(map((response) => normalizePage(response)));
  }

  summary(): Observable<PlatformTenantsSummary> {
    return this.api.get<PlatformTenantsSummary>(API_ENDPOINTS.saas.platformTenantsSummary);
  }
}

/**
 * Normaliza la respuesta a la forma que usa la tabla.
 *
 * Se acepta tambien una lista plana por si el servidor dejara de paginar, para
 * que la pantalla no se quede en blanco ante un cambio de contrato.
 */
function normalizePage(response: PagedResponse | null | undefined): PlatformTenantPage {
  const rows = Array.isArray(response?.results) ? response.results : [];
  return {
    rows,
    total: typeof response?.count === 'number' ? response.count : rows.length,
    page: response?.page ?? 1,
    totalPages: response?.total_pages ?? 1,
  };
}
