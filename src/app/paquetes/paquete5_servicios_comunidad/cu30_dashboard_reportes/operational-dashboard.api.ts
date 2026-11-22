import { HttpContext, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiClient, KEEP_PAGE_ON_SERVER_ERROR } from '../../../core/api/api-client.service';

export const DASHBOARD_ROLES = ['admin', 'administrador', 'superadmin'];

export interface DashboardDates {
  date_from: string;
  date_to: string;
}

export interface DashboardBucket {
  key: string;
  label: string;
  count: number;
}

export interface DashboardDay {
  date: string;
  count: number;
}

interface DashboardDomain {
  total: number;
  date_field: string;
  daily: DashboardDay[];
}

interface DashboardStatuses extends DashboardDomain {
  pending: number;
  by_status: DashboardBucket[];
}

export interface OperationalDashboard {
  context: { mode: 'condominium'; id: number; name: string; timezone: string };
  period: DashboardDates & { as_of: string };
  unit: 'records';
  security: DashboardDomain & {
    entries: number; exits: number; denied: number;
    by_type: DashboardBucket[]; by_result: DashboardBucket[];
  };
  incidents: DashboardStatuses & { resolved: number; by_priority: DashboardBucket[] };
  maintenance: DashboardStatuses & { in_progress: number; completed: number; overdue: number };
  reservations: DashboardStatuses & {
    approved: number; rejected: number; cancelled: number; completed: number; by_area: DashboardBucket[];
  };
  has_data: boolean;
}

@Injectable({ providedIn: 'root' })
export class OperationalDashboardApi {
  private readonly api = inject(ApiClient);

  load(activeTenantId: number, dates: DashboardDates) {
    let params = new HttpParams();
    if (dates.date_from) params = params.set('date_from', dates.date_from);
    if (dates.date_to) params = params.set('date_to', dates.date_to);
    return this.api.get<OperationalDashboard>('/paquete5/cu30/dashboard/', {
      params,
      headers: new HttpHeaders({ 'X-Tenant-ID': String(activeTenantId) }),
      context: new HttpContext().set(KEEP_PAGE_ON_SERVER_ERROR, true),
    });
  }

  switchTenant(tenantId: number) {
    return this.api.post<{ tenant_id: string }, { active_tenant: { id: number; name: string; slug: string } }>(
      '/saas/switch-tenant/',
      { tenant_id: String(tenantId) },
    );
  }
}
