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
    expect(submitted.mock.calls[0][0]).not.toHaveProperty('employee_code');
    expect(submitted.mock.calls[0][0].end_date).toBeNull();
  });
});
