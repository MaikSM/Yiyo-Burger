import { Router } from 'express'; // Importa el enrutador de Express
import { RootController } from './_root.controller'; // Importa el controlador de la raíz
import { RoleRoutes } from '../role/routes/role.routes'; // Importa las rutas de los roles
import { UserRoutes } from '../user/routes/user.routes'; // Importa las rutas de los usuarios
import { AuthRoutes } from '../auth/routes/auth.routes';
import { SeederRoutes } from '../seeder/routes/seeder.routes';
import { IngredientesRoutes } from '../inventario/routes/ingredientes.routes'; // Importa las rutas de ingredientes
import { InventarioRoutes } from '../inventario/routes/inventario.routes'; // Importa las rutas de inventario
import { MesasRoutes } from '../mesas/routes/mesas.routes'; // Importa las rutas de mesas
import { PedidosRoutes } from '../pedidos/routes/pedidos.routes';
import { PlatosRoutes } from '../menu/routes/platos.routes'; // Importa las rutas de platos
import { CategoriasRoutes } from '../categorias/routes/categorias.routes'; // Importa las rutas de categorías
import { ClientesRoutes } from '../clientes/routes/clientes.routes'; // Importa las rutas de clientes
import { ConfigRoutes } from '../config/routes/config.routes'; // Importa rutas de configuracion
import { ProveedoresRoutes } from '../proveedores/routes/proveedores.routes';
import { CierreCajaRoutes } from '../config/routes/cierre-caja.routes';
import { SystemSecurityRoutes } from '../config/routes/system-security.routes';
import { BarriosRoutes } from '../barrios/routes/barrios.routes';
import { GastosRoutes } from '../config/routes/gastos.routes';
import { NominaRoutes } from '../nomina/routes/nomina.routes';
import { ImpresionRoutes } from '../impresion/routes/impresion.routes';
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

    // Ruta pública para obtener platos
    this.router.get('/platos/public', async (req, res) => {
      try {
        const { DatabaseConnection } = await import('../../core/database/DatabaseConnection');
        const { PlatoEntity } = await import('../menu/entities/plato.entity');
        const platoRepository = DatabaseConnection.appDataSource.getRepository(PlatoEntity);
        const data = await platoRepository.find({
          order: { nombre: 'ASC' }
        });
        const platos = data.map(plato => ({
          plato_id: plato.plato_id,
          nombre: plato.nombre,
          descripcion: plato.descripcion,
          precio: plato.precio,
          categoria: plato.categoria,
          imagen_url: plato.imagen_url,
          es_especial: plato.es_especial,
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
    this.router.use(
      '/proveedores',
      TokenExistsMiddleware.check,
      IsAdminMiddleware.check,
      new ProveedoresRoutes().router,
    );
    this.router.use('/auth', new AuthRoutes().router); // Registrar las rutas de autenticación
    this.router.use('/system-security', new SystemSecurityRoutes().router); // Registrar rutas de seguridad del sistema
    this.router.use('/seed', new SeederRoutes().router); // Registrar las rutas de seeder
    // Mesas routes - GET and waiter operations require waiter or admin, others require admin
    this.router.use(
      '/mesas',
      (req, res, next) => {
        // GET or waiter specific actions (changing table status, confirming orders, printing)
        if (
          req.method === 'GET' ||
          req.path.includes('/estado') ||
          req.path.includes('/confirmar') ||
          req.path.includes('/imprimir') ||
          req.path.includes('/abrir')
        ) {
          return TokenExistsMiddleware.check(req, res, (err?: any) => {
            if (err || res.headersSent) return;
            IsWaiterOrAdminMiddleware.check(req, res, next);
          });
        }
        // For administrative methods (creating, editing table setup, deleting tables)
        TokenExistsMiddleware.check(req, res, (err?: any) => {
          if (err || res.headersSent) return;
          IsAdminMiddleware.check(req, res, next);
        });
      },
      new MesasRoutes().router,
    ); // Registrar las rutas de mesas

    // Rutas dedicadas de Impresión Térmica y Diagnóstico de Cola
    this.router.use(
      '/impresion',
      TokenExistsMiddleware.check,
      (req, res, next) => {
        IsWaiterOrAdminMiddleware.check(req, res, next);
      },
      new ImpresionRoutes().router,
    );

    this.router.use(
      '/platos',
      (req, res, next) => {
        if (req.method === 'GET') {
          return TokenExistsMiddleware.check(req, res, next);
        }
        TokenExistsMiddleware.check(req, res, (err?: any) => {
          if (err || res.headersSent) return;
          IsAdminMiddleware.check(req, res, next);
        });
      },
      new PlatosRoutes().router,
    );
    this.router.use(
      '/categorias',
      (req, res, next) => {
        if (req.method === 'GET') {
          return TokenExistsMiddleware.check(req, res, (err?: any) => {
            if (err || res.headersSent) return;
            IsWaiterOrAdminMiddleware.check(req, res, next);
          });
        }
        TokenExistsMiddleware.check(req, res, (err?: any) => {
          if (err || res.headersSent) return;
          IsAdminMiddleware.check(req, res, next);
        });
      },
      new CategoriasRoutes().router,
    );

    this.router.use(
      '/pedidos',
      (req, res, next) => {
        if (req.path === '/events' || req.path.startsWith('/events')) {
          return next();
        }
        return TokenExistsMiddleware.check(req, res, next);
      },
      new PedidosRoutes().router,
    );
    
    this.router.use(
      '/clientes',
      TokenExistsMiddleware.check, // Verifica si el token existe
      new ClientesRoutes().router,
    ); // Registrar las rutas de clientes

    this.router.use(
      '/config',
      TokenExistsMiddleware.check,
      IsAdminMiddleware.check,
      ConfigRoutes.routes,
    );

    this.router.use(
      '/caja',
      TokenExistsMiddleware.check,
      new CierreCajaRoutes().router,
    );

    this.router.use(
      '/barrios',
      TokenExistsMiddleware.check,
      new BarriosRoutes().router,
    );

    this.router.use(
      '/gastos',
      TokenExistsMiddleware.check,
      new GastosRoutes().router,
    );

    this.router.use(
      '/nomina',
      TokenExistsMiddleware.check,
      new NominaRoutes().router,
    );

    this.router.use(
      '/impresion',
      TokenExistsMiddleware.check,
      IsWaiterOrAdminMiddleware.check,
      new ImpresionRoutes().router,
    );
  }
}
