// Importa los tipos Request y Response de Express para manejar solicitudes y respuestas HTTP.
import { Request, Response } from 'express';

// Importa la clase Repository de TypeORM para interactuar con la base de datos.
import { Repository } from 'typeorm';

// Importa la entidad RoleEntity, que representa la tabla de roles en la base de datos.
import { RoleEntity } from '../../role/entities/role.entity';

// Importa la entidad UserEntity, que representa la tabla de usuarios en la base de datos.
import { UserEntity } from '../../user/entities/user.entity';

// Importa la entidad InventarioEntity, que representa la tabla de inventario en la base de datos.
import { InventarioEntity } from '../../inventario/entities/inventario.entity';

// Importa la entidad MesaEntity, que representa la tabla de mesas en la base de datos.
import { MesaEntity } from '../../mesas/entities/mesa.entity';

// Importa la entidad PlatoEntity, que representa la tabla de platos en la base de datos.
import { PlatoEntity } from '../../menu/entities/plato.entity';

// Importa la entidad AsistenciaEntity
import { AsistenciaEntity } from '../../asistencia/entities/asistencia.entity';

// Importa la entidad CategoriaEntity
import { CategoriaEntity } from '../../categorias/entities/categoria.entity';

// Importa el seeder de asistencias
import { AsistenciasSeeder } from '../asistencias.seeder';

// Importa la clase DatabaseConnection para obtener la conexión con la base de datos.
import { DatabaseConnection } from '../../database/DatabaseConnection';

// Importa la utilidad BcryptUtil para hashear contraseñas de forma segura.
import { BcryptUtil } from '../../../utils/bcrypt.util';

// Importa la función plainToClass para convertir objetos planos en instancias de clases.
import { plainToClass } from 'class-transformer';

// Define la clase SeederController que se encargará de crear roles y usuarios de prueba en la base de datos.
export class SeederController {
  // Define seis repositorios privados para interactuar con las tablas de roles, usuarios, inventario, mesas, platos y asistencias.
  private roleRepository: Repository<RoleEntity>;
  private userRepository: Repository<UserEntity>;
  private inventarioRepository: Repository<InventarioEntity>;
  private mesaRepository: Repository<MesaEntity>;
  private platoRepository: Repository<PlatoEntity>;
  private asistenciaRepository: Repository<AsistenciaEntity>;

  // Constructor de la clase que inicializa los repositorios utilizando la conexión a la base de datos.
  constructor() {
    this.roleRepository = DatabaseConnection.appDataSource.getRepository(
      RoleEntity, // Obtiene el repositorio para la entidad RoleEntity.
    );

    this.userRepository = DatabaseConnection.appDataSource.getRepository(
      UserEntity, // Obtiene el repositorio para la entidad UserEntity.
    );

    this.inventarioRepository = DatabaseConnection.appDataSource.getRepository(
      InventarioEntity, // Obtiene el repositorio para la entidad InventarioEntity.
    );

    this.mesaRepository = DatabaseConnection.appDataSource.getRepository(
      MesaEntity, // Obtiene el repositorio para la entidad MesaEntity.
    );

    this.platoRepository = DatabaseConnection.appDataSource.getRepository(
      PlatoEntity, // Obtiene el repositorio para la entidad PlatoEntity.
    );

    this.asistenciaRepository = DatabaseConnection.appDataSource.getRepository(
      AsistenciaEntity, // Obtiene el repositorio para la entidad AsistenciaEntity.
    );
  }

  // Método público asincrónico que siembra roles y usuarios en la base de datos.
  public async seedRolesUsers(
    _: Request, // No se usa la solicitud (por eso el guion bajo).
    res: Response, // Respuesta HTTP que se enviará al cliente.
  ): Promise<Response> {
    try {
      /* Admin Seed */
      // Busca o crea un rol de administrador en la base de datos.
      let adminRole = await this.roleRepository.findOne({
        where: { name: 'admin' },
      });
      if (!adminRole) {
        await this.roleRepository.query(
          'INSERT IGNORE INTO roles (name, description, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
          ['admin', 'Admin Role'],
        );
        adminRole = await this.roleRepository.findOne({
          where: { name: 'admin' },
        });
        if (!adminRole) throw new Error('Failed to create or find admin role');
      }

      // Busca o crea un usuario administrador asociado al rol.
      let adminUser = await this.userRepository.findOne({
        where: { email: 'admin@admin.com' },
      });
      if (!adminUser) {
        await this.userRepository.query(
          'INSERT IGNORE INTO users (name, surname, email, password, role_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
          [
            'Administrator',
            'System',
            'admin@admin.com',
            await BcryptUtil.hashPassword('12345678'),
            adminRole.id,
          ],
        );
        adminUser = await this.userRepository.findOne({
          where: { email: 'admin@admin.com' },
        });
        if (!adminUser) throw new Error('Failed to create or find admin user');
      }
      /* Admin Seed */

      /* User Seed */
      // Busca o crea un rol de usuario estándar en la base de datos.
      let userRole = await this.roleRepository.findOne({
        where: { name: 'user' },
      });
      if (!userRole) {
        await this.roleRepository.query(
          'INSERT IGNORE INTO roles (name, description, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
          ['user', 'User Role'],
        );
        userRole = await this.roleRepository.findOne({
          where: { name: 'user' },
        });
        if (!userRole) throw new Error('Failed to create or find user role');
      }

      // Busca o crea un usuario estándar asociado al rol de usuario.
      let userUser = await this.userRepository.findOne({
        where: { email: 'user@user.com' },
      });
      if (!userUser) {
        await this.userRepository.query(
          'INSERT IGNORE INTO users (name, surname, email, password, role_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
          [
            'User',
            'System',
            'user@user.com',
            await BcryptUtil.hashPassword('12345678'),
            userRole.id,
          ],
        );
        userUser = await this.userRepository.findOne({
          where: { email: 'user@user.com' },
        });
        if (!userUser) throw new Error('Failed to create or find user user');
      }
      /* User Seed */

      /* Guest Seed */
      // Busca o crea un rol de invitado en la base de datos.
      let guestRole = await this.roleRepository.findOne({
        where: { name: 'guest' },
      });
      if (!guestRole) {
        await this.roleRepository.query(
          'INSERT IGNORE INTO roles (name, description, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
          ['guest', 'Guest Role'],
        );
        guestRole = await this.roleRepository.findOne({
          where: { name: 'guest' },
        });
        if (!guestRole) throw new Error('Failed to create or find guest role');
      }

      // Busca o crea un usuario invitado asociado al rol de invitado.
      let guestUser = await this.userRepository.findOne({
        where: { email: 'guest@guest.com' },
      });
      if (!guestUser) {
        await this.userRepository.query(
          'INSERT IGNORE INTO users (name, surname, email, password, role_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
          [
            'Guest',
            'System',
            'guest@guest.com',
            await BcryptUtil.hashPassword('12345678'),
            guestRole.id,
          ],
        );
        guestUser = await this.userRepository.findOne({
          where: { email: 'guest@guest.com' },
        });
        if (!guestUser) throw new Error('Failed to create or find guest user');
      }
      /* Guest Seed */

      /* Mesero Seed */
      // Busca o crea un rol de mesero en la base de datos.
      let meseroRole = await this.roleRepository.findOne({
        where: { name: 'mesero' },
      });
      if (!meseroRole) {
        await this.roleRepository.query(
          'INSERT IGNORE INTO roles (name, description, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
          ['mesero', 'Mesero Role'],
        );
        meseroRole = await this.roleRepository.findOne({
          where: { name: 'mesero' },
        });
        if (!meseroRole)
          throw new Error('Failed to create or find mesero role');
      }

      // Busca o crea un usuario mesero asociado al rol de mesero.
      let meseroUser = await this.userRepository.findOne({
        where: { email: 'juan@juan.com' },
      });
      if (!meseroUser) {
        await this.userRepository.query(
          'INSERT IGNORE INTO users (name, surname, email, password, role_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
          [
            'Juan',
            'Pérez',
            'juan@juan.com',
            await BcryptUtil.hashPassword('12345678'),
            meseroRole.id,
          ],
        );
        meseroUser = await this.userRepository.findOne({
          where: { email: 'juan@juan.com' },
        });
        if (!meseroUser)
          throw new Error('Failed to create or find mesero user');
      }
      /* Mesero Seed */

      // Siembra movimientos de inventario después de crear roles y usuarios.
      const inventarioMovimientos = await this.seedInventario();

      // Siembra asistencias después de crear roles y usuarios.
      const asistenciasData = await AsistenciasSeeder.seed();

      // Siembra categorías primero
      const categoriasData = [
        // Categorías de menú
        { nombre: 'Entradas', descripcion: 'Platos de entrada y aperitivos', tipo: 'menu' as const, activo: true },
        { nombre: 'Platos Principales', descripcion: 'Platos principales y fuertes', tipo: 'menu' as const, activo: true },
        { nombre: 'Postres', descripcion: 'Postres y dulces', tipo: 'menu' as const, activo: true },
        { nombre: 'Bebidas', descripcion: 'Bebidas calientes y frías', tipo: 'menu' as const, activo: true },
        { nombre: 'Ensaladas', descripcion: 'Ensaladas frescas y saludables', tipo: 'menu' as const, activo: true },
        { nombre: 'Sopas', descripcion: 'Sopas y caldos', tipo: 'menu' as const, activo: true },
        { nombre: 'Pizzas', descripcion: 'Pizzas artesanales', tipo: 'menu' as const, activo: true },
        { nombre: 'Hamburguesas', descripcion: 'Hamburguesas gourmet', tipo: 'menu' as const, activo: true },
        { nombre: 'Pasta', descripcion: 'Platos de pasta italiana', tipo: 'menu' as const, activo: true },
        { nombre: 'Carnes', descripcion: 'Cortes de carne premium', tipo: 'menu' as const, activo: true },
        { nombre: 'Pescados', descripcion: 'Platos de pescado y mariscos', tipo: 'menu' as const, activo: true },
        { nombre: 'Vegetariano', descripcion: 'Platos vegetarianos', tipo: 'menu' as const, activo: true },

        // Categorías de inventario
        { nombre: 'Verduras', descripcion: 'Verduras frescas', tipo: 'inventario' as const, activo: true },
        { nombre: 'Frutas', descripcion: 'Frutas frescas', tipo: 'inventario' as const, activo: true },
        { nombre: 'Carnes', descripcion: 'Cortes de carne', tipo: 'inventario' as const, activo: true },
        { nombre: 'Pescados', descripcion: 'Productos del mar', tipo: 'inventario' as const, activo: true },
        { nombre: 'Lácteos', descripcion: 'Productos lácteos', tipo: 'inventario' as const, activo: true },
        { nombre: 'Especias', descripcion: 'Especias y condimentos', tipo: 'inventario' as const, activo: true },
        { nombre: 'Harinas', descripcion: 'Harinas y cereales', tipo: 'inventario' as const, activo: true },
        { nombre: 'Aceites', descripcion: 'Aceites y grasas', tipo: 'inventario' as const, activo: true },
      ];

      // Importar el repositorio de categorías
      const categoriaRepository = DatabaseConnection.appDataSource.getRepository(CategoriaEntity);

      for (const categoriaData of categoriasData) {
        const existing = await categoriaRepository.findOne({
          where: { nombre: categoriaData.nombre, tipo: categoriaData.tipo },
        });

        if (!existing) {
          await categoriaRepository.save(
            plainToClass(CategoriaEntity, categoriaData),
          );
        }
      }

      // Siembra platos después de crear roles y usuarios.
      const platosData = [
        // Entradas
        {
          nombre: 'Ensalada César',
          descripcion: 'Lechuga romana fresca con aderezo César, crutones y queso parmesano',
          precio: 25000,
          categoria: 'Entradas',
          disponible: true,
          tiempo_preparacion_minutos: 10,
          alergenos: ['lácteos', 'gluten'],
        },
        {
          nombre: 'Sopa de Tomate',
          descripcion: 'Sopa cremosa de tomate con albahaca fresca y un toque de crema',
          precio: 18000,
          categoria: 'Entradas',
          disponible: true,
          tiempo_preparacion_minutos: 15,
          alergenos: ['lácteos'],
        },
        {
          nombre: 'Bruschetta Italiana',
          descripcion: 'Pan tostado con tomate fresco, albahaca, ajo y aceite de oliva',
          precio: 15000,
          categoria: 'Entradas',
          disponible: true,
          tiempo_preparacion_minutos: 8,
          alergenos: ['gluten'],
        },
        {
          nombre: 'Patatas Bravas',
          descripcion: 'Patatas fritas con salsa brava picante y alioli',
          precio: 12000,
          categoria: 'Entradas',
          disponible: true,
          tiempo_preparacion_minutos: 12,
          alergenos: [],
        },

        // Platos Principales
        {
          nombre: 'Filete de Salmón a la Parrilla',
          descripcion: 'Salmón fresco a la parrilla con verduras asadas y salsa de limón',
          precio: 45000,
          categoria: 'Platos Principales',
          disponible: true,
          tiempo_preparacion_minutos: 20,
          alergenos: ['pescado'],
        },
        {
          nombre: 'Pasta Carbonara',
          descripcion: 'Pasta fresca con salsa carbonara, panceta y queso pecorino',
          precio: 35000,
          categoria: 'Platos Principales',
          disponible: true,
          tiempo_preparacion_minutos: 18,
          alergenos: ['gluten', 'lácteos', 'huevos'],
        },
        {
          nombre: 'Pollo al Curry',
          descripcion: 'Pollo tierno en salsa de curry con arroz basmati y verduras',
          precio: 28000,
          categoria: 'Platos Principales',
          disponible: true,
          tiempo_preparacion_minutos: 25,
          alergenos: [],
        },
        {
          nombre: 'Entrecot de Ternera',
          descripcion: 'Entrecot de ternera premium con patatas y verduras de temporada',
          precio: 55000,
          categoria: 'Platos Principales',
          disponible: true,
          tiempo_preparacion_minutos: 22,
          alergenos: [],
        },
        {
          nombre: 'Risotto de Setas',
          descripcion: 'Risotto cremoso con setas silvestres y queso parmesano',
          precio: 32000,
          categoria: 'Platos Principales',
          disponible: true,
          tiempo_preparacion_minutos: 30,
          alergenos: ['lácteos'],
        },

        // Pizzas
        {
          nombre: 'Pizza Margherita',
          descripcion: 'Pizza clásica con salsa de tomate, mozzarella fresca y albahaca',
          precio: 28000,
          categoria: 'Pizzas',
          disponible: true,
          tiempo_preparacion_minutos: 15,
          alergenos: ['gluten', 'lácteos'],
        },
        {
          nombre: 'Pizza Pepperoni',
          descripcion: 'Pizza con pepperoni, mozzarella y salsa de tomate picante',
          precio: 32000,
          categoria: 'Pizzas',
          disponible: true,
          tiempo_preparacion_minutos: 16,
          alergenos: ['gluten', 'lácteos'],
        },
        {
          nombre: 'Pizza Vegetariana',
          descripcion: 'Pizza con verduras asadas, mozzarella y pesto',
          precio: 30000,
          categoria: 'Pizzas',
          disponible: true,
          tiempo_preparacion_minutos: 17,
          alergenos: ['gluten', 'lácteos'],
        },

        // Hamburguesas
        {
          nombre: 'Hamburguesa Clásica',
          descripcion: 'Hamburguesa de ternera con lechuga, tomate, cebolla y queso cheddar',
          precio: 22000,
          categoria: 'Hamburguesas',
          disponible: true,
          tiempo_preparacion_minutos: 12,
          alergenos: ['gluten', 'lácteos'],
        },
        {
          nombre: 'Hamburguesa BBQ',
          descripcion: 'Hamburguesa con salsa BBQ, bacon, queso y aros de cebolla',
          precio: 25000,
          categoria: 'Hamburguesas',
          disponible: true,
          tiempo_preparacion_minutos: 14,
          alergenos: ['gluten', 'lácteos'],
        },
        {
          nombre: 'Hamburguesa Vegetariana',
          descripcion: 'Hamburguesa de garbanzos con verduras y queso feta',
          precio: 20000,
          categoria: 'Hamburguesas',
          disponible: true,
          tiempo_preparacion_minutos: 10,
          alergenos: ['gluten', 'lácteos'],
        },

        // Pasta
        {
          nombre: 'Spaghetti Bolognese',
          descripcion: 'Spaghetti con salsa bolognese tradicional y queso parmesano',
          precio: 21.00,
          categoria: 'Pasta',
          disponible: true,
          tiempo_preparacion_minutos: 20,
          alergenos: ['gluten', 'lácteos'],
        },
        {
          nombre: 'Penne Arrabbiata',
          descripcion: 'Penne con salsa arrabbiata picante y albahaca fresca',
          precio: 19.50,
          categoria: 'Pasta',
          disponible: true,
          tiempo_preparacion_minutos: 16,
          alergenos: ['gluten'],
        },
        {
          nombre: 'Lasagna de Carne',
          descripcion: 'Lasagna tradicional con carne molida, bechamel y queso',
          precio: 25.00,
          categoria: 'Pasta',
          disponible: true,
          tiempo_preparacion_minutos: 35,
          alergenos: ['gluten', 'lácteos', 'huevos'],
        },

        // Carnes
        {
          nombre: 'Churrasco Argentino',
          descripcion: 'Churrasco de ternera premium con chimichurri y papas fritas',
          precio: 35.00,
          categoria: 'Carnes',
          disponible: true,
          tiempo_preparacion_minutos: 25,
          alergenos: [],
        },
        {
          nombre: 'Costillas BBQ',
          descripcion: 'Costillas de cerdo con salsa BBQ casera y ensalada col',
          precio: 29.00,
          categoria: 'Carnes',
          disponible: true,
          tiempo_preparacion_minutos: 40,
          alergenos: [],
        },

        // Pescados
        {
          nombre: 'Lubina a la Sal',
          descripcion: 'Lubina fresca cocida al horno con hierbas y limón',
          precio: 30.00,
          categoria: 'Pescados',
          disponible: true,
          tiempo_preparacion_minutos: 28,
          alergenos: ['pescado'],
        },
        {
          nombre: 'Gambas al Ajillo',
          descripcion: 'Gambas frescas salteadas con ajo, guindilla y aceite de oliva',
          precio: 27.00,
          categoria: 'Pescados',
          disponible: true,
          tiempo_preparacion_minutos: 12,
          alergenos: ['crustáceos'],
        },

        // Vegetariano
        {
          nombre: 'Falafel Bowl',
          descripcion: 'Falafel con hummus, tabbouleh y verduras asadas',
          precio: 17.00,
          categoria: 'Vegetariano',
          disponible: true,
          tiempo_preparacion_minutos: 15,
          alergenos: ['sésamo'],
        },
        {
          nombre: 'Risotto de Verduras',
          descripcion: 'Risotto cremoso con verduras de temporada y queso parmesano',
          precio: 20.00,
          categoria: 'Vegetariano',
          disponible: true,
          tiempo_preparacion_minutos: 25,
          alergenos: ['lácteos'],
        },

        // Postres
        {
          nombre: 'Tiramisú',
          descripcion: 'Clásico postre italiano con café, mascarpone y cacao',
          precio: 12000,
          categoria: 'Postres',
          disponible: true,
          tiempo_preparacion_minutos: 5,
          alergenos: ['gluten', 'lácteos', 'huevos'],
        },
        {
          nombre: 'Frutas Frescas de Temporada',
          descripcion: 'Selección de frutas frescas con miel y menta',
          precio: 8000,
          categoria: 'Postres',
          disponible: true,
          tiempo_preparacion_minutos: 3,
          alergenos: [],
        },
        {
          nombre: 'Crème Brûlée',
          descripcion: 'Postre francés con crema catalana y azúcar caramelizado',
          precio: 15000,
          categoria: 'Postres',
          disponible: true,
          tiempo_preparacion_minutos: 8,
          alergenos: ['lácteos', 'huevos'],
        },
        {
          nombre: 'Tarta de Chocolate',
          descripcion: 'Tarta de chocolate negro con ganache y frutos rojos',
          precio: 16000,
          categoria: 'Postres',
          disponible: true,
          tiempo_preparacion_minutos: 6,
          alergenos: ['gluten', 'lácteos', 'huevos'],
        },

        // Bebidas
        {
          nombre: 'Café Espresso',
          descripcion: 'Café espresso italiano recién preparado',
          precio: 4000,
          categoria: 'Bebidas',
          disponible: true,
          tiempo_preparacion_minutos: 2,
          alergenos: [],
        },
        {
          nombre: 'Jugo de Naranja Natural',
          descripcion: 'Jugo fresco de naranjas exprimidas en el momento',
          precio: 6000,
          categoria: 'Bebidas',
          disponible: true,
          tiempo_preparacion_minutos: 1,
          alergenos: [],
        },
        {
          nombre: 'Agua Mineral',
          descripcion: 'Agua mineral con gas o sin gas',
          precio: 3000,
          categoria: 'Bebidas',
          disponible: true,
          tiempo_preparacion_minutos: 1,
          alergenos: [],
        },
        {
          nombre: 'Coca Cola',
          descripcion: 'Refresco de cola clásico',
          precio: 3500,
          categoria: 'Bebidas',
          disponible: true,
          tiempo_preparacion_minutos: 1,
          alergenos: [],
        },
        {
          nombre: 'Vino Tinto',
          descripcion: 'Vino tinto de la casa (copa)',
          precio: 18000,
          categoria: 'Bebidas',
          disponible: true,
          tiempo_preparacion_minutos: 1,
          alergenos: ['sulfitos'],
        },

        // Ensaladas
        {
          nombre: 'Ensalada Mediterránea',
          descripcion: 'Mezcla de lechugas, tomates cherry, aceitunas, queso feta y aderezo de oliva',
          precio: 16.00,
          categoria: 'Ensaladas',
          disponible: true,
          tiempo_preparacion_minutos: 8,
          alergenos: ['lácteos'],
        },
        {
          nombre: 'Ensalada de Quinoa',
          descripcion: 'Quinoa con verduras asadas, aguacate y vinagreta de limón',
          precio: 14.50,
          categoria: 'Ensaladas',
          disponible: true,
          tiempo_preparacion_minutos: 10,
          alergenos: [],
        },
        {
          nombre: 'Ensalada César Clásica',
          descripcion: 'Lechuga romana, crutones, queso parmesano y aderezo César',
          precio: 15.50,
          categoria: 'Ensaladas',
          disponible: true,
          tiempo_preparacion_minutos: 8,
          alergenos: ['lácteos', 'gluten'],
        },
        {
          nombre: 'Ensalada Caprese',
          descripcion: 'Tomates frescos, mozzarella, albahaca y aceite de oliva',
          precio: 17.00,
          categoria: 'Ensaladas',
          disponible: true,
          tiempo_preparacion_minutos: 5,
          alergenos: ['lácteos'],
        },

        // Más entradas
        {
          nombre: 'Calamares Andaluces Especiales',
          descripcion: 'Calamares rebozados y fritos con alioli',
          precio: 18.50,
          categoria: 'Entradas',
          disponible: true,
          tiempo_preparacion_minutos: 15,
          alergenos: ['moluscos', 'gluten'],
        },
        {
          nombre: 'Croquetas Ibéricas Premium',
          descripcion: 'Croquetas caseras de jamón ibérico con bechamel',
          precio: 14.00,
          categoria: 'Entradas',
          disponible: true,
          tiempo_preparacion_minutos: 12,
          alergenos: ['gluten', 'lácteos'],
        },
        {
          nombre: 'Tartar de Atún Premium',
          descripcion: 'Atún fresco picado con aguacate y sésamo',
          precio: 22.00,
          categoria: 'Entradas',
          disponible: true,
          tiempo_preparacion_minutos: 10,
          alergenos: ['pescado', 'sésamo'],
        },

        // Más platos principales
        {
          nombre: 'Risotto con Trufa Negra',
          descripcion: 'Risotto cremoso con champiñones silvestres y trufa',
          precio: 25.00,
          categoria: 'Platos Principales',
          disponible: true,
          tiempo_preparacion_minutos: 30,
          alergenos: ['lácteos'],
        },
        {
          nombre: 'Pierna de Cordero Premium',
          descripcion: 'Pierna de cordero asada con hierbas y verduras',
          precio: 34.00,
          categoria: 'Platos Principales',
          disponible: true,
          tiempo_preparacion_minutos: 45,
          alergenos: [],
        },
        {
          nombre: 'Salmón Teriyaki Gourmet',
          descripcion: 'Salmón a la parrilla con salsa teriyaki y verduras',
          precio: 29.00,
          categoria: 'Platos Principales',
          disponible: true,
          tiempo_preparacion_minutos: 20,
          alergenos: ['pescado', 'soja'],
        },
        {
          nombre: 'Lasagna Tradicional Italiana',
          descripcion: 'Lasagna tradicional con carne molida y bechamel',
          precio: 23.00,
          categoria: 'Platos Principales',
          disponible: true,
          tiempo_preparacion_minutos: 40,
          alergenos: ['gluten', 'lácteos'],
        },

        // Más pizzas
        {
          nombre: 'Pizza 4 Quesos',
          descripcion: 'Pizza con mozzarella, gorgonzola, parmesano y ricotta',
          precio: 21.00,
          categoria: 'Pizzas',
          disponible: true,
          tiempo_preparacion_minutos: 18,
          alergenos: ['gluten', 'lácteos'],
        },
        {
          nombre: 'Pizza BBQ',
          descripcion: 'Pizza con carne, salsa barbacoa, cebolla y queso',
          precio: 22.50,
          categoria: 'Pizzas',
          disponible: true,
          tiempo_preparacion_minutos: 17,
          alergenos: ['gluten', 'lácteos'],
        },

        // Más hamburguesas
        {
          nombre: 'Hamburguesa de Pollo Crispy',
          descripcion: 'Hamburguesa de pollo con lechuga, tomate y mayonesa',
          precio: 15.50,
          categoria: 'Hamburguesas',
          disponible: true,
          tiempo_preparacion_minutos: 12,
          alergenos: ['gluten'],
        },
        {
          nombre: 'Hamburguesa Deluxe',
          descripcion: 'Hamburguesa con bacon, huevo, queso y salsa especial',
          precio: 19.50,
          categoria: 'Hamburguesas',
          disponible: true,
          tiempo_preparacion_minutos: 15,
          alergenos: ['gluten', 'lácteos', 'huevos'],
        },

        // Más pastas
        {
          nombre: 'Fettuccine con Alfredo',
          descripcion: 'Fettuccine con salsa alfredo cremosa y parmesano',
          precio: 20.50,
          categoria: 'Pasta',
          disponible: true,
          tiempo_preparacion_minutos: 18,
          alergenos: ['gluten', 'lácteos'],
        },
        {
          nombre: 'Pasta con Pesto',
          descripcion: 'Pasta con pesto de albahaca, piñones y parmesano',
          precio: 19.00,
          categoria: 'Pasta',
          disponible: true,
          tiempo_preparacion_minutos: 15,
          alergenos: ['gluten', 'lácteos', 'frutos secos'],
        },

        // Más carnes
        {
          nombre: 'Beef Wellington',
          descripcion: 'Solomillo envuelto en hojaldre con duxelles de champiñones',
          precio: 42.00,
          categoria: 'Carnes',
          disponible: true,
          tiempo_preparacion_minutos: 50,
          alergenos: ['gluten'],
        },
        {
          nombre: 'Costillas BBQ Premium',
          descripcion: 'Costillas de cerdo ahumadas con salsa barbacoa casera',
          precio: 31.00,
          categoria: 'Carnes',
          disponible: true,
          tiempo_preparacion_minutos: 60,
          alergenos: [],
        },

        // Más pescados
        {
          nombre: 'Dorada Mediterránea',
          descripcion: 'Dorada fresca al horno con hierbas y limón',
          precio: 27.00,
          categoria: 'Pescados',
          disponible: true,
          tiempo_preparacion_minutos: 25,
          alergenos: ['pescado'],
        },
        {
          nombre: 'Paella Marinera',
          descripcion: 'Paella tradicional con mariscos frescos y arroz',
          precio: 35.00,
          categoria: 'Pescados',
          disponible: true,
          tiempo_preparacion_minutos: 35,
          alergenos: ['crustáceos', 'moluscos'],
        },

        // Más vegetarianos
        {
          nombre: 'Bowl de Hummus',
          descripcion: 'Hummus con verduras frescas, falafel y pita',
          precio: 16.50,
          categoria: 'Vegetariano',
          disponible: true,
          tiempo_preparacion_minutos: 15,
          alergenos: ['sésamo', 'gluten'],
        },
        {
          nombre: 'Tofu Oriental',
          descripcion: 'Tofu salteado con salsa teriyaki y verduras',
          precio: 18.00,
          categoria: 'Vegetariano',
          disponible: true,
          tiempo_preparacion_minutos: 20,
          alergenos: ['soja'],
        },

        // Más postres
        {
          nombre: 'Cheesecake Frutal',
          descripcion: 'Cheesecake con coulis de fresa y frutos rojos',
          precio: 9.50,
          categoria: 'Postres',
          disponible: true,
          tiempo_preparacion_minutos: 5,
          alergenos: ['gluten', 'lácteos', 'huevos'],
        },
        {
          nombre: 'Mousse Chocolat',
          descripcion: 'Mousse de chocolate negro con crema chantilly',
          precio: 8.00,
          categoria: 'Postres',
          disponible: true,
          tiempo_preparacion_minutos: 3,
          alergenos: ['lácteos', 'huevos'],
        },
        {
          nombre: 'Flan Artesanal',
          descripcion: 'Flan de vainilla con caramelo líquido',
          precio: 7.50,
          categoria: 'Postres',
          disponible: true,
          tiempo_preparacion_minutos: 2,
          alergenos: ['lácteos', 'huevos'],
        },

        // Más bebidas
        {
          nombre: 'Limonada Fresca',
          descripcion: 'Limonada fresca exprimida con menta',
          precio: 4.50,
          categoria: 'Bebidas',
          disponible: true,
          tiempo_preparacion_minutos: 2,
          alergenos: [],
        },
        {
          nombre: 'Té Matcha',
          descripcion: 'Té verde japonés con limón y miel',
          precio: 3.50,
          categoria: 'Bebidas',
          disponible: true,
          tiempo_preparacion_minutos: 3,
          alergenos: [],
        },
        {
          nombre: 'Batido Tropical',
          descripcion: 'Smoothie de mango fresco con yogurt',
          precio: 5.50,
          categoria: 'Bebidas',
          disponible: true,
          tiempo_preparacion_minutos: 3,
          alergenos: ['lácteos'],
        },

        // Más sopas
        {
          nombre: 'Crema de Calabaza',
          descripcion: 'Sopa cremosa de calabaza con nata y croutons',
          precio: 12.50,
          categoria: 'Sopas',
          disponible: true,
          tiempo_preparacion_minutos: 20,
          alergenos: ['lácteos', 'gluten'],
        },
        {
          nombre: 'Gazpacho Fresco',
          descripcion: 'Gazpacho frío de tomate, pepino y pimiento',
          precio: 11.00,
          categoria: 'Sopas',
          disponible: true,
          tiempo_preparacion_minutos: 5,
          alergenos: [],
        },

        // Sopas
        {
          nombre: 'Sopa de Pollo con Fideos',
          descripcion: 'Sopa casera de pollo con fideos y verduras frescas',
          precio: 13.50,
          categoria: 'Sopas',
          disponible: true,
          tiempo_preparacion_minutos: 12,
          alergenos: ['gluten'],
        },
        {
          nombre: 'Sopa de Cebolla',
          descripcion: 'Sopa francesa de cebolla caramelizada con queso gratinado',
          precio: 11.00,
          categoria: 'Sopas',
          disponible: true,
          tiempo_preparacion_minutos: 18,
          alergenos: ['gluten', 'lácteos'],
        },
      ];

      const platosCreados: PlatoEntity[] = [];

      for (const data of platosData) {
        // Verificar si el plato ya existe
        const existing = await this.platoRepository!.findOne({
          where: { nombre: data.nombre },
        });

        if (!existing) {
          const plato = await this.platoRepository!.save(
            plainToClass(PlatoEntity, data),
          );
          platosCreados.push(plato);
        } else {
          platosCreados.push(existing);
        }
      }

      // Corregir URLs de imágenes existentes
      await this.fixImageUrls();

      // Devuelve una respuesta HTTP 200 con un mensaje de éxito y los datos de los roles, usuarios, inventario, asistencias y platos creados.
      return res.status(200).json({
        adminRole,
        adminUser,
        userRole,
        userUser,
        guestRole,
        guestUser,
        meseroRole,
        meseroUser,
        inventarioMovimientos,
        asistencias: asistenciasData,
        platos: platosCreados,
      });
    } catch (error) {
      // En caso de error, devuelve una respuesta HTTP 500 con un mensaje de error y la información del error.
      return res.status(500).json({
        message: 'Error Seeding Roles and Users', // Mensaje de error.
        data: error, // Información detallada del error.
      });
    }
  }

  // Método público asincrónico que corrige URLs de imágenes en la base de datos.
  public async fixImageUrls(): Promise<void> {
    try {
      const platosRepository = DatabaseConnection.appDataSource.getRepository(PlatoEntity);
      const platos = await platosRepository.find({
        where: {
          imagen_url: require('typeorm').Not(require('typeorm').IsNull())
        }
      });

      let updatedCount = 0;
      for (const plato of platos) {
        if (plato.imagen_url && plato.imagen_url.includes(':4001')) {
          // Reemplazar el puerto incorrecto por el correcto
          const correctedUrl = plato.imagen_url.replace(':4001', ':4003');
          await platosRepository.update(plato.plato_id, { imagen_url: correctedUrl });
          updatedCount++;
        }
      }

      console.log(`Fixed ${updatedCount} image URLs`);
    } catch (error) {
      console.error('Error fixing image URLs:', error);
    }
  }

  // Método público asincrónico que siembra movimientos de inventario en la base de datos.
  public async seedInventario(): Promise<InventarioEntity[]> {
    try {
      const inventarioData = [
        // Movimiento de entrada
        {
          ingrediente_id: 1,
          usuario_id: 1, // admin
          cantidad: 100.0,
          tipo_movimiento: 'entrada',
          fecha: new Date('2024-09-01'),
          motivo: 'Compra inicial de harina',
          costo_total: 500.0,
        },
        // Movimiento de salida
        {
          ingrediente_id: 2,
          usuario_id: 2, // user
          cantidad: -25.5,
          tipo_movimiento: 'salida',
          fecha: new Date('2024-09-05'),
          motivo: 'Uso en preparación de platillos',
          costo_total: 127.5,
        },
        // Movimiento de ajuste
        {
          ingrediente_id: 3,
          usuario_id: 1, // admin
          cantidad: 10.0,
          tipo_movimiento: 'ajuste',
          fecha: new Date('2024-09-10'),
          motivo: 'Ajuste por inventario físico',
          costo_total: 50.0,
        },
        // Movimiento de entrada
        {
          ingrediente_id: 4,
          usuario_id: 3, // guest
          cantidad: 75.25,
          tipo_movimiento: 'entrada',
          fecha: new Date('2024-09-15'),
          motivo: 'Reabastecimiento de verduras',
          costo_total: 376.25,
        },
        // Movimiento de salida
        {
          ingrediente_id: 5,
          usuario_id: 2, // user
          cantidad: -15.0,
          tipo_movimiento: 'salida',
          fecha: new Date('2024-09-20'),
          motivo: 'Consumo en eventos',
          costo_total: 75.0,
        },
        // Movimiento de ajuste
        {
          ingrediente_id: 1,
          usuario_id: 1, // admin
          cantidad: -5.0,
          tipo_movimiento: 'ajuste',
          fecha: new Date(),
          motivo: 'Corrección de inventario',
          costo_total: -25.0,
        },
      ];

      const inventarioMovimientos: InventarioEntity[] = [];

      for (const data of inventarioData) {
        // Verificar si el movimiento ya existe (por combinación única de campos)
        const existing = await this.inventarioRepository.findOne({
          where: {
            ingrediente_id: data.ingrediente_id,
            usuario_id: data.usuario_id,
            cantidad: data.cantidad,
            tipo_movimiento: data.tipo_movimiento,
            fecha: data.fecha,
            motivo: data.motivo,
          },
        });

        if (!existing) {
          const movimiento = await this.inventarioRepository.save(
            plainToClass(InventarioEntity, data),
          );
          inventarioMovimientos.push(movimiento);
        } else {
          inventarioMovimientos.push(existing);
        }
      }

      return inventarioMovimientos;
    } catch (error) {
      throw new Error(`Error seeding inventario: ${error}`);
    }
  }
}
