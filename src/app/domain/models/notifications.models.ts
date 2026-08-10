import { EntityId, IsoDateTime } from './shared.models';

export type AnnouncementAudience = 'ALL' | 'RESIDENTS' | 'STAFF' | 'SECURITY' | 'MAINTENANCE' | 'DIRECTIVE';
export type AnnouncementPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type AnnouncementStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type DevicePlatform = 'ANDROID' | 'IOS' | 'WEB';

export interface Announcement {
  id: EntityId; created_by_user_id: EntityId | null; title: string; body: string;
  audience: AnnouncementAudience; priority: AnnouncementPriority;
  published_at: IsoDateTime | null; expires_at: IsoDateTime | null;
  status: AnnouncementStatus; created_at: IsoDateTime; updated_at: IsoDateTime;
}
export interface DeviceToken {
  id: EntityId; user_id: EntityId; token: string; platform: DevicePlatform;
  is_active: boolean; last_seen_at: IsoDateTime; created_at: IsoDateTime;
}
export interface Notification {
  id: EntityId; user_id: EntityId; notification_type: string; title: string;
  message: string; resource_type: string | null; resource_id: string | null;
  sent_at: IsoDateTime | null; read_at: IsoDateTime | null; created_at: IsoDateTime;
}