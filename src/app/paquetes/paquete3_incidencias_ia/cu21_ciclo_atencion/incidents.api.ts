import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { ApiClient } from '../../../core/api/api-client.service';
import { API_ENDPOINTS } from '../../../core/api/api-endpoints';

export interface PersonSummary {
  id: number;
  full_name: string;
}
export interface HistoryEntry {
  id: number;
  to_status_display: string;
  comment: string;
  changed_at: string;
  changed_by: PersonSummary | null;
}
export interface CommentEntry {
  id: number;
  body: string;
  visibility: string;
  created_at: string;
  author: PersonSummary | null;
}
export interface IncidentDetail {
  public_code: string;
  title: string;
  description: string;
  status: string;
  status_display: string;
  due_at: string | null;
  is_overdue: boolean;
  current_assignee: PersonSummary | null;
  category: { name: string } | null;
  priority: { name: string } | null;
  status_history: HistoryEntry[];
  public_comments: CommentEntry[];
  internal_comments: CommentEntry[];
  attachments: {
    id: number;
    file_url: string | null;
    file_path: string;
    caption: string;
    file_type_display: string;
  }[];
  assignments: {
    id: number;
    assigned_to: PersonSummary;
    assigned_at: string;
    ended_at: string | null;
    reason: string;
  }[];
  can_modify_target_date: boolean;
  can_view_internal_comments: boolean;
  can_post_internal_comments: boolean;
}
export interface AttentionAlert {
  kind: string;
  code: string;
  title: string;
  due_at: string;
}

@Injectable({ providedIn: 'root' })
export class IncidentsApi {
  private readonly api = inject(ApiClient);
  private readonly root = API_ENDPOINTS.incidents;
  list(filter: string, page: number) {
    let params = new HttpParams().set('page', page);
    if (filter) params = params.set('sla_status', filter);
    return this.api.get<{ results: IncidentDetail[]; pagination: { total_pages: number } }>(
      this.root,
      { params },
    );
  }
  detail(code: string) {
    return this.api.get<IncidentDetail>(this.path(code));
  }
  transitions(code: string) {
    return this.api.get<{ value: string; label: string }[]>(this.path(code) + 'transitions/');
  }
  assignees() {
    return this.api.get<{ id: number; name: string }[]>(this.root + 'assignees/');
  }
  alerts() {
    return this.api.get<AttentionAlert[]>(this.root + 'alerts/');
  }
  action(code: string, action: string, body: object) {
    return this.api.post<object, unknown>(this.path(code) + action + '/', body);
  }
  private path(code: string) {
    return this.root + encodeURIComponent(code) + '/';
  }
}
