import { Router } from 'express'; // Importa el enrutador de Express
import { RootController } from './_root.controller'; // Importa el controlador de la raíz
import { RoleRoutes } from '../role/routes/role.routes'; // Importa las rutas de los roles
import { UserRoutes } from '../user/routes/user.routes'; // Importa las rutas de los usuarios
import { AuthRoutes } from '../auth/routes/auth.routes'; // Importa las rutas de autenticación
import { SeederRoutes } from '../seeder/routes/seeder.routes';
import { IngredientesRoutes } from '../inventario/routes/ingredientes.routes'; // Importa las rutas de ingredientes
import { InventarioRoutes } from '../inventario/routes/inventario.routes'; // Importa las rutas de inventario
import { MesasRoutes } from '../mesas/routes/mesas.routes'; // Importa las rutas de mesas
import { ReservasRoutes } from '../reservas/routes/reservas.routes'; // Importa las rutas de reservas
import { PlatosRoutes } from '../menu/routes/platos.routes'; // Importa las rutas de platos
import { CategoriasRoutes } from '../categorias/routes/categorias.routes'; // Importa las rutas de categorías
import { AsistenciaRoutes } from '../asistencia/routes/asistencia.routes'; // Importa las rutas de asistencia
import { TokenExistsMiddleware } from '../../core/middlewares/tokenExists.middleware';
import { IsAdminMiddleware } from '../../core/middlewares/isAdmin.middleware';
import { IsWaiterOrAdminMiddleware } from '../../core/middlewares/isWaiterOrAdmin.middleware';
export class RootRoutes {
  // Propiedad pública para el enrutador
  public readonly router: Router;

  // Propiedades privadas
  private readonly apiPrefix: string;

  // Constructor que inicializa las rutas y controladores
  constructor() {
    this.router = Router(); // Inicializa el enrutador
    this.apiPrefix = process.env.API_PREFIX || '/api/v1'; // Prefijo de la API
    this.initializeRoutes(); // Llama al método para inicializar las rutas
  }

  // Método privado para definir las rutas
  private initializeRoutes(): void {
    // Registrar la ruta raíz usando el prefijo de la API
    this.router.get('/', RootController.root.bind(RootController));

    // Ruta temporal para obtener platos sin autenticación
    this.router.get('/platos-public', async (req, res) => {
      try {
        const { DatabaseConnection } = await import('../database/DatabaseConnection');
        const { PlatoEntity } = await import('../menu/entities/plato.entity');
        const platoRepository = DatabaseConnection.appDataSource.getRepository(PlatoEntity);
        const data = await platoRepository.find({
          where: { disponible: true },
          order: { nombre: 'ASC' }
        });
        const platos = data.map(plato => ({
          plato_id: plato.plato_id,
          nombre: plato.nombre,
          descripcion: plato.descripcion,
          precio: plato.precio,
          categoria: plato.categoria,
          imagen_url: plato.imagen_url,
          disponible: plato.disponible,
          tiempo_preparacion_minutos: plato.tiempo_preparacion_minutos,
          alergenos: plato.alergenos,
          created_at: plato.created_at,
        }));
        res.status(200).json(platos);
      } catch (error: any) {
        res.status(500).json({ message: 'Error fetching dishes', error: error.message });
      }
    });

    // Ruta pública para obtener platos
    this.router.get('/platos/public', async (req, res) => {
      try {
        const { DatabaseConnection } = await import('../database/DatabaseConnection');
        const { PlatoEntity } = await import('../menu/entities/plato.entity');
        const platoRepository = DatabaseConnection.appDataSource.getRepository(PlatoEntity);
        const data = await platoRepository.find({
          where: { disponible: true },
          order: { nombre: 'ASC' }
        });
        const platos = data.map(plato => ({
          plato_id: plato.plato_id,
          nombre: plato.nombre,
          descripcion: plato.descripcion,
          precio: plato.precio,
          categoria: plato.categoria,
          imagen_url: plato.imagen_url,
          disponible: plato.disponible,
          tiempo_preparacion_minutos: plato.tiempo_preparacion_minutos,
          alergenos: plato.alergenos,
          created_at: plato.created_at,
        }));
        res.status(200).json(platos);
      } catch (error: any) {
        res.status(500).json({ message: 'Error fetching dishes', error: error.message });
      }
    });

    this.router.use(
      '/roles',
      TokenExistsMiddleware.check,
      IsAdminMiddleware.check,
      new RoleRoutes().router,
    ); // Registrar las rutas de los roles
    this.router.use(
      '/users',
      TokenExistsMiddleware.check, // Verifica si el token existe
      IsAdminMiddleware.check, // Verifica si el usuario es administrador
      new UserRoutes().router,
    ); // Registrar las rutas de los usuarios
    this.router.use(
      '/ingredientes',
      TokenExistsMiddleware.check, // Verifica si el token existe
      IsAdminMiddleware.check, // Verifica si el usuario es administrador
      new IngredientesRoutes().router,
    ); // Registrar las rutas de ingredientes
    this.router.use(
      '/inventario',
      TokenExistsMiddleware.check, // Verifica si el token existe
      IsAdminMiddleware.check, // Verifica si el usuario es administrador
      new InventarioRoutes().router,
    ); // Registrar las rutas de inventario
    this.router.use('/auth', new AuthRoutes().router); // Registrar las rutas de autenticación
    this.router.use('/seed', new SeederRoutes().router); // Registrar las rutas de seeder
    // Mesas routes - GET requires authentication, others require admin
    this.router.use(
      '/mesas',
      (req, res, next) => {
        // For GET requests, only check token exists
        if (req.method === 'GET') {
          return TokenExistsMiddleware.check(req, res, next);
        }
        // For other methods, check token and admin
        TokenExistsMiddleware.check(req, res, (err?: any) => {
          if (err || res.headersSent) return;
          IsAdminMiddleware.check(req, res, next);
        });
      },
      new MesasRoutes().router,
    ); // Registrar las rutas de mesas
    this.router.use(
      '/reservas',
      TokenExistsMiddleware.check, // Verifica si el token existe
      new ReservasRoutes().getRouter(),
    ); // Registrar las rutas de reservas
    this.router.use(
      '/platos',
      TokenExistsMiddleware.check,
      IsWaiterOrAdminMiddleware.check,
      new PlatosRoutes().router,
    ); // Registrar las rutas de platos con autenticación para mesero o admin
    this.router.use(
      '/categorias',
      TokenExistsMiddleware.check, // Verifica si el token existe
      IsAdminMiddleware.check, // Verifica si el usuario es administrador
      new CategoriasRoutes().router,
    ); // Registrar las rutas de categorías
    this.router.use(
      '/asistencia',
      TokenExistsMiddleware.check, // Verifica si el token existe
      IsAdminMiddleware.check, // Verifica si el usuario es administrador
      new AsistenciaRoutes().router,
    ); // Registrar las rutas de asistencia
  }
}
