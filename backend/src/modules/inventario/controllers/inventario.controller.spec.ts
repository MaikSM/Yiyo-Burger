import request from 'supertest';
import { Application } from 'express';
import { DataSource } from 'typeorm';
import { DatabaseConnection } from '../../../core/database/DatabaseConnection';
import { Server } from '../../../server';
import { RoleEntity } from '../../role/entities/role.entity';
import { UserEntity } from '../../user/entities/user.entity';
import { IngredienteEntity } from '../entities/ingrediente.entity';
import { InventarioEntity } from '../entities/inventario.entity';
import { MesaEntity } from '../../mesas/entities/mesa.entity';
import { PedidoEntity } from '../../pedidos/entities/pedido.entity';
import { PlatoEntity } from '../../menu/entities/plato.entity';
import { CategoriaEntity } from '../../categorias/entities/categoria.entity';
import { ClienteEntity } from '../../clientes/entities/cliente.entity';
import { ProveedorEntity } from '../../proveedores/entities/proveedor.entity';
import { OrdenCompraEntity } from '../../proveedores/entities/orden-compra.entity';
import { FacturaProveedorEntity } from '../../proveedores/entities/factura-proveedor.entity';
import { HistorialPagoEntity } from '../../proveedores/entities/historial-pago.entity';
import { JwtUtil } from '../../../utils/jwt.util';
import { BcryptUtil } from '../../../utils/bcrypt.util';

describe('InventarioController Integration Tests', () => {
  let app: Application;
  let testDataSource: DataSource;
  let adminToken: string;
  let adminUser: UserEntity;
  let ingrediente: IngredienteEntity;

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
      ],
    });

    await testDataSource.initialize();
    DatabaseConnection.appDataSource = testDataSource;

    const server = new Server();
    app = await server.initForTesting();

    // Crear rol admin y usuario admin
    const roleRepo = testDataSource.getRepository(RoleEntity);
    const adminRole = await roleRepo.save(
      roleRepo.create({ name: 'admin', description: 'Administrador del sistema' })
    );

    const userRepo = testDataSource.getRepository(UserEntity);
    const pass = await BcryptUtil.hashPassword('AdminPass123!');
    adminUser = await userRepo.save(
      userRepo.create({
        name: 'Admin',
        surname: 'Test',
        email: 'admin.inv@test.com',
        password: pass,
        is_active: true,
        role: adminRole,
      })
    );

    adminToken = await JwtUtil.generateToken({
      user_id: adminUser.id,
      role_id: adminRole.id,
    });
  });

  afterAll(async () => {
    if (testDataSource && testDataSource.isInitialized) {
      await testDataSource.destroy();
    }
  });

  beforeEach(async () => {
    // Crear un ingrediente base para asociar a los movimientos
    const ingRepo = testDataSource.getRepository(IngredienteEntity);
    await ingRepo.clear();
    ingrediente = await ingRepo.save(
      ingRepo.create({
        nombre: 'Carne Molida Premium',
        unidad_medida: 'KG',
        stock_actual: 50,
        stock_minimo: 10,
        costo_unitario: 15000,
      })
    );

    const invRepo = testDataSource.getRepository(InventarioEntity);
    await invRepo.clear();
  });

  describe('POST /api/v1/inventario (Registrar Movimiento de Inventario)', () => {
    it('debe registrar una ENTRADA de inventario exitosamente con HTTP 201', async () => {
      const movimientoData = {
        ingrediente_id: ingrediente.ingrediente_id,
        usuario_id: adminUser.id,
        cantidad: 20,
        tipo_movimiento: 'ENTRADA',
        fecha: new Date().toISOString(),
        motivo: 'Compra a proveedor de carne',
        costo_total: 300000,
      };

      const response = await request(app)
        .post('/api/v1/inventario')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(movimientoData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('movimiento_id');
      expect(response.body.ingrediente_id).toBe(ingrediente.ingrediente_id);
      expect(response.body.cantidad).toBe(20);
      expect(response.body.tipo_movimiento).toBe('ENTRADA');
    });

    it('debe retornar HTTP 400 si faltan campos obligatorios en el movimiento', async () => {
      const response = await request(app)
        .post('/api/v1/inventario')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ingrediente_id: ingrediente.ingrediente_id,
          // Faltan cantidad, usuario_id, etc.
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('GET /api/v1/inventario (Obtener Movimientos)', () => {
    it('debe retornar la lista de movimientos de inventario', async () => {
      const invRepo = testDataSource.getRepository(InventarioEntity);
      await invRepo.save(
        invRepo.create({
          ingrediente_id: ingrediente.ingrediente_id,
          usuario_id: adminUser.id,
          cantidad: 10,
          tipo_movimiento: 'ENTRADA',
          fecha: new Date(),
          motivo: 'Carga inicial',
          costo_total: 150000,
        })
      );

      const response = await request(app)
        .get('/api/v1/inventario')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].cantidad).toBe(10);
      expect(response.body[0].tipo_movimiento).toBe('ENTRADA');
    });

    it('debe obtener un movimiento específico por ID con HTTP 200', async () => {
      const invRepo = testDataSource.getRepository(InventarioEntity);
      const mov = await invRepo.save(
        invRepo.create({
          ingrediente_id: ingrediente.ingrediente_id,
          usuario_id: adminUser.id,
          cantidad: 5,
          tipo_movimiento: 'SALIDA',
          fecha: new Date(),
          motivo: 'Merma por vencimiento',
          costo_total: 75000,
        })
      );

      const response = await request(app)
        .get(`/api/v1/inventario/${mov.movimiento_id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.movimiento_id).toBe(mov.movimiento_id);
      expect(response.body.tipo_movimiento).toBe('SALIDA');
    });

    it('debe retornar HTTP 404 si el movimiento no existe', async () => {
      const response = await request(app)
        .get('/api/v1/inventario/9999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/inventario/:id (Eliminar Movimiento)', () => {
    it('debe eliminar un movimiento de inventario exitosamente', async () => {
      const invRepo = testDataSource.getRepository(InventarioEntity);
      const mov = await invRepo.save(
        invRepo.create({
          ingrediente_id: ingrediente.ingrediente_id,
          usuario_id: adminUser.id,
          cantidad: 2,
          tipo_movimiento: 'SALIDA',
          fecha: new Date(),
          motivo: 'Ajuste de inventario',
          costo_total: 30000,
        })
      );

      const delRes = await request(app)
        .delete(`/api/v1/inventario/${mov.movimiento_id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body).toBe('Inventario Deleted Successfully');
    });
  });
});
