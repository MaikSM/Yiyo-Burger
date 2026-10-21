import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ProveedoresService, Proveedor, OrdenCompra, FacturaProveedor } from './proveedores.service';
import { environment } from '@env/environment';

describe('ProveedoresService (Frontend)', () => {
  let service: ProveedoresService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/proveedores`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ProveedoresService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(ProveedoresService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe crearse el servicio correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('CRUD Proveedores', () => {
    it('getAll() debe retornar lista de proveedores por GET', () => {
      const mockProveedores: Proveedor[] = [
        { id: 1, razon_social: 'Lácteos del Valle', nit: '900111222' },
        { id: 2, razon_social: 'Carnes Premium', nit: '800333444' },
      ];

      service.getAll().subscribe((proveedores) => {
        expect(proveedores.length).toBe(2);
        expect(proveedores).toEqual(mockProveedores);
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('GET');
      req.flush(mockProveedores);
    });

    it('getById() debe solicitar un proveedor específico por ID', () => {
      const mockProveedor: Proveedor = { id: 1, razon_social: 'Lácteos del Valle', nit: '900111222' };

      service.getById(1).subscribe((prov) => {
        expect(prov).toEqual(mockProveedor);
      });

      const req = httpMock.expectOne(`${apiUrl}/1`);
      expect(req.request.method).toBe('GET');
      req.flush(mockProveedor);
    });

    it('create() debe enviar datos con POST y retornar el proveedor creado', () => {
      const nuevoProv: Proveedor = { razon_social: 'Panadería San Juan', nit: '777888999' };
      const mockCreado: Proveedor = { id: 3, ...nuevoProv };

      service.create(nuevoProv).subscribe((res) => {
        expect(res).toEqual(mockCreado);
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(nuevoProv);
      req.flush(mockCreado);
    });

    it('update() debe enviar cambios con PUT', () => {
      const updateData: Partial<Proveedor> = { telefono: '3009998877' };
      const mockActualizado: Proveedor = { id: 1, razon_social: 'Lácteos del Valle', nit: '900111222', telefono: '3009998877' };

      service.update(1, updateData).subscribe((res) => {
        expect(res).toEqual(mockActualizado);
      });

      const req = httpMock.expectOne(`${apiUrl}/1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updateData);
      req.flush(mockActualizado);
    });

    it('delete() debe enviar solicitud DELETE por ID', () => {
      service.delete(1).subscribe((res) => {
        expect(res).toBeDefined();
      });

      const req = httpMock.expectOne(`${apiUrl}/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush('Supplier deleted successfully');
    });
  });

  describe('Órdenes de Compra y Facturación', () => {
    it('createOrden() debe enviar la orden de compra con POST', () => {
      const mockOrden: OrdenCompra = {
        proveedor_id: 1,
        items: [{ ingrediente_id: 10, nombre: 'Queso Mozzarella', cantidad_compra: 5, unidad_compra: 'KG', costo_compra: 20000, factor_conversion: 1, unidad_stock: 'KG' }],
      };

      service.createOrden(mockOrden).subscribe((res) => {
        expect(res).toEqual(mockOrden);
      });

      const req = httpMock.expectOne(`${apiUrl}/ordenes`);
      expect(req.request.method).toBe('POST');
      req.flush(mockOrden);
    });

    it('registrarRecepcion() debe enviar la recepción con POST', () => {
      const payload = {
        ordenId: 5,
        numFactura: 'FACT-1002',
        fechaEmision: '2026-07-23',
        receivedItems: [{ ingrediente_id: 10, cantidad_recibida: 5, merma: 0, costo_real: 20000 }],
      };

      service.registrarRecepcion(payload).subscribe((res) => {
        expect(res.message).toBe('Éxito');
      });

      const req = httpMock.expectOne(`${apiUrl}/ordenes/recepcion`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush({ message: 'Éxito' });
    });

    it('pagarFactura() debe enviar el pago a la factura indicada', () => {
      const pago = { monto: 50000, metodo_pago: 'Efectivo' as const };

      service.pagarFactura(12, pago).subscribe((res) => {
        expect(res.message).toBe('Pago aplicado');
      });

      const req = httpMock.expectOne(`${apiUrl}/facturas/12/pagar`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(pago);
      req.flush({ message: 'Pago aplicado' });
    });
  });
});
