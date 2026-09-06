import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { CondominiumService } from './condominium.service';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-condominium-config',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './condominium-config.page.html',
  styleUrl: './condominium-config.page.scss'
})
export class CondominiumConfigPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly condominiumService = inject(CondominiumService);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  form: FormGroup = this.fb.group({
    name: ['', Validators.required],
    legal_name: [''],
    address: [''],
    phone: [''],
    email: ['', Validators.email],
    timezone: ['America/La_Paz'],
    rules_summary: ['']
  });

  loading = true;
  saving = false;
  message = '';
  isAdmin = false;

  ngOnInit(): void {
    this.checkPermissions();
    this.loadCondominiumData();
  }

  private checkPermissions(): void {
    const user = this.authService.user();

    this.isAdmin = !!(
      user?.is_superuser ||
      user?.role?.permissions.includes('manage_settings')
    );

    if (!this.isAdmin) {
      this.form.disable();
    }
  }

  private loadCondominiumData(): void {
    this.loading = true;

    this.condominiumService.getCondominium().subscribe({
      next: (data) => {
        this.form.patchValue(data);
        this.loading = false;

        // Necesario para reflejar correctamente el cambio
        // durante la carga inicial de la aplicación.
        this.cdr.detectChanges();
      },

      error: () => {
        this.loading = false;
        this.message = 'No fue posible cargar la configuración del condominio.';
        this.cdr.detectChanges();
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid || !this.isAdmin || this.saving) {
      return;
    }

    this.saving = true;
    this.message = '';

    this.condominiumService.updateCondominium(this.form.getRawValue()).subscribe({
      next: () => {
        this.saving = false;
        this.message = 'Configuración actualizada correctamente.';
        this.cdr.markForCheck();
      },

      error: () => {
        this.saving = false;
        this.message = 'No fue posible actualizar la configuración.';
        this.cdr.markForCheck();
      }
    });
  }
}
