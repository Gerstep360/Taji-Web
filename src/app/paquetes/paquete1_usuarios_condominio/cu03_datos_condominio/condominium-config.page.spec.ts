import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { CondominiumService } from './condominium.service';
import { CondominiumConfigPage } from './condominium-config.page';

describe('CondominiumConfigPage', () => {
  function setup(permissions: string[]) {
    const api = {
      getCondominium: vi.fn(() => of({ id: 1, name: 'Taji' })),
      updateCondominium: vi.fn(() => of({ id: 1, name: 'Nuevo' })),
    };
    TestBed.configureTestingModule({
      imports: [CondominiumConfigPage],
      providers: [
        { provide: CondominiumService, useValue: api },
        { provide: AuthService, useValue: { user: signal({ is_superuser: false, role: { slug: 'administrador', permissions } }) } },
      ],
    });
    const fixture = TestBed.createComponent(CondominiumConfigPage);
    fixture.detectChanges();
    return { fixture, page: fixture.componentInstance, api };
  }

  it('enables editing using the backend role.permissions contract', () => {
    const { page, api } = setup(['manage_settings']);
    expect(page.form.enabled).toBe(true);
    page.form.patchValue({ name: 'Nuevo' });
    page.onSubmit();
    expect(api.updateCondominium).toHaveBeenCalledWith(expect.objectContaining({ name: 'Nuevo' }));
    expect(page.saving).toBe(false);
  });

  it('prevents submission without the settings permission', () => {
    const { page, api } = setup([]);
    expect(page.form.disabled).toBe(true);
    page.onSubmit();
    expect(api.updateCondominium).not.toHaveBeenCalled();
  });
});
