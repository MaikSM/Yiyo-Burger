import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { PedidosService, Order } from './pedidos.service';
import { environment } from '../../../environments/environment';

describe('PedidosService (Frontend)', () => {
  let service: PedidosService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/pedidos`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PedidosService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(PedidosService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe crearse la instancia del servicio de pedidos', () => {
    expect(service).toBeTruthy();
  });

  it('getPedidos() debe solicitar la lista de pedidos con GET', () => {
    const mockOrders: Order[] = [
      {
        id: 'uuid-1',
        tipo: 'Mesa',
        fecha: '2026-07-23T10:00:00Z',
        estado: 'Recibido',
        subtotal: 20000,
        total: 23800,
        items: [{ id: 'p1', nombre: 'Hamburguesa', precio: 20000, qty: 1 }],
      },
    ];

    service.getPedidos().subscribe((orders) => {
      expect(orders.length).toBe(1);
      expect(orders).toEqual(mockOrders);
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush(mockOrders);
  });

  it('createPedido() debe enviar un nuevo pedido por POST', () => {
    const nuevoPedido: Partial<Order> = {
      tipo: 'Domicilio',
      subtotal: 15000,
      total: 15000,
      cliente_nombre: 'Andrés López',
      items: [],
    };

    service.createPedido(nuevoPedido).subscribe((res) => {
      expect(res.id).toBeDefined();
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(nuevoPedido);
    req.flush({ id: 'uuid-2', ...nuevoPedido });
  });

  it('updatePedido() debe enviar la actualización del pedido por PUT', () => {
    const updateData: Partial<Order> = { estado: 'Pagado' };

    service.updatePedido('uuid-1', updateData).subscribe((res) => {
      expect(res.estado).toBe('Pagado');
    });

    const req = httpMock.expectOne(`${apiUrl}/uuid-1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(updateData);
    req.flush({ id: 'uuid-1', estado: 'Pagado' });
  });
});
