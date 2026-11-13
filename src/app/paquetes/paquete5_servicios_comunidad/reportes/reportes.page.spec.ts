import { TestBed, ComponentFixture } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReportsApi } from './reportes.api';
import { ReportsPage } from './reportes.page';
import { ReportCatalog, ReportPreview } from './reportes.models';
import { routes } from '../../../app.routes';

const catalog: ReportCatalog = {
  condominium: { id: 1, name: 'Condominio A' }, formats: ['xlsx', 'html'], export_limit: 10000,
  sources: [
    { key: 'staff', label: 'Personal', default_columns: ['name', 'id'], default_ordering: [{ field: 'name', direction: 'asc' }], columns: [
      { key: 'id', label: 'ID', type: 'number', operators: ['eq', 'gte', 'is_empty'], choices: [] },
      { key: 'name', label: 'Nombre', type: 'text', operators: ['contains', 'eq'], choices: [] },
      { key: 'status', label: 'Estado', type: 'choice', operators: ['eq', 'ne'], choices: [{ value: 'ACTIVE', label: 'Activo' }] },
    ] },
    { key: 'shifts', label: 'Turnos', default_columns: ['start'], default_ordering: [{ field: 'start', direction: 'desc' }], columns: [
      { key: 'start', label: 'Inicio', type: 'datetime', operators: ['eq', 'gte', 'lte'], choices: [] },
    ] },
  ],
};
const preview: ReportPreview = {
  title: 'Personal', columns: catalog.sources[0].columns.slice(0, 2), rows: [[1, 'Guardia A']],
  pagination: { page: 1, page_size: 25, total: 1, pages: 1 }, can_export: true,
};

describe('Reportes personalizables', () => {
  let fixture: ComponentFixture<ReportsPage>;
  let page: ReportsPage;
  let api: { catalog: ReturnType<typeof vi.fn>; preview: ReturnType<typeof vi.fn>; export: ReturnType<typeof vi.fn> };
  beforeEach(async () => {
    api = { catalog: vi.fn(() => of(structuredClone(catalog))), preview: vi.fn(() => of(structuredClone(preview))), export: vi.fn(() => of(new Blob(['reporte']))) };
    await TestBed.configureTestingModule({ imports: [ReportsPage], providers: [{ provide: ReportsApi, useValue: api }] }).compileComponents();
    fixture = TestBed.createComponent(ReportsPage);
    page = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });
  it('muestra el condominio y no ofrece descargar sin vista previa', () => {
    expect(fixture.nativeElement.textContent).toContain('Condominio A');
    expect(page.columns).toEqual(['name', 'id']);
    expect(fixture.nativeElement.textContent).not.toContain('Descargar Excel');
    expect(page.busy()).toBe(false);
  });
  it('cambia columnas y su posición en el payload', () => {
    page.toggleColumn('status');
    page.moveColumn(2, -1);
    page.toggleColumn('id');
    page.generate();
    expect(api.preview.mock.calls[0][0].columns).toEqual(['name', 'status']);
  });
  it('invalida la vista previa y bloquea exportación después de cambiar criterios', () => {
    page.generate();
    expect(page.preview()).not.toBeNull();
    page.addFilter();
    expect(page.preview()).toBeNull();
    page.download('xlsx');
    expect(api.export).not.toHaveBeenCalled();
  });
  it('reinicia columnas, título, filtros y orden al cambiar de origen', () => {
    page.addFilter();
    page.generate();
    page.selectSource('shifts');
    expect(page.filters).toEqual([]);
    expect(page.columns).toEqual(['start']);
    expect(page.ordering).toEqual([{ field: 'start', direction: 'desc' }]);
    expect(page.title).toBe('Turnos');
    expect(page.preview()).toBeNull();
  });
  it('envía números de ngModel como texto y no falla al validar', () => {
    page.addFilter();
    page.filters[0].value = 0;
    page.generate();
    expect(api.preview.mock.calls[0][0].filters[0].value).toBe('0');
  });
  it('valida columnas, filtros y orden duplicado sin solicitar al servidor', () => {
    page.columns = [];
    page.generate();
    expect(page.error()).toContain('columna');
    page.columns = ['name'];
    page.addFilter();
    page.generate();
    expect(page.error()).toContain('filtros');
    page.filters = [];
    page.ordering = [{ field: 'name', direction: 'asc' }, { field: 'name', direction: 'desc' }];
    page.generate();
    expect(page.error()).toContain('No repitas');
    expect(api.preview).not.toHaveBeenCalled();
  });
  it('permite filtros vacíos solo para está vacío / tiene valor', () => {
    page.addFilter();
    page.filters[0].operator = 'is_empty';
    page.generate();
    expect(api.preview).toHaveBeenCalledOnce();
  });
  it('cambia operadores y borra valores anteriores al seleccionar otro campo', () => {
    page.addFilter();
    page.filters[0].value = '3';
    page.changeFilterField(page.filters[0], 'status');
    expect(page.filters[0]).toEqual({ field: 'status', operator: 'eq', value: '' });
  });
  it('pagina conservando filtros y orden', () => {
    page.filters = [{ field: 'name', operator: 'contains', value: ' Guardia ' }];
    page.generate(2);
    expect(api.preview.mock.calls[0][0]).toMatchObject({ page: 2, page_size: 25, filters: [{ field: 'name', operator: 'contains', value: 'Guardia' }] });
  });
  it('no duplica solicitudes y deshabilita el formulario durante la generación', () => {
    const request = new Subject<ReportPreview>();
    api.preview.mockReturnValue(request);
    page.generate();
    page.generate();
    fixture.detectChanges();
    expect(api.preview).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.querySelector('fieldset').disabled).toBe(true);
    request.next(preview);
    request.complete();
    expect(page.busy()).toBe(false);
  });
  it('muestra error de API y no conserva resultados antiguos', () => {
    page.generate();
    api.preview.mockReturnValue(throwError(() => ({ error: { error: { message: 'Fecha inválida' } } })));
    page.generate();
    expect(page.error()).toBe('Fecha inválida');
    expect(page.preview()).toBeNull();
    expect(page.busy()).toBe(false);
  });
  it('muestra los detalles de filtros inválidos enviados por el backend', () => {
    api.preview.mockReturnValue(throwError(() => ({ error: { error: { message: 'Datos inválidos', fields: { non_field_errors: ['Selecciona un valor válido.'] } } } })));
    page.generate();
    expect(page.error()).toBe('Selecciona un valor válido.');
  });
  it('respeta el máximo de filtros y ordenamientos', () => {
    for (let index = 0; index < 12; index++) page.addFilter();
    for (let index = 0; index < 5; index++) page.addSort();
    expect(page.filters).toHaveLength(10);
    expect(page.ordering).toHaveLength(3);
    page.removeFilter(0);
    page.removeSort(0);
    expect(page.filters).toHaveLength(9);
    expect(page.ordering).toHaveLength(2);
  });
  it('escapa texto en la tabla y muestra resultado vacío', () => {
    api.preview.mockReturnValue(of({ ...preview, rows: [[1, '<script>peligro</script>']] }));
    page.generate();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('tbody script')).toBeNull();
    expect(fixture.nativeElement.querySelector('tbody').textContent).toContain('<script>peligro</script>');
    api.preview.mockReturnValue(of({ ...preview, rows: [] }));
    page.generate();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No hay registros');
  });
  it('deshabilita las dos exportaciones cuando excede el límite', () => {
    api.preview.mockReturnValue(of({ ...preview, can_export: false }));
    page.generate();
    page.download('html');
    fixture.detectChanges();
    expect(api.export).not.toHaveBeenCalled();
    const buttons = [...fixture.nativeElement.querySelectorAll('button')] as HTMLButtonElement[];
    expect(buttons.filter(button => button.textContent?.includes('Descargar')).every(button => button.disabled)).toBe(true);
  });
  it('descarga ambos formatos con la misma configuración', () => {
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    page.generate();
    page.download('xlsx');
    page.download('html');
    expect(api.export.mock.calls.map(call => call[1])).toEqual(['xlsx', 'html']);
    expect(api.export.mock.calls[0][0].columns).toEqual(page.columns);
    expect(create).toHaveBeenCalledTimes(2);
    expect(click).toHaveBeenCalledTimes(2);
    expect(page.notice()).toContain('todas las filas');
    vi.restoreAllMocks();
  });
  it('expone una ruta con control de administrador', () => {
    const route = routes.find(item => item.path === '')!.children!.find(item => item.path === 'reportes-personalizables');
    expect(route?.canActivate).toHaveLength(1);
    expect(route?.loadComponent).toBeDefined();
  });
});
