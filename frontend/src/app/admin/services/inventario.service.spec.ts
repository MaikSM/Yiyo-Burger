import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { InventarioService } from './inventario.service';
import { Inventario } from '@shared/interfaces';
import { environment } from '@env/environment';

describe('InventarioService (Frontend)', () => {
  let service: InventarioService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/inventario`;

  const nowIso = new Date().toISOString();

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        InventarioService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(InventarioService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe crearse la instancia del servicio de inventario', () => {
    expect(service).toBeTruthy();
  });

  it('getAll() debe solicitar los movimientos de inventario por GET', () => {
    const mockMovimientos: Inventario[] = [
      {
        movimiento_id: 1,
        ingrediente_id: 2,
        usuario_id: 1,
        cantidad: 15,
        tipo_movimiento: 'ENTRADA',
        fecha: nowIso,
        motivo: 'Compra',
        costo_total: 45000,
        created_at: nowIso,
        updated_at: nowIso,
      },
    ];

    service.getAll().subscribe((data) => {
      expect(data.length).toBe(1);
      expect(data).toEqual(mockMovimientos);
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush(mockMovimientos);
  });

  it('create() debe enviar la solicitud POST y emitir reload$', (done) => {
    const nuevoMov: Inventario = {
      movimiento_id: 2,
      ingrediente_id: 3,
      usuario_id: 1,
      cantidad: 5,
      tipo_movimiento: 'SALIDA',
      fecha: nowIso,
      motivo: 'Merma',
      costo_total: 15000,
      created_at: nowIso,
      updated_at: nowIso,
    };

    let reloaded = false;
    service.reload$.subscribe(() => {
      reloaded = true;
    });

    service.create(nuevoMov).subscribe((res) => {
      expect(res).toEqual(nuevoMov);
      expect(reloaded).toBe(true);
      done();
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('POST');
    req.flush(nuevoMov);
  });

  it('deleteById() debe enviar la solicitud DELETE y notificar recarga', (done) => {
    let reloaded = false;
    service.reload$.subscribe(() => {
      reloaded = true;
    });

    service.deleteById(10).subscribe(() => {
      expect(reloaded).toBe(true);
      done();
    });

    const req = httpMock.expectOne(`${apiUrl}/10`);
    expect(req.request.method).toBe('DELETE');
    req.flush([]);
  });
});
