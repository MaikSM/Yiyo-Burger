import request from 'supertest';
import { Application } from 'express';
import { DataSource } from 'typeorm';
import { DatabaseConnection } from '../../../core/database/DatabaseConnection';
import { Server } from '../../../server';
import { ProveedorEntity } from '../entities/proveedor.entity';
import { OrdenCompraEntity } from '../entities/orden-compra.entity';
import { FacturaProveedorEntity } from '../entities/factura-proveedor.entity';
import { HistorialPagoEntity } from '../entities/historial-pago.entity';
import { IngredienteEntity } from '../../inventario/entities/ingrediente.entity';
import { InventarioEntity } from '../../inventario/entities/inventario.entity';
import { RoleEntity } from '../../role/entities/role.entity';
import { UserEntity } from '../../user/entities/user.entity';
import { MesaEntity } from '../../mesas/entities/mesa.entity';
import { PedidoEntity } from '../../pedidos/entities/pedido.entity';
import { PlatoEntity } from '../../menu/entities/plato.entity';
import { CategoriaEntity } from '../../categorias/entities/categoria.entity';
import { ClienteEntity } from '../../clientes/entities/cliente.entity';
import { JwtUtil } from '../../../utils/jwt.util';
import { BcryptUtil } from '../../../utils/bcrypt.util';

describe('ProveedoresController Integration Tests', () => {
  let app: Application;
  let testDataSource: DataSource;
  let adminToken: string;

  beforeAll(async () => {
    // Configurar DataSource de TypeORM en memoria para las pruebas
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

    // Crear rol admin y usuario admin con description requerida
    const roleRepo = testDataSource.getRepository(RoleEntity);
    const adminRole = await roleRepo.save(
      roleRepo.create({ name: 'admin', description: 'Administrador del sistema' })
    );

    const userRepo = testDataSource.getRepository(UserEntity);
    const pass = await BcryptUtil.hashPassword('AdminPass123!');
    const adminUser = await userRepo.save(
      userRepo.create({
        name: 'Admin',
        surname: 'Test',
        email: 'admin.prov@test.com',
        password: pass,
        is_active: true,
        role: adminRole,
      })
    );

    // Generar Token JWT de Admin válido
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
    // Limpiar tabla de proveedores antes de cada prueba
    const repo = testDataSource.getRepository(ProveedorEntity);
    await repo.clear();
  });

  describe('POST /api/v1/proveedores (Crear Proveedor)', () => {
    it('debe crear un nuevo proveedor exitosamente con HTTP 201', async () => {
      const nuevoProveedor = {
        razon_social: 'Distribuidora Lácteos S.A.S.',
        nit: '900123456-1',
        contacto_nombre: 'Carlos Pérez',
        email: 'carlos@lacteos.com',
        telefono: '3001234567',
        dias_plazo: 15,
      };

      const response = await request(app)
        .post('/api/v1/proveedores')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(nuevoProveedor);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.razon_social).toBe(nuevoProveedor.razon_social);
      expect(response.body.nit).toBe(nuevoProveedor.nit);
    });

    it('debe retornar HTTP 400 si el NIT ya existe', async () => {
      const proveedorData = {
        razon_social: 'Distribuidora Carnes',
        nit: '800987654-2',
        email: 'carnes@distribuidora.com',
      };

      // Crear el primero
      await request(app)
        .post('/api/v1/proveedores')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(proveedorData);

      // Intentar duplicar el NIT
      const response = await request(app)
        .post('/api/v1/proveedores')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(proveedorData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Ya existe un proveedor registrado con el NIT');
    });

    it('debe retornar HTTP 400 si falta el NIT obligatorio', async () => {
      const response = await request(app)
        .post('/api/v1/proveedores')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ razon_social: 'Sin NIT S.A.' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('El NIT/ID Fiscal es obligatorio');
    });
  });

  describe('GET /api/v1/proveedores (Obtener Proveedores)', () => {
    it('debe retornar la lista de proveedores ordenados por razón social con saldo pendiente', async () => {
      await request(app)
        .post('/api/v1/proveedores')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          razon_social: 'Bebidas del Valle',
          nit: '111222333-0',
        });
      await request(app)
        .post('/api/v1/proveedores')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          razon_social: 'Avícola San José',
          nit: '444555666-0',
        });

      const response = await request(app)
        .get('/api/v1/proveedores')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      // Debe estar ordenado alfabéticamente por razon_social
      expect(response.body[0].razon_social).toBe('Avícola San José');
      expect(response.body[1].razon_social).toBe('Bebidas del Valle');
      expect(response.body[0]).toHaveProperty('saldo_pendiente', 0);
    });

    it('debe obtener un proveedor específico por ID con HTTP 200', async () => {
      const createRes = await request(app)
        .post('/api/v1/proveedores')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          razon_social: 'Panadería Central',
          nit: '777888999-0',
        });

      const provId = createRes.body.id;
      const getRes = await request(app)
        .get(`/api/v1/proveedores/${provId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.id).toBe(provId);
      expect(getRes.body.razon_social).toBe('Panadería Central');
    });

    it('debe retornar HTTP 404 si el proveedor no existe', async () => {
      const response = await request(app)
        .get('/api/v1/proveedores/9999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/v1/proveedores/:id (Actualizar Proveedor)', () => {
    it('debe actualizar los datos de un proveedor existente', async () => {
      const createRes = await request(app)
        .post('/api/v1/proveedores')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          razon_social: 'Lácteos Antiguos',
          nit: '123456789-0',
          telefono: '3000000000',
        });

      const provId = createRes.body.id;
      const updateRes = await request(app)
        .put(`/api/v1/proveedores/${provId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          razon_social: 'Lácteos Renovados S.A.',
          telefono: '3119998877',
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.razon_social).toBe('Lácteos Renovados S.A.');
      expect(updateRes.body.telefono).toBe('3119998877');
    });
  });

  describe('DELETE /api/v1/proveedores/:id (Eliminado Lógico)', () => {
    it('debe desactivar un proveedor (marcar activo = false)', async () => {
      const createRes = await request(app)
        .post('/api/v1/proveedores')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          razon_social: 'Proveedor a Eliminar',
          nit: '999000111-2',
        });

      const provId = createRes.body.id;
      const delRes = await request(app)
        .delete(`/api/v1/proveedores/${provId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body).toBe('Supplier deleted successfully');

      const getRes = await request(app)
        .get(`/api/v1/proveedores/${provId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getRes.body.activo).toBe(false);
    });
  });
});
