import { EntityId, IsoDateTime, JsonMap } from './shared.models';

export interface AuditEvent {
  id: EntityId; actor_user_id: EntityId | null; action_code: string;
  resource_type: string; resource_id: string | null; description: string;
  before_data: JsonMap | null; after_data: JsonMap | null; ip_address: string | null;
  user_agent: string; request_id: string | null; occurred_at: IsoDateTime;
}