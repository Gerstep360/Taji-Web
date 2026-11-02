import { IncidentStatus, IncidentAttachment, IncidentAssignment, IncidentStatusHistory, IncidentComment } from '../../../domain/models/incidents.models';

export interface IncidentListItem {
  id: number;
  public_code: string;
  title: string;
  description: string;
  status: IncidentStatus;
  status_display: string;
  category: { id: number; code: string; name: string };
  priority: { id: number; code: string; name: string; rank: number } | null;
  sector: { id: number; code: string; name: string };
  unit: { id: number; code: string } | null;
  reporter: { id: number; full_name: string } | null;
  current_assignee_staff_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface IncidentDetailModel extends IncidentListItem {
  evidences: IncidentAttachment[];
  history: IncidentStatusHistory[];
  comments: IncidentComment[];
  assignments: IncidentAssignment[];
  ai_analysis?: any;
}

export interface IncidentFilterParams {
  search?: string;
  status?: string;
  category?: number;
  priority?: number;
  sector?: number;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}
