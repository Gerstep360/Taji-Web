import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client.service';
import { CondominiumService } from './condominium.service';

describe('CondominiumService', () => {
  it('reads and updates the backend current-condominium endpoint', () => {
    const api = { get: vi.fn(() => of({ id: 1 })), patch: vi.fn(() => of({ id: 1 })) };
    TestBed.configureTestingModule({ providers: [{ provide: ApiClient, useValue: api }] });
    const service = TestBed.inject(CondominiumService);
    service.getCondominium().subscribe();
    service.updateCondominium({ name: 'Taji' }).subscribe();
    expect(api.get).toHaveBeenCalledWith('/condominiums/current/');
    expect(api.patch).toHaveBeenCalledWith('/condominiums/current/', { name: 'Taji' });
  });
});
