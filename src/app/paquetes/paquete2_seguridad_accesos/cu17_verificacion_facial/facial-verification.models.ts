export interface ResidentSimple {
  id: number;
  full_name: string;
  document_number: string;
  document_type: string;
  phone: string;
  status: string;
}

export interface BiometricReferenceItem {
  id: number;
  resident: number;
  resident_detail: ResidentSimple;
  reference_image: string;
  embedding_dim: number;
  model_name: string;
  model_version: string;
  is_active: boolean;
  enrolled_by_user: number | null;
  enrolled_by_user_email: string;
  enrolled_at: string;
}

export interface EnrollBiometricPayload {
  resident_id: number;
  reference_image: string;
}

export interface FaceMatchRequest {
  captured_image: string;
  target_resident_id?: number | null;
  threshold?: number;
}

export interface FaceMatchResult {
  matched_resident: ResidentSimple | null;
  biometric_reference_id: number | null;
  similarity_score: number;
  threshold: number;
  result: 'MATCH' | 'NO_MATCH' | 'REVIEW';
  model_name: string;
  model_version: string;
}

export interface FaceVerificationConfirmPayload {
  matched_resident_id?: number | null;
  biometric_reference_id?: number | null;
  captured_image: string;
  similarity_score?: number;
  threshold?: number;
  result: 'MATCH' | 'NO_MATCH' | 'REVIEW';
  human_confirmed: boolean;
  create_access_event?: boolean;
  event_type?: 'ENTRY' | 'EXIT';
  notes?: string;
}

export interface FaceVerificationLog {
  id: number;
  captured_image: string;
  matched_resident: number | null;
  matched_resident_detail: ResidentSimple | null;
  biometric_reference: number | null;
  guard_staff: number | null;
  guard_staff_name: string;
  access_event: number | null;
  similarity_score: number | null;
  threshold: number | null;
  model_name: string;
  model_version: string;
  result: 'MATCH' | 'NO_MATCH' | 'REVIEW';
  human_confirmed: boolean | null;
  confirmed_by_user: number | null;
  confirmed_by_user_email: string;
  verified_at: string;
}
