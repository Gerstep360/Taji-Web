import { Injectable, inject } from '@angular/core';

import { ApiClient } from '../../../core/api/api-client.service';
import { API_ENDPOINTS } from '../../../core/api/api-endpoints';
import {
  InternalUserCreatePayload,
  PendingResident,
  RoleDetail,
  RolePermission,
  RolePermissionsUpdatePayload,
} from './cu2.models';

@Injectable({ providedIn: 'root' })
export class RolesApi {
  private readonly api = inject(ApiClient);

  listRoles() {
    return this.api.get<RoleDetail[]>(API_ENDPOINTS.roles.root);
  }

  listPermissions() {
    return this.api.get<RolePermission[]>(API_ENDPOINTS.roles.permissions);
  }

  getRolePermissions(slug: string) {
    return this.api.get<RoleDetail>(API_ENDPOINTS.roles.rolePermissions(slug));
  }

  updateRolePermissions(slug: string, payload: RolePermissionsUpdatePayload) {
    return this.api.patch<RolePermissionsUpdatePayload, RoleDetail>(
      API_ENDPOINTS.roles.rolePermissions(slug),
      payload,
    );
  }

  listPendingResidents() {
    return this.api.get<PendingResident[]>(API_ENDPOINTS.roles.pendingResidents);
  }

  reviewResident(id: number, action: 'approve' | 'reject') {
    return this.api.patch<{ action: string }, PendingResident>(
      API_ENDPOINTS.roles.residentReview(id),
      { action },
    );
  }

  createInternalUser(payload: InternalUserCreatePayload) {
    return this.api.post<InternalUserCreatePayload, unknown>(API_ENDPOINTS.roles.users, payload);
  }
}
