"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RootRoutes = void 0;
const express_1 = require("express"); // Importa el enrutador de Express
const _root_controller_1 = require("./_root.controller"); // Importa el controlador de la raíz
const role_routes_1 = require("../role/routes/role.routes"); // Importa las rutas de los roles
const user_routes_1 = require("../user/routes/user.routes"); // Importa las rutas de los usuarios
const auth_routes_1 = require("../auth/routes/auth.routes");
const seeder_routes_1 = require("../seeder/routes/seeder.routes");
const ingredientes_routes_1 = require("../inventario/routes/ingredientes.routes"); // Importa las rutas de ingredientes
const inventario_routes_1 = require("../inventario/routes/inventario.routes"); // Importa las rutas de inventario
const mesas_routes_1 = require("../mesas/routes/mesas.routes"); // Importa las rutas de mesas
const pedidos_routes_1 = require("../pedidos/routes/pedidos.routes");
const platos_routes_1 = require("../menu/routes/platos.routes"); // Importa las rutas de platos
const categorias_routes_1 = require("../categorias/routes/categorias.routes"); // Importa las rutas de categorías
const clientes_routes_1 = require("../clientes/routes/clientes.routes"); // Importa las rutas de clientes
const config_routes_1 = require("../config/routes/config.routes"); // Importa rutas de configuracion
const proveedores_routes_1 = require("../proveedores/routes/proveedores.routes");
const cierre_caja_routes_1 = require("../config/routes/cierre-caja.routes");
const system_security_routes_1 = require("../config/routes/system-security.routes");
const barrios_routes_1 = require("../barrios/routes/barrios.routes");
const gastos_routes_1 = require("../config/routes/gastos.routes");
const nomina_routes_1 = require("../nomina/routes/nomina.routes");
const impresion_routes_1 = require("../impresion/routes/impresion.routes");
const tokenExists_middleware_1 = require("../../core/middlewares/tokenExists.middleware");
const isAdmin_middleware_1 = require("../../core/middlewares/isAdmin.middleware");
const isWaiterOrAdmin_middleware_1 = require("../../core/middlewares/isWaiterOrAdmin.middleware");
class RootRoutes {
    // Constructor que inicializa las rutas y controladores
    constructor() {
        this.router = (0, express_1.Router)(); // Inicializa el enrutador
        this.apiPrefix = process.env.API_PREFIX || '/api/v1'; // Prefijo de la API
        this.initializeRoutes(); // Llama al método para inicializar las rutas
    }
    // Método privado para definir las rutas
    initializeRoutes() {
        // Registrar la ruta raíz usando el prefijo de la API
        this.router.get('/', _root_controller_1.RootController.root.bind(_root_controller_1.RootController));
        // Ruta pública para obtener platos
        this.router.get('/platos/public', (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { DatabaseConnection } = yield Promise.resolve().then(() => __importStar(require('../../core/database/DatabaseConnection')));
                const { PlatoEntity } = yield Promise.resolve().then(() => __importStar(require('../menu/entities/plato.entity')));
                const platoRepository = DatabaseConnection.appDataSource.getRepository(PlatoEntity);
                const data = yield platoRepository.find({
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
            }
            catch (error) {
                res.status(500).json({ message: 'Error fetching dishes', error: error.message });
            }
        }));
        this.router.use('/roles', tokenExists_middleware_1.TokenExistsMiddleware.check, isAdmin_middleware_1.IsAdminMiddleware.check, new role_routes_1.RoleRoutes().router); // Registrar las rutas de los roles
        this.router.use('/users', tokenExists_middleware_1.TokenExistsMiddleware.check, // Verifica si el token existe
        isAdmin_middleware_1.IsAdminMiddleware.check, // Verifica si el usuario es administrador
        new user_routes_1.UserRoutes().router); // Registrar las rutas de los usuarios
        this.router.use('/ingredientes', tokenExists_middleware_1.TokenExistsMiddleware.check, // Verifica si el token existe
        isAdmin_middleware_1.IsAdminMiddleware.check, // Verifica si el usuario es administrador
        new ingredientes_routes_1.IngredientesRoutes().router); // Registrar las rutas de ingredientes
        this.router.use('/inventario', tokenExists_middleware_1.TokenExistsMiddleware.check, // Verifica si el token existe
        isAdmin_middleware_1.IsAdminMiddleware.check, // Verifica si el usuario es administrador
        new inventario_routes_1.InventarioRoutes().router); // Registrar las rutas de inventario
        this.router.use('/proveedores', tokenExists_middleware_1.TokenExistsMiddleware.check, isAdmin_middleware_1.IsAdminMiddleware.check, new proveedores_routes_1.ProveedoresRoutes().router);
        this.router.use('/auth', new auth_routes_1.AuthRoutes().router); // Registrar las rutas de autenticación
        this.router.use('/system-security', new system_security_routes_1.SystemSecurityRoutes().router); // Registrar rutas de seguridad del sistema
        this.router.use('/seed', new seeder_routes_1.SeederRoutes().router); // Registrar las rutas de seeder
        // Mesas routes - GET and waiter operations require waiter or admin, others require admin
        this.router.use('/mesas', (req, res, next) => {
            // GET or waiter specific actions (changing table status, confirming orders, printing)
            if (req.method === 'GET' ||
                req.path.includes('/estado') ||
                req.path.includes('/confirmar') ||
                req.path.includes('/imprimir') ||
                req.path.includes('/abrir')) {
                return tokenExists_middleware_1.TokenExistsMiddleware.check(req, res, (err) => {
                    if (err || res.headersSent)
                        return;
                    isWaiterOrAdmin_middleware_1.IsWaiterOrAdminMiddleware.check(req, res, next);
                });
            }
            // For administrative methods (creating, editing table setup, deleting tables)
            tokenExists_middleware_1.TokenExistsMiddleware.check(req, res, (err) => {
                if (err || res.headersSent)
                    return;
                isAdmin_middleware_1.IsAdminMiddleware.check(req, res, next);
            });
        }, new mesas_routes_1.MesasRoutes().router); // Registrar las rutas de mesas
        // Rutas dedicadas de Impresión Térmica y Diagnóstico de Cola
        this.router.use('/impresion', tokenExists_middleware_1.TokenExistsMiddleware.check, (req, res, next) => {
            isWaiterOrAdmin_middleware_1.IsWaiterOrAdminMiddleware.check(req, res, next);
        }, new impresion_routes_1.ImpresionRoutes().router);
        this.router.use('/platos', (req, res, next) => {
            if (req.method === 'GET') {
                return tokenExists_middleware_1.TokenExistsMiddleware.check(req, res, next);
            }
            tokenExists_middleware_1.TokenExistsMiddleware.check(req, res, (err) => {
                if (err || res.headersSent)
                    return;
                isAdmin_middleware_1.IsAdminMiddleware.check(req, res, next);
            });
        }, new platos_routes_1.PlatosRoutes().router);
        this.router.use('/categorias', (req, res, next) => {
            if (req.method === 'GET') {
                return tokenExists_middleware_1.TokenExistsMiddleware.check(req, res, (err) => {
                    if (err || res.headersSent)
                        return;
                    isWaiterOrAdmin_middleware_1.IsWaiterOrAdminMiddleware.check(req, res, next);
                });
            }
            tokenExists_middleware_1.TokenExistsMiddleware.check(req, res, (err) => {
                if (err || res.headersSent)
                    return;
                isAdmin_middleware_1.IsAdminMiddleware.check(req, res, next);
            });
        }, new categorias_routes_1.CategoriasRoutes().router);
        this.router.use('/pedidos', (req, res, next) => {
            if (req.path === '/events' || req.path.startsWith('/events')) {
                return next();
            }
            return tokenExists_middleware_1.TokenExistsMiddleware.check(req, res, next);
        }, new pedidos_routes_1.PedidosRoutes().router);
        this.router.use('/clientes', tokenExists_middleware_1.TokenExistsMiddleware.check, // Verifica si el token existe
        new clientes_routes_1.ClientesRoutes().router); // Registrar las rutas de clientes
        this.router.use('/config', tokenExists_middleware_1.TokenExistsMiddleware.check, isAdmin_middleware_1.IsAdminMiddleware.check, config_routes_1.ConfigRoutes.routes);
        this.router.use('/caja', tokenExists_middleware_1.TokenExistsMiddleware.check, new cierre_caja_routes_1.CierreCajaRoutes().router);
        this.router.use('/barrios', tokenExists_middleware_1.TokenExistsMiddleware.check, new barrios_routes_1.BarriosRoutes().router);
        this.router.use('/gastos', tokenExists_middleware_1.TokenExistsMiddleware.check, new gastos_routes_1.GastosRoutes().router);
        this.router.use('/nomina', tokenExists_middleware_1.TokenExistsMiddleware.check, new nomina_routes_1.NominaRoutes().router);
        this.router.use('/impresion', tokenExists_middleware_1.TokenExistsMiddleware.check, isWaiterOrAdmin_middleware_1.IsWaiterOrAdminMiddleware.check, new impresion_routes_1.ImpresionRoutes().router);
    }
}
exports.RootRoutes = RootRoutes;
