import { HttpContext, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiClient, KEEP_PAGE_ON_SERVER_ERROR } from '../../../core/api/api-client.service';
import { DashboardDates } from './operational-dashboard.api';

export interface ReportColumn {
  key: string;
  label: string;
  type: string;
  operators: string[];
  choices: { value: string; label: string }[];
}

export interface ReportOrder {
  field: string;
  direction: 'asc' | 'desc';
}

export interface ReportSource {
  key: string;
  label: string;
  description: string;
  date_field: string;
  permissions_any: string[];
  columns: ReportColumn[];
  default_columns: string[];
  sortable: string[];
  default_ordering: ReportOrder[];
  formats: string[];
}

export interface ReportCatalog {
  context: { mode: 'condominium'; id: number; name: string; timezone: string };
  formats: string[];
  export_limits: Record<string, number>;
  sources: ReportSource[];
}

export interface ReportFilter {
  field: string;
  operator: string;
  value: string;
}

export interface ReportQuery extends Partial<DashboardDates> {
  source: string;
  columns: string[];
  filters: ReportFilter[];
  ordering: ReportOrder[];
  page: number;
  page_size: number;
}

export interface ReportPreview {
  source: string;
  title: string;
  columns: ReportColumn[];
  period: DashboardDates & { timezone: string };
  rows: (string | number | boolean | null)[][];
  pagination: { page: number; page_size: number; total: number; pages: number };
  can_export: Record<string, boolean>;
}

@Injectable({ providedIn: 'root' })
export class Cu30ReportsApi {
  private readonly api = inject(ApiClient);
  private readonly base = '/paquete5/cu30/reports/';

  catalog(tenant: number) {
    return this.api.get<ReportCatalog>(this.base + 'catalog/', this.options(tenant));
  }

  preview(tenant: number, query: ReportQuery) {
    return this.api.post<ReportQuery, ReportPreview>(this.base + 'preview/', query, this.options(tenant));
  }

  export(tenant: number, query: ReportQuery, format: string) {
    return this.api.postBlob(this.base + 'export/', { ...query, format }, this.options(tenant));
  }

  private options(tenant: number) {
    return {
      headers: new HttpHeaders({ 'X-Tenant-ID': String(tenant) }),
      context: new HttpContext().set(KEEP_PAGE_ON_SERVER_ERROR, true),
    };
  }
}
