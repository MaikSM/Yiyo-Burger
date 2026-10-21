import request from 'supertest';
import { Application } from 'express';
import { DataSource } from 'typeorm';
import { DatabaseConnection } from '../../../core/database/DatabaseConnection';
import { Server } from '../../../server';
import { RoleEntity } from '../../role/entities/role.entity';
import { UserEntity } from '../../user/entities/user.entity';
import { CierreCajaEntity } from '../entities/cierre-caja.entity';
import { PedidoEntity } from '../../pedidos/entities/pedido.entity';
import { IngredienteEntity } from '../../inventario/entities/ingrediente.entity';
import { InventarioEntity } from '../../inventario/entities/inventario.entity';
import { MesaEntity } from '../../mesas/entities/mesa.entity';
import { PlatoEntity } from '../../menu/entities/plato.entity';
import { CategoriaEntity } from '../../categorias/entities/categoria.entity';
import { ClienteEntity } from '../../clientes/entities/cliente.entity';
import { ProveedorEntity } from '../../proveedores/entities/proveedor.entity';
import { OrdenCompraEntity } from '../../proveedores/entities/orden-compra.entity';
import { FacturaProveedorEntity } from '../../proveedores/entities/factura-proveedor.entity';
import { HistorialPagoEntity } from '../../proveedores/entities/historial-pago.entity';
import { JwtUtil } from '../../../utils/jwt.util';
import { BcryptUtil } from '../../../utils/bcrypt.util';

describe('CierreCajaController Integration Tests', () => {
  let app: Application;
  let testDataSource: DataSource;
  let authToken: string;
  let cajeroUser: UserEntity;

  beforeAll(async () => {
    testDataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      dropSchema: true,
      synchronize: true,
      logging: false,
      entities: [
        RoleEntity,
        UserEntity,
        IngredienteEntity,
        InventarioEntity,
        MesaEntity,
        PedidoEntity,
        PlatoEntity,
        CategoriaEntity,
        ClienteEntity,
        ProveedorEntity,
        OrdenCompraEntity,
        FacturaProveedorEntity,
        HistorialPagoEntity,
        CierreCajaEntity,
      ],
    });

    await testDataSource.initialize();
    DatabaseConnection.appDataSource = testDataSource;

    const server = new Server();
    app = await server.initForTesting();

    const roleRepo = testDataSource.getRepository(RoleEntity);
    const role = await roleRepo.save(
      roleRepo.create({ name: 'cajero', description: 'Cajero de turno' })
    );

    const userRepo = testDataSource.getRepository(UserEntity);
    const pass = await BcryptUtil.hashPassword('CajeroPass123!');
    cajeroUser = await userRepo.save(
      userRepo.create({
        name: 'Cajero',
        surname: 'Turno',
        email: 'cajero@test.com',
        password: pass,
        is_active: true,
        role: role,
      })
    );

    authToken = await JwtUtil.generateToken({
      user_id: cajeroUser.id,
      role_id: role.id,
    });
  });

  afterAll(async () => {
    if (testDataSource && testDataSource.isInitialized) {
      await testDataSource.destroy();
    }
  });

  beforeEach(async () => {
    const cierreRepo = testDataSource.getRepository(CierreCajaEntity);
    await cierreRepo.clear();
    const pedidoRepo = testDataSource.getRepository(PedidoEntity);
    await pedidoRepo.clear();
  });

  describe('POST /api/v1/caja/abrir (Apertura de Caja)', () => {
    it('debe abrir un nuevo turno de caja con monto inicial', async () => {
      const response = await request(app)
        .post('/api/v1/caja/abrir')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          usuario_id: cajeroUser.id,
          usuario_nombre: 'Cajero Turno',
          monto_inicial: 100000,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.monto_inicial).toBe(100000);
      expect(response.body.estado).toBe('Abierto');
    });

    it('debe rechazar abrir dos turnos simultáneos', async () => {
      await request(app)
        .post('/api/v1/caja/abrir')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ usuario_id: cajeroUser.id, usuario_nombre: 'Cajero', monto_inicial: 50000 });

      const response = await request(app)
        .post('/api/v1/caja/abrir')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ usuario_id: cajeroUser.id, usuario_nombre: 'Cajero', monto_inicial: 50000 });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Ya existe un turno de caja abierto');
    });
  });

  describe('GET /api/v1/caja/turno-abierto (Consulta de Turno)', () => {
    it('debe retornar el turno abierto con el cálculo de ventas acumuladas', async () => {
      // Abrir caja
      const abrirRes = await request(app)
        .post('/api/v1/caja/abrir')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ usuario_id: cajeroUser.id, usuario_nombre: 'Cajero', monto_inicial: 100000 });

      const turnoId = abrirRes.body.id;

      // Crear dos pedidos pagados
      const pedidoRepo = testDataSource.getRepository(PedidoEntity);
      await pedidoRepo.save(
        pedidoRepo.create({
          tipo: 'Mesa',
          estado: 'Pagado',
          subtotal: 30000,
          total: 30000,
          metodo_pago: 'Efectivo',
          items: [],
          fecha: new Date(),
        })
      );
      await pedidoRepo.save(
        pedidoRepo.create({
          tipo: 'Domicilio',
          estado: 'Pagado',
          subtotal: 20000,
          total: 20000,
          metodo_pago: 'Transferencia',
          items: [],
          fecha: new Date(),
        })
      );

      const response = await request(app)
        .get('/api/v1/caja/turno-abierto')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.abierto).toBe(true);
      expect(response.body.data.id).toBe(turnoId);
      expect(response.body.data.ventas_efectivo).toBe(30000);
      expect(response.body.data.ventas_transferencia).toBe(20000);
      expect(response.body.data.total_esperado_efectivo).toBe(130000); // 100k inicial + 30k efectivo
    });
  });

  describe('POST /api/v1/caja/:id/cerrar (Cierre y Arqueo de Caja)', () => {
    it('debe rechazar el cierre de caja si hay mesas ocupadas', async () => {
      const abrirRes = await request(app)
        .post('/api/v1/caja/abrir')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ usuario_id: cajeroUser.id, usuario_nombre: 'Cajero', monto_inicial: 50000 });

      const turnoId = abrirRes.body.id;

      // Crear una mesa ocupada
      const mesaRepo = testDataSource.getRepository(MesaEntity);
      const mesaOcupada = await mesaRepo.save(
        mesaRepo.create({
          numero: 99,
          capacidad: 4,
          estado: 'ocupada',
        })
      );

      // Intentar cerrar caja debe fallar (HTTP 400)
      const cierreResFail = await request(app)
        .post(`/api/v1/caja/${turnoId}/cerrar`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          monto_real_contado: 50000,
          notas: 'Intento de cierre con mesa ocupada',
        });

      expect(cierreResFail.status).toBe(400);
      expect(cierreResFail.body.message).toContain('No se puede cerrar la caja del día porque existen');

      // Liberar la mesa
      mesaOcupada.estado = 'libre';
      await mesaRepo.save(mesaOcupada);

      // Ahora el cierre debe ser exitoso
      const cierreResSuccess = await request(app)
        .post(`/api/v1/caja/${turnoId}/cerrar`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          monto_real_contado: 50000,
          notas: 'Cierre sin novedades',
        });

      expect(cierreResSuccess.status).toBe(200);
      expect(cierreResSuccess.body.data.estado).toBe('Cerrado');
      expect(cierreResSuccess.body.data.diferencia).toBe(0);
    });
  });
});
