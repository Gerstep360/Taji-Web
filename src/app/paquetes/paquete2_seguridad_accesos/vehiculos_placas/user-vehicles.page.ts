import { CommonModule, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IconComponent } from '../../../shared/ui/icon.component';
import { CondoMember, UserVehicle } from './user-vehicles.models';
import { UserVehiclesService } from './user-vehicles.service';

@Component({
  selector: 'app-user-vehicles-page',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, RouterLink, IconComponent],
  templateUrl: './user-vehicles.page.html',
  styleUrl: './user-vehicles.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserVehiclesPage implements OnInit {
  private readonly vehiclesService = inject(UserVehiclesService);
  private readonly route = inject(ActivatedRoute);

  readonly vehicles = signal<UserVehicle[]>([]);
  readonly members = signal<CondoMember[]>([]);
  readonly searchTerm = signal<string>('');
  readonly loading = signal<boolean>(true);
  readonly saving = signal<boolean>(false);
  readonly errorMessage = signal<string>('');
  readonly successMessage = signal<string>('');

  // Estado del Modal Formulario (Crear / Editar)
  readonly isModalOpen = signal<boolean>(false);
  readonly editingVehicle = signal<UserVehicle | null>(null);
  readonly formPlate = signal<string>('');
  readonly formDescription = signal<string>('');
  readonly formUserId = signal<number | null>(null);
  readonly formError = signal<string>('');

  // Estado del Modal de Eliminación
  readonly isDeleteModalOpen = signal<boolean>(false);
  readonly deletingVehicle = signal<UserVehicle | null>(null);

  // Lista filtrada
  readonly filteredVehicles = computed(() => {
    const q = this.searchTerm().trim().toLowerCase();
    const list = this.vehicles();
    if (!q) return list;
    return list.filter(
      (v) =>
        v.plate.toLowerCase().includes(q) ||
        (v.description && v.description.toLowerCase().includes(q)) ||
        (v.user_name && v.user_name.toLowerCase().includes(q)) ||
        (v.user_email && v.user_email.toLowerCase().includes(q)) ||
        (v.unit_info && v.unit_info.toLowerCase().includes(q))
    );
  });

  ngOnInit(): void {
    this.loadData();
    this.route.queryParams.subscribe((params) => {
      const plate = params['plate'];
      if (plate && typeof plate === 'string') {
        this.openCreateModal(plate);
      }
    });
  }

  loadData(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.vehiclesService.getMembers().subscribe({
      next: (members) => this.members.set(members),
      error: () => {},
    });

    this.vehiclesService.listVehicles().subscribe({
      next: (data) => {
        this.vehicles.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudo cargar la lista de vehículos.');
        this.loading.set(false);
      },
    });
  }

  openCreateModal(initialPlate: string = ''): void {
    this.editingVehicle.set(null);
    this.formPlate.set(initialPlate.toUpperCase().trim());
    this.formDescription.set('');
    this.formUserId.set(null);
    this.formError.set('');
    this.isModalOpen.set(true);
  }

  openEditModal(vehicle: UserVehicle): void {
    this.editingVehicle.set(vehicle);
    this.formPlate.set(vehicle.plate);
    this.formDescription.set(vehicle.description || '');
    this.formUserId.set(vehicle.user);
    this.formError.set('');
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.editingVehicle.set(null);
    this.formError.set('');
  }

  onPlateInput(value: string): void {
    this.formPlate.set(value.toUpperCase());
  }

  saveVehicle(): void {
    const rawPlate = this.formPlate().trim().toUpperCase();
    if (!rawPlate) {
      this.formError.set('Ingresa la placa del vehículo.');
      return;
    }

    this.saving.set(true);
    this.formError.set('');

    const payload = {
      plate: rawPlate,
      description: this.formDescription().trim(),
      user: this.formUserId(),
    };

    const editItem = this.editingVehicle();
    if (editItem) {
      this.vehiclesService.updateVehicle(editItem.id, payload).subscribe({
        next: (updated) => {
          this.vehicles.update((list) =>
            list.map((item) => (item.id === updated.id ? updated : item))
          );
          this.saving.set(false);
          this.closeModal();
          this.showFlash('Vehículo actualizado exitosamente.');
        },
        error: (err) => {
          this.saving.set(false);
          const detail =
            err.error?.plate?.[0] ||
            err.error?.detail ||
            'No se pudo actualizar el vehículo. Verifica los datos.';
          this.formError.set(detail);
        },
      });
    } else {
      this.vehiclesService.createVehicle(payload).subscribe({
        next: (created) => {
          this.vehicles.update((list) => [created, ...list]);
          this.saving.set(false);
          this.closeModal();
          this.showFlash('Vehículo registrado y vinculado correctamente.');
        },
        error: (err) => {
          this.saving.set(false);
          const detail =
            err.error?.plate?.[0] ||
            err.error?.detail ||
            'No se pudo registrar la placa. Verifica que no esté ya registrada en este condominio.';
          this.formError.set(detail);
        },
      });
    }
  }

  confirmDelete(vehicle: UserVehicle): void {
    this.deletingVehicle.set(vehicle);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.deletingVehicle.set(null);
  }

  executeDelete(): void {
    const item = this.deletingVehicle();
    if (!item) return;

    this.saving.set(true);
    this.vehiclesService.deleteVehicle(item.id).subscribe({
      next: () => {
        this.vehicles.update((list) => list.filter((v) => v.id !== item.id));
        this.saving.set(false);
        this.closeDeleteModal();
        this.showFlash(`Placa ${item.plate} eliminada correctamente.`);
      },
      error: () => {
        this.saving.set(false);
        this.errorMessage.set('No se pudo eliminar el registro.');
        this.closeDeleteModal();
      },
    });
  }

  private showFlash(msg: string): void {
    this.successMessage.set(msg);
    setTimeout(() => {
      this.successMessage.set('');
    }, 4500);
  }
}
