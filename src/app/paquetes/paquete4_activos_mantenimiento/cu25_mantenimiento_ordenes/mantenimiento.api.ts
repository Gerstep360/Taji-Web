import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { ApiClient } from '../../../core/api/api-client.service';
import { API_ENDPOINTS } from '../../../core/api/api-endpoints';
import { AppConfigService } from '../../../core/api/app-config.service';
import {
  MaintenanceAssetOption,
  MaintenancePage,
  MaintenancePlan,
  MaintenancePriorityOption,
  MaintenanceStaffOption,
  MaintenanceSupplier,
  MaintenanceWorkOrder,
  WorkOrderFilters,
} from './mantenimiento.models';

@Injectable({ providedIn: 'root' })
export class MantenimientoApi {
  private readonly api = inject(ApiClient);
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(AppConfigService);

  listOrders(filters: WorkOrderFilters = {}) {
    let params = new HttpParams().set('page_size', '100');
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== '') params = params.set(key, String(value));
    }
    return this.api.get<MaintenancePage<MaintenanceWorkOrder>>(
      API_ENDPOINTS.maintenance.orders,
      { params },
    );
  }

  createOrder(payload: Record<string, unknown>) {
    return this.api.post<Record<string, unknown>, MaintenanceWorkOrder>(
      API_ENDPOINTS.maintenance.orders,
      payload,
    );
  }

  updateOrder(id: number, payload: Record<string, unknown>) {
    return this.api.patch<Record<string, unknown>, MaintenanceWorkOrder>(
      API_ENDPOINTS.maintenance.order(id),
      payload,
    );
  }

  cancelOrder(id: number) {
    return this.api.delete<void>(API_ENDPOINTS.maintenance.order(id));
  }

  assignOrder(id: number, payload: Record<string, unknown>) {
    return this.api.post<Record<string, unknown>, MaintenanceWorkOrder>(
      API_ENDPOINTS.maintenance.assignOrder(id),
      payload,
    );
  }

  changeStatus(id: number, status: string, notes = '') {
    return this.api.post<Record<string, unknown>, MaintenanceWorkOrder>(
      API_ENDPOINTS.maintenance.changeOrderStatus(id),
      { status, notes },
    );
  }

  addCostItem(id: number, payload: Record<string, unknown>) {
    return this.api.post<Record<string, unknown>, MaintenanceWorkOrder>(
      API_ENDPOINTS.maintenance.orderCostItems(id),
      payload,
    );
  }

  removeCostItem(id: number, itemId: number) {
    return this.api.delete<MaintenanceWorkOrder>(
      API_ENDPOINTS.maintenance.orderCostItem(id, itemId),
    );
  }

  addAttachment(id: number, file: File, caption: string) {
    const body = new FormData();
    body.append('file', file, file.name);
    body.append('caption', caption);
    return this.api.post<FormData, MaintenanceWorkOrder>(
      API_ENDPOINTS.maintenance.orderAttachments(id),
      body,
    );
  }

  downloadAttachment(id: number, attachmentId: number) {
    return this.http.get(
      this.appConfig.endpoint(API_ENDPOINTS.maintenance.downloadAttachment(id, attachmentId)),
      { responseType: 'blob', withCredentials: true },
    );
  }

  listPlans() {
    return this.api.get<MaintenancePage<MaintenancePlan>>(
      API_ENDPOINTS.maintenance.plans,
      { params: new HttpParams().set('page_size', '100') },
    );
  }

  createPlan(payload: Record<string, unknown>) {
    return this.api.post<Record<string, unknown>, MaintenancePlan>(
      API_ENDPOINTS.maintenance.plans,
      payload,
    );
  }

  updatePlan(id: number, payload: Record<string, unknown>) {
    return this.api.patch<Record<string, unknown>, MaintenancePlan>(
      API_ENDPOINTS.maintenance.plan(id),
      payload,
    );
  }

  listSuppliers() {
    return this.api.get<MaintenancePage<MaintenanceSupplier>>(
      API_ENDPOINTS.maintenance.suppliers,
      { params: new HttpParams().set('page_size', '100') },
    );
  }

  createSupplier(payload: Record<string, unknown>) {
    return this.api.post<Record<string, unknown>, MaintenanceSupplier>(
      API_ENDPOINTS.maintenance.suppliers,
      payload,
    );
  }

  updateSupplier(id: number, payload: Record<string, unknown>) {
    return this.api.patch<Record<string, unknown>, MaintenanceSupplier>(
      API_ENDPOINTS.maintenance.supplier(id),
      payload,
    );
  }

  listAssets() {
    return this.api.get<MaintenancePage<MaintenanceAssetOption>>(
      API_ENDPOINTS.maintenance.assets,
      { params: new HttpParams().set('page_size', '100') },
    );
  }

  listStaff() {
    return this.api.get<MaintenancePage<MaintenanceStaffOption>>(
      API_ENDPOINTS.maintenance.staff,
      { params: new HttpParams().set('page_size', '100') },
    );
  }

  listPriorities() {
    return this.api.get<MaintenancePage<MaintenancePriorityOption>>(
      API_ENDPOINTS.maintenance.priorities,
      { params: new HttpParams().set('page_size', '100') },
    );
  }
}
