import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ResidentEditorComponent } from './resident-editor.component';

describe('ResidentEditorComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [ResidentEditorComponent] }));

  async function createEditor() {
    const fixture = TestBed.createComponent(ResidentEditorComponent);
    fixture.componentRef.setInput('options', {
      document_types: [{ value: 'CI', label: 'Cédula de identidad' }],
      statuses: [
        { value: 'ACTIVE', label: 'Activo' },
        { value: 'INACTIVE', label: 'Inactivo' },
        { value: 'BLOCKED', label: 'Bloqueado' },
      ],
    });
    await fixture.whenStable();
    return fixture;
  }

  it('does not render any unit, sector or association field (out of CU05 scope)', async () => {
    const fixture = await createEditor();
    const html = fixture.nativeElement.innerHTML as string;
    expect(html).not.toMatch(/\b(unit|unidad|sector|bloque|torre|piso)\b/i);
  });

  it('requires first and last name before submitting', async () => {
    const fixture = await createEditor();
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);

    fixture.componentInstance.submit();

    expect(submitted).not.toHaveBeenCalled();
    expect(fixture.componentInstance.form.invalid).toBe(true);
  });

  it('normalizes blank document number to null on submit', async () => {
    const fixture = await createEditor();
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);
    fixture.componentInstance.form.patchValue({
      first_name: 'Marcelo',
      last_name: 'Quispe',
      document_number: '   ',
    });

    fixture.componentInstance.submit();

    expect(submitted).toHaveBeenCalledOnce();
    expect(submitted.mock.calls[0][0].document_number).toBeNull();
  });

  it('populates the form from an existing resident when editing', async () => {
    const fixture = await createEditor();
    fixture.componentRef.setInput('resident', {
      id: 1,
      person_id: 1,
      first_name: 'Elena',
      last_name: 'Rojas',
      full_name: 'Elena Rojas',
      document_type: 'CI',
      document_number: '1234567',
      document_complement: '',
      phone: '70000000',
      contact_email: 'elena@example.com',
      birth_date: null,
      profile_photo: '',
      status: 'INACTIVE',
      status_display: 'Inactivo',
      notes: 'Nota',
      registered_at: '2026-01-01T00:00:00Z',
      deactivated_at: '2026-02-01T00:00:00Z',
    });
    await fixture.whenStable();

    expect(fixture.componentInstance.form.getRawValue().first_name).toBe('Elena');
    expect(fixture.componentInstance.form.getRawValue().status).toBe('INACTIVE');
  });
});
