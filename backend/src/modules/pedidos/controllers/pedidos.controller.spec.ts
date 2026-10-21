import request from 'supertest';
import { Application } from 'express';
import { DataSource } from 'typeorm';
import { DatabaseConnection } from '../../../core/database/DatabaseConnection';
import { Server } from '../../../server';
import { RoleEntity } from '../../role/entities/role.entity';
import { UserEntity } from '../../user/entities/user.entity';
import { PedidoEntity } from '../entities/pedido.entity';
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

describe('PedidosController Integration Tests', () => {
  let app: Application;
  let testDataSource: DataSource;
  let authToken: string;

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

    // Crear rol y usuario mesero / admin
    const roleRepo = testDataSource.getRepository(RoleEntity);
    const role = await roleRepo.save(
      roleRepo.create({ name: 'mesero', description: 'Mesero del restaurante' })
    );

    const userRepo = testDataSource.getRepository(UserEntity);
    const pass = await BcryptUtil.hashPassword('MeseroPass123!');
    const user = await userRepo.save(
      userRepo.create({
        name: 'Carlos',
        surname: 'Mesero',
        email: 'carlos.mesero@test.com',
        password: pass,
        is_active: true,
        role: role,
      })
    );

    authToken = await JwtUtil.generateToken({
      user_id: user.id,
      role_id: role.id,
    });
  });

  afterAll(async () => {
    if (testDataSource && testDataSource.isInitialized) {
      await testDataSource.destroy();
    }
  });

  beforeEach(async () => {
    const pedidoRepo = testDataSource.getRepository(PedidoEntity);
    await pedidoRepo.clear();
  });

  describe('POST /api/v1/pedidos (Crear Pedido)', () => {
    it('debe crear un nuevo pedido exitosamente con HTTP 201', async () => {
      const nuevoPedido = {
        tipo: 'Mesa',
        estado: 'Recibido',
        subtotal: 25000,
        impuesto_valor: 4750,
        propina_valor: 2500,
        total: 32250,
        metodo_pago: 'Efectivo',
        cliente_nombre: 'Andrés López',
        mesa: 'Mesa 4',
        items: [
          {
            plato_id: 1,
            nombre: 'Hamburguesa Doble Queso',
            cantidad: 2,
            precio_unitario: 12500,
          },
        ],
      };

      const response = await request(app)
        .post('/api/v1/pedidos')
        .set('Authorization', `Bearer ${authToken}`)
        .send(nuevoPedido);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.tipo).toBe('Mesa');
      expect(response.body.total).toBe(32250);
      expect(response.body.cliente_nombre).toBe('Andrés López');
      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body.items.length).toBe(1);
    });
  });

  describe('GET /api/v1/pedidos (Obtener Pedidos)', () => {
    it('debe listar los pedidos ordenados por fecha descendente', async () => {
      const pedidoRepo = testDataSource.getRepository(PedidoEntity);
      await pedidoRepo.save(
        pedidoRepo.create({
          tipo: 'Domicilio',
          estado: 'En Preparación',
          subtotal: 18000,
          impuesto_valor: 3420,
          propina_valor: 0,
          total: 21420,
          cliente_nombre: 'Laura Torres',
          items: [{ nombre: 'Pizza Familiar', cantidad: 1 }],
        })
      );

      const response = await request(app)
        .get('/api/v1/pedidos')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].cliente_nombre).toBe('Laura Torres');
    });
  });

  describe('PUT /api/v1/pedidos/:id (Actualizar Estado de Pedido)', () => {
    it('debe actualizar el estado de un pedido a Servido / Pagado', async () => {
      const pedidoRepo = testDataSource.getRepository(PedidoEntity);
      const pedido = await pedidoRepo.save(
        pedidoRepo.create({
          tipo: 'Mesa',
          estado: 'Recibido',
          subtotal: 10000,
          total: 10000,
          mesa: 'Mesa 1',
          items: [],
        })
      );

      const response = await request(app)
        .put(`/api/v1/pedidos/${pedido.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          estado: 'Pagado',
          metodo_pago: 'Transferencia',
        });

      expect(response.status).toBe(200);
      expect(response.body.estado).toBe('Pagado');
      expect(response.body.metodo_pago).toBe('Transferencia');
    });

    it('debe retornar 404 si el ID del pedido no existe', async () => {
      const response = await request(app)
        .put('/api/v1/pedidos/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ estado: 'Cancelado' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/pedidos/:id (Eliminar Pedido)', () => {
    it('debe eliminar un pedido por UUID', async () => {
      const pedidoRepo = testDataSource.getRepository(PedidoEntity);
      const pedido = await pedidoRepo.save(
        pedidoRepo.create({
          tipo: 'Domicilio',
          estado: 'Cancelado',
          subtotal: 5000,
          total: 5000,
          items: [],
        })
      );

      const delRes = await request(app)
        .delete(`/api/v1/pedidos/${pedido.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.message).toBe('Pedido eliminado correctamente');
    });
  });
});
