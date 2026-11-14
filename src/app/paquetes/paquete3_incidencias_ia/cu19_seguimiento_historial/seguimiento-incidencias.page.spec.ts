import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AppConfigService } from '../../../core/api/app-config.service';
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
        // La configuración real se carga al iniciar la app; en pruebas se
        // inyecta una base fija para que el cliente HTTP pueda armar la URL.
        {
          provide: AppConfigService,
          useValue: {
            endpoint: (path: string) => `http://localhost:8000/api/v1${path}`,
            config: () => ({ requestTimeoutMs: 12000 }),
          },
        },
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
