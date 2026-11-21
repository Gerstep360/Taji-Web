import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { ApiClient } from '../../../core/api/api-client.service';
import { API_ENDPOINTS } from '../../../core/api/api-endpoints';
import {
  Announcement,
  AnnouncementAudience,
  AnnouncementPriority,
  AnnouncementStatus,
  Notification,
} from '../../../domain/models/notifications.models';

export interface AnnouncementItem extends Announcement {
  audience_display?: string;
  priority_display?: string;
  status_display?: string;
  created_by_name?: string;
}

export interface AnnouncementFilter {
  audience?: string;
  priority?: string;
  status?: string;
  search?: string;
  page?: number;
}

export interface CreateAnnouncementDto {
  title: string;
  body: string;
  audience: AnnouncementAudience;
  priority: AnnouncementPriority;
  status?: AnnouncementStatus;
  expires_at?: string | null;
}

export interface NotificationItem extends Notification {
  priority?: AnnouncementPriority;
  audience?: AnnouncementAudience;
  is_read?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AnnouncementsApi {
  private readonly api = inject(ApiClient);
  private readonly endpoints = API_ENDPOINTS.announcements;
  private readonly notifEndpoints = API_ENDPOINTS.notifications;

  list(filters: AnnouncementFilter = {}) {
    let params = new HttpParams();
    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.audience) params = params.set('audience', filters.audience);
    if (filters.priority) params = params.set('priority', filters.priority);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.search) params = params.set('search', filters.search);

    return this.api.get<{ results: AnnouncementItem[]; pagination?: unknown }>(
      this.endpoints.root,
      { params },
    );
  }

  get(id: number | string) {
    return this.api.get<AnnouncementItem>(this.endpoints.detail(id));
  }

  create(dto: CreateAnnouncementDto) {
    return this.api.post<CreateAnnouncementDto, AnnouncementItem>(this.endpoints.root, dto);
  }

  update(id: number | string, dto: Partial<CreateAnnouncementDto>) {
    return this.api.patch<Partial<CreateAnnouncementDto>, AnnouncementItem>(this.endpoints.detail(id), dto);
  }

  publish(id: number | string) {
    return this.api.post<Record<string, never>, AnnouncementItem>(this.endpoints.publish(id), {});
  }

  archive(id: number | string) {
    return this.api.post<Record<string, never>, AnnouncementItem>(this.endpoints.archive(id), {});
  }

  getNotifications(unreadOnly = false) {
    let params = new HttpParams();
    if (unreadOnly) {
      params = params.set('unread', 'true');
    }
    return this.api.get<{ results: NotificationItem[] } | NotificationItem[]>(
      this.notifEndpoints.root,
      { params },
    );
  }

  getUnreadCount() {
    return this.api.get<{ unread_count: number }>(this.notifEndpoints.unreadCount);
  }

  markNotificationAsRead(id: number | string) {
    return this.api.post<Record<string, never>, NotificationItem>(
      this.notifEndpoints.markRead(id),
      {},
    );
  }

  markAllNotificationsAsRead() {
    return this.api.post<Record<string, never>, { marked_read: number }>(
      this.notifEndpoints.markAllRead,
      {},
    );
  }
}
