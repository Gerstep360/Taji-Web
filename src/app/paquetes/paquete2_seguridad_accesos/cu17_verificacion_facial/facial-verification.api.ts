import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client.service';
import { API_ENDPOINTS } from '../../../core/api/api-endpoints';
import {
  BiometricReferenceItem,
  EnrollBiometricPayload,
  FaceMatchRequest,
  FaceMatchResult,
  FaceVerificationConfirmPayload,
  FaceVerificationLog,
} from './facial-verification.models';

@Injectable({ providedIn: 'root' })
export class FacialVerificationApi {
  private readonly api = inject(ApiClient);

  getBiometrics(search?: string, residentId?: number): Observable<BiometricReferenceItem[]> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    if (residentId) params = params.set('resident_id', residentId);
    return this.api.get<BiometricReferenceItem[]>(API_ENDPOINTS.security.biometrics.root, { params });
  }

  enrollBiometric(payload: EnrollBiometricPayload): Observable<BiometricReferenceItem> {
    return this.api.post<EnrollBiometricPayload, BiometricReferenceItem>(
      API_ENDPOINTS.security.biometrics.enroll,
      payload
    );
  }

  getResidentBiometricHistory(residentId: number): Observable<BiometricReferenceItem[]> {
    return this.api.get<BiometricReferenceItem[]>(
      API_ENDPOINTS.security.biometrics.history(residentId)
    );
  }

  matchFace(payload: FaceMatchRequest): Observable<FaceMatchResult> {
    return this.api.post<FaceMatchRequest, FaceMatchResult>(
      API_ENDPOINTS.security.faceVerification.match,
      payload
    );
  }

  confirmVerification(payload: FaceVerificationConfirmPayload): Observable<FaceVerificationLog> {
    return this.api.post<FaceVerificationConfirmPayload, FaceVerificationLog>(
      API_ENDPOINTS.security.faceVerification.confirm,
      payload
    );
  }

  getVerificationLogs(resultFilter?: string, search?: string): Observable<FaceVerificationLog[]> {
    let params = new HttpParams();
    if (resultFilter) params = params.set('result', resultFilter);
    if (search) params = params.set('search', search);
    return this.api.get<FaceVerificationLog[]>(API_ENDPOINTS.security.faceVerification.root, { params });
  }
}
