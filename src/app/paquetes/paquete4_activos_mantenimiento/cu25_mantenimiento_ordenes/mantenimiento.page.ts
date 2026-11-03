import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, Subject, takeUntil } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { AppConfigService } from '../../../core/api/app-config.service';
import { IconComponent } from '../../../shared/ui/icon.component';
import { MantenimientoApi } from './mantenimiento.api';
import {
  MaintenanceAssetOption,
  MaintenancePlan,
  MaintenancePriorityOption,
  MaintenanceStaffOption,
  MaintenanceSupplier,
  MaintenanceWorkOrder,
  WorkOrderFilters,
  WorkOrderStatus,
  WorkType,
} from './mantenimiento.models';

type MaintenanceTab = 'orders' | 'plans' | 'suppliers';

interface OrderForm {
  title: string;
  description: string;
  asset_id: string;
  work_type: WorkType;
  priority_id: string;
  maintenance_plan_id: string;
  scheduled_for: string;
  estimated_cost: string;
}

interface PlanForm {
  asset_id: string;
  name: string;
  description: string;
  frequency_days: string;
  next_due_at: string;
  is_active: boolean;
}

interface SupplierForm {
  name: string;
  contact_name: string;
  phone: string;
  email: string;
  specialty: string;
  notes: string;
}

const EMPTY_ORDER_FORM: OrderForm = {
  title: '',
  description: '',
  asset_id: '',
  work_type: 'CORRECTIVE',
  priority_id: '',
  maintenance_plan_id: '',
  scheduled_for: '',
  estimated_cost: '',
};

const EMPTY_PLAN_FORM: PlanForm = {
  asset_id: '',
  name: '',
  description: '',
  frequency_days: '30',
  next_due_at: '',
  is_active: true,
};

const EMPTY_SUPPLIER_FORM: SupplierForm = {
  name: '',
  contact_name: '',
  phone: '',
  email: '',
  specialty: '',
  notes: '',
};

const STATUS_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  PENDING: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['PAUSED', 'COMPLETED', 'CANCELLED'],
  PAUSED: ['IN_PROGRESS', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

@Component({
  selector: 'taji-mantenimiento-page',
  imports: [FormsModule, DatePipe, DecimalPipe, IconComponent],
  templateUrl: './mantenimiento.page.html',
  styleUrl: './mantenimiento.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MantenimientoPage implements OnInit {
  private readonly api = inject(MantenimientoApi);
  private readonly auth = inject(AuthService);
  private readonly appConfig = inject(AppConfigService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly tenantChanged = new Subject<void>();
  private tenantId = this.auth.user()?.active_tenant?.id;

  constructor() {
    effect(() => {
      const tenantId = this.auth.user()?.active_tenant?.id;
      if (tenantId === this.tenantId) return;
      this.tenantId = tenantId;
      untracked(() => {
        this.tenantChanged.next();
        this.orders.set([]); this.plans.set([]); this.suppliers.set([]); this.assets.set([]);
        this.staff.set([]); this.priorities.set([]); this.selectedOrder.set(null);
        this.orderFormOpen.set(false); this.planFormOpen.set(false); this.supplierFormOpen.set(false);
        this.selectedFile.set(null); this.saving.set(false); this.currentPage.set(1);
        this.errorMessage.set(''); this.successMessage.set('');
        if (tenantId) { this.refresh(); }
      });
    });
  }

  readonly user = this.auth.user;
  readonly canManage = computed(() => {
    const user = this.user();
    return !!user?.is_superuser || !!user?.role?.permissions.includes('manage_maintenance');
  });
  readonly activeTab = signal<MaintenanceTab>('orders');
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly orders = signal<MaintenanceWorkOrder[]>([]);
  readonly plans = signal<MaintenancePlan[]>([]);
  readonly suppliers = signal<MaintenanceSupplier[]>([]);
  readonly assets = signal<MaintenanceAssetOption[]>([]);
  readonly staff = signal<MaintenanceStaffOption[]>([]);
  readonly priorities = signal<MaintenancePriorityOption[]>([]);
  readonly selectedOrder = signal<MaintenanceWorkOrder | null>(null);
  readonly orderFormOpen = signal(false);
  readonly planFormOpen = signal(false);
  readonly supplierFormOpen = signal(false);
  readonly editingOrder = signal<MaintenanceWorkOrder | null>(null);
  readonly editingPlan = signal<MaintenancePlan | null>(null);
  readonly filters: WorkOrderFilters = {};
  readonly currentPage = signal(1);
  readonly totalPages = signal(1);
  readonly selectedFile = signal<File | null>(null);
  readonly attachmentCaption = signal('');
  readonly costForm = { description: '', quantity: '1', unit_cost: '' };
  readonly assignmentForm = { staff_id: '', supplier_id: '', reason: '' };
  readonly statusNotes = signal('');

  orderForm: OrderForm = { ...EMPTY_ORDER_FORM };
  planForm: PlanForm = { ...EMPTY_PLAN_FORM };
  supplierForm: SupplierForm = { ...EMPTY_SUPPLIER_FORM };

  readonly openOrders = computed(
    () => this.orders().filter((order) => !['COMPLETED', 'CANCELLED'].includes(order.status)).length,
  );
  readonly overduePlans = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.plans().filter(
      (plan) => plan.is_active && new Date(plan.next_due_at).getTime() < today.getTime(),
    ).length;
  });

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.errorMessage.set('');
    this.loading.set(true);
    if (!this.canManage()) {
      this.loadOrders();
      return;
    }

    forkJoin({
      plans: this.api.listPlans(),
      suppliers: this.api.listSuppliers(),
      assets: this.api.listAssets(),
      staff: this.api.listStaff(),
      priorities: this.api.listPriorities(),
    })
      .pipe(takeUntil(this.tenantChanged), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.plans.set(data.plans.results ?? []);
          this.suppliers.set(data.suppliers.results ?? []);
          this.assets.set(data.assets.results ?? []);
          this.staff.set(data.staff.results ?? []);
          this.priorities.set(data.priorities.results ?? []);
          this.loadOrders();
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.errorMessage.set(this.errorText(error, 'No se pudieron cargar los datos de mantenimiento.'));
        },
      });
  }

  loadOrders(): void {
    this.errorMessage.set('');
    this.loading.set(true);
    this.api
      .listOrders({ ...this.filters, page: this.currentPage() })
      .pipe(takeUntil(this.tenantChanged), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.orders.set(response.results ?? []);
          this.totalPages.set(response.pagination?.total_pages ?? 1);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.errorMessage.set(this.errorText(error, 'No se pudieron cargar las órdenes de trabajo.'));
        },
      });
  }

  applyFilters(): void {
    this.currentPage.set(1);
    this.loadOrders();
  }

  changePage(page: number): void {
    this.currentPage.set(Math.max(1, Math.min(this.totalPages(), page)));
    this.loadOrders();
  }

  openCreateOrder(): void {
    this.editingOrder.set(null);
    this.orderForm = { ...EMPTY_ORDER_FORM };
    this.orderFormOpen.set(true);
  }

  openEditOrder(order: MaintenanceWorkOrder): void {
    this.editingOrder.set(order);
    this.orderForm = {
      title: order.title,
      description: order.description,
      asset_id: order.asset_id ? String(order.asset_id) : '',
      work_type: order.work_type,
      priority_id: order.priority_id ? String(order.priority_id) : '',
      maintenance_plan_id: order.maintenance_plan_id ? String(order.maintenance_plan_id) : '',
      scheduled_for: this.toLocalDateTime(order.scheduled_for),
      estimated_cost: order.estimated_cost ?? '',
    };
    this.orderFormOpen.set(true);
  }

  saveOrder(): void {
    if (!this.orderForm.title.trim() || !this.orderForm.asset_id) {
      this.errorMessage.set('Indica un título y selecciona el activo relacionado.');
      return;
    }
    const payload: Record<string, unknown> = {
      title: this.orderForm.title.trim(),
      description: this.orderForm.description.trim(),
      asset_id: Number(this.orderForm.asset_id),
      work_type: this.orderForm.work_type,
      priority_id: this.orderForm.priority_id ? Number(this.orderForm.priority_id) : null,
      maintenance_plan_id: this.orderForm.maintenance_plan_id
        ? Number(this.orderForm.maintenance_plan_id)
        : null,
      scheduled_for: this.orderForm.scheduled_for
        ? new Date(this.orderForm.scheduled_for).toISOString()
        : null,
      estimated_cost: this.orderForm.estimated_cost || null,
    };
    const current = this.editingOrder();
    this.runSave(
      current
        ? this.api.updateOrder(current.id, payload)
        : this.api.createOrder(payload),
      current ? 'Orden actualizada.' : 'Orden creada.',
      () => {
        this.orderFormOpen.set(false);
        this.refresh();
      },
    );
  }

  assign(order: MaintenanceWorkOrder): void {
    const staffId = this.assignmentForm.staff_id;
    const supplierId = this.assignmentForm.supplier_id;
    if (!!staffId === !!supplierId) {
      this.errorMessage.set('Selecciona un técnico o un proveedor, no ambos.');
      return;
    }
    const payload = {
      ...(staffId ? { staff_id: Number(staffId) } : { supplier_id: Number(supplierId) }),
      reason: this.assignmentForm.reason.trim(),
    };
    this.runSave(
      this.api.assignOrder(order.id, payload),
      'La orden fue asignada correctamente.',
      (updated) => {
        this.selectedOrder.set(updated);
        this.assignmentForm.staff_id = '';
        this.assignmentForm.supplier_id = '';
        this.assignmentForm.reason = '';
        this.loadOrders();
      },
    );
  }

  changeStatus(order: MaintenanceWorkOrder, nextStatus: WorkOrderStatus): void {
    this.runSave(
      this.api.changeStatus(order.id, nextStatus, this.statusNotes()),
      `Estado actualizado a ${this.statusLabel(nextStatus).toLowerCase()}.`,
      (updated) => {
        this.selectedOrder.set(updated);
        this.statusNotes.set('');
        this.loadOrders();
      },
    );
  }

  cancelOrder(order: MaintenanceWorkOrder): void {
    if (!window.confirm(`¿Cancelar la orden ${order.public_code}?`)) return;
    this.runSave(this.api.cancelOrder(order.id), 'Orden cancelada.', () => {
      this.selectedOrder.set(null);
      this.loadOrders();
    });
  }

  addCost(order: MaintenanceWorkOrder): void {
    const description = this.costForm.description.trim();
    const quantity = Number(this.costForm.quantity);
    const unitCost = Number(this.costForm.unit_cost);
    if (!description || quantity <= 0 || !Number.isFinite(unitCost) || unitCost < 0) {
      this.errorMessage.set('Completa una descripción, cantidad positiva y costo válido.');
      return;
    }
    this.runSave(
      this.api.addCostItem(order.id, {
        description,
        quantity,
        unit_cost: unitCost,
      }),
      'Costo registrado.',
      (updated) => {
        this.selectedOrder.set(updated);
        this.costForm.description = '';
        this.costForm.quantity = '1';
        this.costForm.unit_cost = '';
        this.loadOrders();
      },
    );
  }

  removeCost(order: MaintenanceWorkOrder, itemId: number): void {
    this.runSave(
      this.api.removeCostItem(order.id, itemId),
      'Partida de costo eliminada.',
      (updated) => {
        this.selectedOrder.set(updated);
        this.loadOrders();
      },
    );
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] ?? null);
  }

  uploadEvidence(order: MaintenanceWorkOrder): void {
    const file = this.selectedFile();
    if (!file) {
      this.errorMessage.set('Selecciona una evidencia antes de subirla.');
      return;
    }
    this.runSave(
      this.api.addAttachment(order.id, file, this.attachmentCaption()),
      'Evidencia adjuntada.',
      (updated) => {
        this.selectedOrder.set(updated);
        this.selectedFile.set(null);
        this.attachmentCaption.set('');
        this.loadOrders();
      },
    );
  }

  downloadAttachment(order: MaintenanceWorkOrder, attachmentId: number): void {
    this.api
      .downloadAttachment(order.id, attachmentId)
      .pipe(takeUntil(this.tenantChanged), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = `evidencia-${attachmentId}`;
          anchor.click();
          URL.revokeObjectURL(url);
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.errorText(error, 'No se pudo descargar la evidencia.'));
        },
      });
  }

  openPlanForm(plan?: MaintenancePlan): void {
    this.editingPlan.set(plan ?? null);
    this.planForm = plan
      ? {
          asset_id: String(plan.asset_id),
          name: plan.name,
          description: plan.description,
          frequency_days: String(plan.frequency_days),
          next_due_at: this.toLocalDateTime(plan.next_due_at),
          is_active: plan.is_active,
        }
      : { ...EMPTY_PLAN_FORM };
    this.planFormOpen.set(true);
  }

  openEditOrderForPlan(plan: MaintenancePlan): void {
    this.activeTab.set('orders');
    this.openCreateOrder();
    this.orderForm.asset_id = String(plan.asset_id);
    this.orderForm.maintenance_plan_id = String(plan.id);
    this.orderForm.work_type = 'PREVENTIVE';
    this.orderForm.title = plan.name;
    this.orderForm.scheduled_for = this.toLocalDateTime(plan.next_due_at);
  }

  togglePlan(plan: MaintenancePlan): void {
    this.runSave(
      this.api.updatePlan(plan.id, { is_active: !plan.is_active }),
      plan.is_active ? 'Plan preventivo desactivado.' : 'Plan preventivo activado.',
      () => this.refresh(),
    );
  }

  savePlan(): void {
    const frequency = Number(this.planForm.frequency_days);
    if (
      !this.planForm.name.trim() ||
      !this.planForm.asset_id ||
      !Number.isInteger(frequency) ||
      frequency < 1 ||
      !this.planForm.next_due_at
    ) {
      this.errorMessage.set('Completa el activo, nombre, frecuencia válida y próxima fecha.');
      return;
    }
    const payload = {
      asset_id: Number(this.planForm.asset_id),
      name: this.planForm.name.trim(),
      description: this.planForm.description.trim(),
      frequency_days: frequency,
      next_due_at: new Date(this.planForm.next_due_at).toISOString(),
      is_active: this.planForm.is_active,
    };
    const plan = this.editingPlan();
    this.runSave(
      plan ? this.api.updatePlan(plan.id, payload) : this.api.createPlan(payload),
      plan ? 'Plan actualizado.' : 'Plan preventivo creado.',
      () => {
        this.planFormOpen.set(false);
        this.refresh();
      },
    );
  }

  openSupplierForm(): void {
    this.supplierForm = { ...EMPTY_SUPPLIER_FORM };
    this.supplierFormOpen.set(true);
  }

  saveSupplier(): void {
    if (!this.supplierForm.name.trim()) {
      this.errorMessage.set('El nombre del proveedor es obligatorio.');
      return;
    }
    this.runSave(
      this.api.createSupplier({
        ...this.supplierForm,
        name: this.supplierForm.name.trim(),
        status: 'ACTIVE',
      }),
      'Proveedor registrado.',
      () => {
        this.supplierFormOpen.set(false);
        this.refresh();
      },
    );
  }

  toggleSupplier(supplier: MaintenanceSupplier): void {
    this.api.updateSupplier(supplier.id, {
      status: supplier.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
    })
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: () => {
          this.successMessage.set('Estado del proveedor actualizado.');
          this.refresh();
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.errorText(error, 'No se pudo actualizar el proveedor.'));
        },
      });
  }

  setAssignmentStaff(value: string): void {
    this.assignmentForm.staff_id = value;
    if (value) this.assignmentForm.supplier_id = '';
  }

  setAssignmentSupplier(value: string): void {
    this.assignmentForm.supplier_id = value;
    if (value) this.assignmentForm.staff_id = '';
  }

  canUpdateStatus(): boolean {
    const permissions = this.user()?.role?.permissions ?? [];
    return permissions.includes('update_work_order_status');
  }

  canAttachEvidence(): boolean {
    const permissions = this.user()?.role?.permissions ?? [];
    return permissions.includes('attach_work_evidence');
  }

  allowedStatuses(order: MaintenanceWorkOrder): WorkOrderStatus[] {
    const choices = this.nextStatuses(order).filter((value) => value !== 'CANCELLED');
    return this.canManage()
      ? choices
      : choices.filter((value) => ['IN_PROGRESS', 'PAUSED', 'COMPLETED'].includes(value));
  }

  statusActionLabel(status: WorkOrderStatus): string {
    return {
      PENDING: 'Marcar pendiente',
      ASSIGNED: 'Marcar asignada',
      IN_PROGRESS: 'Iniciar trabajo',
      PAUSED: 'Pausar trabajo',
      COMPLETED: 'Completar orden',
      CANCELLED: 'Cancelar orden',
    }[status];
  }

  selectPlan(planId: string): void {
    this.orderForm.maintenance_plan_id = planId;
    const plan = this.plans().find((item) => String(item.id) === planId);
    if (plan) this.orderForm.asset_id = String(plan.asset_id);
  }

  statusLabel(status: string): string {
    return {
      PENDING: 'Pendiente',
      ASSIGNED: 'Asignada',
      IN_PROGRESS: 'En progreso',
      PAUSED: 'Pausada',
      COMPLETED: 'Completada',
      CANCELLED: 'Cancelada',
    }[status] ?? status;
  }

  workTypeLabel(type: string): string {
    return {
      PREVENTIVE: 'Preventivo',
      CORRECTIVE: 'Correctivo',
      INSPECTION: 'Inspección',
    }[type] ?? type;
  }

  nextStatuses(order: MaintenanceWorkOrder): WorkOrderStatus[] {
    return STATUS_TRANSITIONS[order.status];
  }

  statusClass(status: string): string {
    return `status-${status.toLowerCase().replace('_', '-')}`;
  }

  openDetails(order: MaintenanceWorkOrder): void {
    this.errorMessage.set('');
    this.selectedOrder.set(order);
  }

  closeDetails(): void {
    this.selectedOrder.set(null);
  }

  private runSave<T>(
    request: import('rxjs').Observable<T>,
    success: string,
    afterSave: (result: T) => void,
  ): void {
    this.saving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    request.pipe(takeUntil(this.tenantChanged), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        this.saving.set(false);
        this.successMessage.set(success);
        afterSave(result);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.errorMessage.set(this.errorText(error, 'No se pudo guardar el cambio.'));
      },
    });
  }

  private toLocalDateTime(value: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 16);
  }

  private errorText(error: unknown, fallback: string): string {
    if (!(error instanceof HttpErrorResponse)) return fallback;
    const body = error.error as {
      error?: { message?: string; fields?: Record<string, string[]> };
      detail?: string;
      message?: string;
    } | null;
    const fieldMessages = Object.values(body?.error?.fields ?? {}).flat();
    return fieldMessages[0] ?? body?.error?.message ?? body?.detail ?? body?.message ?? fallback;
  }
}
