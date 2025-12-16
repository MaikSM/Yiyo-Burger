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
const auth_routes_1 = require("../auth/routes/auth.routes"); // Importa las rutas de autenticación
const seeder_routes_1 = require("../seeder/routes/seeder.routes");
const ingredientes_routes_1 = require("../inventario/routes/ingredientes.routes"); // Importa las rutas de ingredientes
const inventario_routes_1 = require("../inventario/routes/inventario.routes"); // Importa las rutas de inventario
const mesas_routes_1 = require("../mesas/routes/mesas.routes"); // Importa las rutas de mesas
const reservas_routes_1 = require("../reservas/routes/reservas.routes"); // Importa las rutas de reservas
const platos_routes_1 = require("../menu/routes/platos.routes"); // Importa las rutas de platos
const categorias_routes_1 = require("../categorias/routes/categorias.routes"); // Importa las rutas de categorías
const asistencia_routes_1 = require("../asistencia/routes/asistencia.routes"); // Importa las rutas de asistencia
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
        // Ruta temporal para obtener platos sin autenticación
        this.router.get('/platos-public', (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { DatabaseConnection } = yield Promise.resolve().then(() => __importStar(require('../database/DatabaseConnection')));
                const { PlatoEntity } = yield Promise.resolve().then(() => __importStar(require('../menu/entities/plato.entity')));
                const platoRepository = DatabaseConnection.appDataSource.getRepository(PlatoEntity);
                const data = yield platoRepository.find({
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
            }
            catch (error) {
                res.status(500).json({ message: 'Error fetching dishes', error: error.message });
            }
        }));
        // Ruta pública para obtener platos
        this.router.get('/platos/public', (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { DatabaseConnection } = yield Promise.resolve().then(() => __importStar(require('../database/DatabaseConnection')));
                const { PlatoEntity } = yield Promise.resolve().then(() => __importStar(require('../menu/entities/plato.entity')));
                const platoRepository = DatabaseConnection.appDataSource.getRepository(PlatoEntity);
                const data = yield platoRepository.find({
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
        this.router.use('/auth', new auth_routes_1.AuthRoutes().router); // Registrar las rutas de autenticación
        this.router.use('/seed', new seeder_routes_1.SeederRoutes().router); // Registrar las rutas de seeder
        // Mesas routes - GET requires authentication, others require admin
        this.router.use('/mesas', (req, res, next) => {
            // For GET requests, only check token exists
            if (req.method === 'GET') {
                return tokenExists_middleware_1.TokenExistsMiddleware.check(req, res, next);
            }
            // For other methods, check token and admin
            tokenExists_middleware_1.TokenExistsMiddleware.check(req, res, (err) => {
                if (err || res.headersSent)
                    return;
                isAdmin_middleware_1.IsAdminMiddleware.check(req, res, next);
            });
        }, new mesas_routes_1.MesasRoutes().router); // Registrar las rutas de mesas
        this.router.use('/reservas', tokenExists_middleware_1.TokenExistsMiddleware.check, // Verifica si el token existe
        new reservas_routes_1.ReservasRoutes().getRouter()); // Registrar las rutas de reservas
        this.router.use('/platos', tokenExists_middleware_1.TokenExistsMiddleware.check, isWaiterOrAdmin_middleware_1.IsWaiterOrAdminMiddleware.check, new platos_routes_1.PlatosRoutes().router); // Registrar las rutas de platos con autenticación para mesero o admin
        this.router.use('/categorias', tokenExists_middleware_1.TokenExistsMiddleware.check, // Verifica si el token existe
        isAdmin_middleware_1.IsAdminMiddleware.check, // Verifica si el usuario es administrador
        new categorias_routes_1.CategoriasRoutes().router); // Registrar las rutas de categorías
        this.router.use('/asistencia', tokenExists_middleware_1.TokenExistsMiddleware.check, // Verifica si el token existe
        isAdmin_middleware_1.IsAdminMiddleware.check, // Verifica si el usuario es administrador
        new asistencia_routes_1.AsistenciaRoutes().router); // Registrar las rutas de asistencia
    }
}
exports.RootRoutes = RootRoutes;
