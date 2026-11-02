import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { SeguimientoIncidenciasPage } from './seguimiento-incidencias.page';

describe('SeguimientoIncidenciasPage', () => {
  let component: SeguimientoIncidenciasPage;
  let fixture: ComponentFixture<SeguimientoIncidenciasPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeguimientoIncidenciasPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SeguimientoIncidenciasPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
