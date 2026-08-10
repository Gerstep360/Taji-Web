import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AppConfigService } from './app-config.service';

describe('AppConfigService', () => {
  let service: AppConfigService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AppConfigService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads a LAN API URL without rebuilding Angular', async () => {
    const loading = service.load();
    http.expectOne('/config/app-config.json').flush({
      apiBaseUrl: 'http://192.168.100.223:8000/api/v1/',
      requestTimeoutMs: 8000,
    });
    await loading;

    expect(service.endpoint('/auth/login/')).toBe(
      'http://192.168.100.223:8000/api/v1/auth/login/',
    );
    expect(service.config().requestTimeoutMs).toBe(8000);
  });

  it('uses safe defaults when runtime config is unavailable', async () => {
    const loading = service.load();
    http.expectOne('/config/app-config.json').flush('missing', {
      status: 404,
      statusText: 'Not Found',
    });
    await loading;

    expect(service.endpoint('/health/')).toBe('/api/v1/health/');
  });
});
