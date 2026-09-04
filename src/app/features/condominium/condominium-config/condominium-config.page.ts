import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CondominiumService } from '../../../core/services/condominium';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-condominium-config',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './condominium-config.page.html',
  styleUrl: './condominium-config.page.scss'
})
export class CondominiumConfigPage implements OnInit {
  private fb = inject(FormBuilder);
  private condominiumService = inject(CondominiumService);
  private authService = inject(AuthService);

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
  // Leemos la Signal de usuario convirtiéndolo a any temporalmente para evaluar sus propiedades
  const user = this.authService.user() as any; 
  this.isAdmin = !!(user?.is_staff || user?.is_superuser || user?.role === 'ADMIN');

  // Si no es admin, deshabilitamos todo el formulario (modo lectura)
  if (!this.isAdmin) {
    this.form.disable();
  }
}

  private loadCondominiumData(): void {
    this.condominiumService.getCondominium().subscribe({
      next: (data) => {
        this.form.patchValue(data);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid || !this.isAdmin) return;

    this.saving = true;
    this.message = '';

    this.condominiumService.updateCondominium(this.form.value).subscribe({
      next: () => {
        this.saving = false;
        this.message = 'Configuración actualizada correctamente.';
      },
      error: () => {
        this.saving = false;
        this.message = 'Error al actualizar los datos.';
      }
    });
  }
}