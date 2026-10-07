import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StaffEditorComponent } from './staff-editor.component';

describe('StaffEditorComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [StaffEditorComponent] }));

  async function createEditor() {
    const fixture = TestBed.createComponent(StaffEditorComponent);
    fixture.componentRef.setInput('options', {
      document_types: [{ value: 'CI', label: 'Cédula de identidad' }],
      staff_types: [{ value: 'SECURITY', label: 'Seguridad' }],
      statuses: [
        { value: 'ACTIVE', label: 'Activo' },
        { value: 'INACTIVE', label: 'Inactivo' },
      ],
    });
    await fixture.whenStable();
    return fixture;
  }

  it('explains the automatic code and does not expose an editable code input', async () => {
    const fixture = await createEditor();
    expect(fixture.nativeElement.querySelector('.system-code').textContent).toContain(
      'Se asignará al registrar',
    );
    expect(fixture.nativeElement.querySelector('[formControlName="employee_code"]')).toBeNull();
  });

  it('reacts immediately when inactive staff need a work end date', async () => {
    const fixture = await createEditor();
    expect(fixture.nativeElement.querySelector('[formControlName="end_date"]')).toBeNull();
    fixture.componentInstance.form.controls.status.setValue('INACTIVE');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[formControlName="end_date"]')).not.toBeNull();
    fixture.componentInstance.form.controls.status.setValue('ACTIVE');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[formControlName="end_date"]')).toBeNull();
  });

  it('does not send an internal code or a hidden end date for active staff', async () => {
    const fixture = await createEditor();
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);
    fixture.componentInstance.form.patchValue({
      first_name: 'Ana',
      last_name: 'Pérez',
      end_date: '2026-09-30',
    });
    fixture.componentInstance.submit();
    expect(submitted).toHaveBeenCalledOnce();
    expect(submitted.mock.calls[0][0].end_date).toBeNull();
  });

  it('shows system access toggle and auto-sets role to seguridad for SECURITY staff', async () => {

    const fixture = await createEditor();
    expect(fixture.nativeElement.querySelector('[formControlName="create_system_access"]')).not.toBeNull();
    
    // Toggle access on
    fixture.componentInstance.form.controls.create_system_access.setValue(true);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[formControlName="access_email"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[formControlName="password"]')).not.toBeNull();
    expect(fixture.componentInstance.form.controls.access_role.value).toBe('seguridad');
  });

  it('submits create_system_access, email and password when access is enabled', async () => {
    const fixture = await createEditor();
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);

    fixture.componentInstance.form.patchValue({
      first_name: 'Pepo',
      last_name: 'Juan',
      staff_type: 'SECURITY',
      contact_email: 'pepe@taji.com',
      create_system_access: true,
      access_email: 'pepe@taji.com',
      access_role: 'seguridad',
      password: 'SecureGuardPassword123!',
      password_confirm: 'SecureGuardPassword123!',
    });

    fixture.componentInstance.submit();
    expect(submitted).toHaveBeenCalledOnce();
    const payload = submitted.mock.calls[0][0];
    expect(payload.create_system_access).toBe(true);
    expect(payload.access_email).toBe('pepe@taji.com');
    expect(payload.access_role).toBe('seguridad');
    expect(payload.password).toBe('SecureGuardPassword123!');
  });
});

