import { HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ApiClient, KEEP_PAGE_ON_SERVER_ERROR } from '../../core/api/api-client.service';
import { Kind } from './operations-config';

export interface RecordInput {
  title: string; date: string; status: string;
  details: Record<string, string | number | Record<string, string>>;
}
export interface OperationsRecord extends RecordInput { id: number; kind: Kind }
export interface Listing { count: number; next: string | null; previous: string | null; results: OperationsRecord[] }
export interface Analysis {
  ids: number[]; message?: string;
  suggestion: { summary: string; actions: string[] } | null;
  facts: {
    options?: { option: string; amount: string; currency: string; delivery_days: number; warranty_months: number }[];
    lowest_amount?: string;
    checks?: Record<string, string>;
  };
}

@Injectable({ providedIn: 'root' })
export class OperationsApi {
  private readonly http = inject(ApiClient);
  private readonly opts = { context: new HttpContext().set(KEEP_PAGE_ON_SERVER_ERROR, true) };
  private url(kind: Kind) { return `/operations/${kind}/`; }
  list(kind: Kind, page: number, query: string, status: string) {
    const params = new HttpParams({ fromObject: { page, q: query, status } });
    return this.http.get<Listing>(this.url(kind), { ...this.opts, params });
  }
  save(kind: Kind, data: RecordInput, id?: number) {
    return id === undefined
      ? this.http.post<RecordInput, OperationsRecord>(this.url(kind), data, this.opts)
      : this.http.put<RecordInput, OperationsRecord>(`${this.url(kind)}${id}/`, data, this.opts);
  }
  remove(kind: Kind, id: number) { return this.http.delete<void>(`${this.url(kind)}${id}/`, this.opts); }
  analyze(kind: Kind, ids: number[]) {
    return this.http.post<{ ids: number[] }, Analysis>(`${this.url(kind)}analyze/`, { ids }, this.opts, 24000);
  }
}
