import request from 'supertest';
import { Application } from 'express';
import { DataSource } from 'typeorm';
import { DatabaseConnection } from '../../../core/database/DatabaseConnection';
import { Server } from '../../../server';
import { RoleEntity } from '../../role/entities/role.entity';
import { UserEntity } from '../../user/entities/user.entity';
import { BcryptUtil } from '../../../utils/bcrypt.util';
import { IngredienteEntity } from '../../inventario/entities/ingrediente.entity';
import { InventarioEntity } from '../../inventario/entities/inventario.entity';
import { MesaEntity } from '../../mesas/entities/mesa.entity';
import { PedidoEntity } from '../../pedidos/entities/pedido.entity';
import { PlatoEntity } from '../../menu/entities/plato.entity';
import { CategoriaEntity } from '../../categorias/entities/categoria.entity';
import { ClienteEntity } from '../../clientes/entities/cliente.entity';
import { ProveedorEntity } from '../../proveedores/entities/proveedor.entity';
import { OrdenCompraEntity } from '../../proveedores/entities/orden-compra.entity';
import { FacturaProveedorEntity } from '../../proveedores/entities/factura-proveedor.entity';
import { HistorialPagoEntity } from '../../proveedores/entities/historial-pago.entity';

describe('AuthController Integration Tests', () => {
  let app: Application;
  let testDataSource: DataSource;
  let adminRole: RoleEntity;
  let userRole: RoleEntity;

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

    // Crear roles iniciales para autenticación con description obligatoria
    const roleRepo = testDataSource.getRepository(RoleEntity);
    adminRole = await roleRepo.save(
      roleRepo.create({ name: 'admin', description: 'Administrador del sistema' })
    );
    userRole = await roleRepo.save(
      roleRepo.create({ name: 'user', description: 'Usuario estándar' })
    );
  });

  afterAll(async () => {
    if (testDataSource && testDataSource.isInitialized) {
      await testDataSource.destroy();
    }
  });

  beforeEach(async () => {
    const userRepo = testDataSource.getRepository(UserEntity);
    await userRepo.clear();
  });

  describe('POST /api/v1/auth/register (Registro de Usuario)', () => {
    it('debe registrar un usuario exitosamente y retornar token JWT', async () => {
      const registerData = {
        name: 'Juan',
        surname: 'Pérez',
        email: 'juan.perez@restausync.com',
        password: 'Password123!',
        role_id: userRole.id,
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(registerData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe(registerData.email);
      expect(response.body).toHaveProperty('token');
      expect(response.body.role.name).toBe('user');
    });

    it('debe retornar HTTP 400 si el email ya se encuentra registrado', async () => {
      const userData = {
        name: 'Maria',
        surname: 'Gómez',
        email: 'maria@restausync.com',
        password: 'Password123!',
        role_id: userRole.id,
      };

      // Registrar primero
      await request(app).post('/api/v1/auth/register').send(userData);

      // Intentar registrar el mismo email
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body).toContain('User Already Exists');
    });

    it('debe retornar HTTP 400 por fallos de validación en la clave o email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Invalid',
          surname: 'User',
          email: 'not-an-email',
          password: '123',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('POST /api/v1/auth/login (Inicio de Sesión)', () => {
    beforeEach(async () => {
      // Crear un usuario activo para probar login
      const userRepo = testDataSource.getRepository(UserEntity);
      const hashedPassword = await BcryptUtil.hashPassword('AdminSecret123!');
      await userRepo.save(
        userRepo.create({
          name: 'Admin',
          surname: 'Sistema',
          email: 'admin@restausync.com',
          password: hashedPassword,
          is_active: true,
          role: adminRole,
        })
      );
    });

    it('debe iniciar sesión con credenciales válidas y retornar JWT', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@restausync.com',
          password: 'AdminSecret123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.email).toBe('admin@restausync.com');
      expect(response.body).toHaveProperty('token');
      expect(response.body.role.name).toBe('admin');
    });

    it('debe retornar HTTP 401 con clave incorrecta', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@restausync.com',
          password: 'WrongPassword!',
        });

      expect(response.status).toBe(401);
      expect(response.body).toBe('Invalid Credentials');
    });

    it('debe retornar HTTP 401 si el usuario no existe', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'inexistente@restausync.com',
          password: 'AdminSecret123!',
        });

      expect(response.status).toBe(401);
      expect(response.body).toBe('Invalid Credentials');
    });

    it('debe retornar HTTP 403 si el usuario está desactivado', async () => {
      const userRepo = testDataSource.getRepository(UserEntity);
      const hashedPassword = await BcryptUtil.hashPassword('Disabled123!');
      await userRepo.save(
        userRepo.create({
          name: 'Inactivo',
          surname: 'Usuario',
          email: 'desactivado@restausync.com',
          password: hashedPassword,
          is_active: false,
          role: userRole,
        })
      );

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'desactivado@restausync.com',
          password: 'Disabled123!',
        });

      expect(response.status).toBe(403);
      expect(response.body).toBe('Account deactivated');
    });
  });
});
