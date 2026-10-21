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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Server = void 0;
const morgan_1 = __importDefault(require("morgan"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const _root_routes_1 = require("./modules/_root/_root.routes");
const DatabaseConnection_1 = require("./core/database/DatabaseConnection");
const database_config_1 = require("./core/config/database.config");
const uploads_config_1 = require("./core/config/uploads.config");
const role_entity_1 = require("./modules/role/entities/role.entity");
const seeder_controller_1 = require("./modules/seeder/controllers/seeder.controller");
class Server {
    // Trigger restart
    // Constructor que inicializa la aplicación
    // Restart trigger - updated port
    constructor() {
        this.app = (0, express_1.default)();
        this.port = parseInt(process.env.PORT || '4003', 10) || 4003;
        this.apiPrefix = process.env.API_PREFIX || '/api/v1';
        this.middlewares(); // Llama al método de middlewares
        // this.routes(); // Mover a listen() después de DB init
    }
    // Método privado para configurar los middlewares
    middlewares() {
        this.app.use((0, morgan_1.default)('dev')); // Logger para las peticiones HTTP
        // Configuración CORS - permitir todos los orígenes en desarrollo
        this.app.use((0, cors_1.default)());
        this.app.use((0, helmet_1.default)({
            crossOriginResourcePolicy: { policy: 'cross-origin' }, // Permite CORS
            contentSecurityPolicy: false, // Desactivar CSP para permitir estilos en línea (onload) y scripts externos (Botpress)
        }));
        this.app.use(express_1.default.json({ limit: '10mb' }));
        this.app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
        // Servir archivos estáticos con CORS seguro
        this.app.use('/uploads', express_1.default.static((0, uploads_config_1.getUploadsDir)(), {
            setHeaders: (res, path) => {
                const origin = (res.req && res.req.headers.origin) ? res.req.headers.origin : '*';
                res.set('Access-Control-Allow-Origin', origin);
                res.set('Access-Control-Allow-Credentials', 'true');
                res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
                res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
                res.set('Cross-Origin-Resource-Policy', 'cross-origin');
                res.set('Cache-Control', 'public, max-age=31536000');
            }
        }));
        // Servir frontend en modo escritorio con fallbacks de ruta
        const possibleFrontendPaths = [
            path_1.default.join(__dirname, '../../frontend/dist/frontend/browser'),
            path_1.default.join(__dirname, '../frontend/dist/frontend/browser'),
            path_1.default.join(__dirname, '../../frontend/dist/frontend'),
            path_1.default.join(process.cwd(), 'frontend/dist/frontend/browser'),
            path_1.default.join(process.cwd(), 'resources/app/frontend/dist/frontend/browser')
        ];
        const frontendPath = possibleFrontendPaths.find(p => fs_1.default.existsSync(p)) || path_1.default.join(__dirname, '../../frontend/dist/frontend/browser');
        this.app.use(express_1.default.static(frontendPath));
    }
    // Método privado para configurar las rutas
    routes() {
        const routes = new _root_routes_1.RootRoutes(); // Instancia las rutas del Root
        this.app.use(this.apiPrefix, routes.router); // Usar las rutas definidas
        // Catch-all route para Angular (debe ir después de las rutas de la API)
        const possibleIndexPaths = [
            path_1.default.join(__dirname, '../../frontend/dist/frontend/browser/index.html'),
            path_1.default.join(__dirname, '../frontend/dist/frontend/browser/index.html'),
            path_1.default.join(__dirname, '../../frontend/dist/frontend/index.html'),
            path_1.default.join(process.cwd(), 'frontend/dist/frontend/browser/index.html'),
            path_1.default.join(process.cwd(), 'resources/app/frontend/dist/frontend/browser/index.html')
        ];
        const frontendIndexPath = possibleIndexPaths.find(p => fs_1.default.existsSync(p)) || path_1.default.join(__dirname, '../../frontend/dist/frontend/browser/index.html');
        this.app.get('*', (req, res) => {
            res.sendFile(frontendIndexPath);
        });
    }
    autoSeedIfEmpty() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const roleRepo = DatabaseConnection_1.DatabaseConnection.appDataSource.getRepository(role_entity_1.RoleEntity);
                const count = yield roleRepo.count();
                if (count === 0) {
                    console.log('[AutoSeed] Base de datos limpia detectada. Ejecutando sembrado inicial de roles, usuarios y mesas...');
                    const seederController = new seeder_controller_1.SeederController();
                    yield seederController.executeSeeder();
                    console.log('[AutoSeed] ✅ Sembrado inicial completado con éxito.');
                }
            }
            catch (seedErr) {
                console.error('[AutoSeed] Error ejecutando sembrado automático:', seedErr);
            }
        });
    }
    // Método privado para inicializar la base de datos con reintento
    initializeDatabaseWithRetry() {
        return __awaiter(this, arguments, void 0, function* (maxRetries = 5, delayMs = 2000) {
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    yield DatabaseConnection_1.DatabaseConnection.appDataSource.initialize();
                    console.log('Database Connected');
                    if (database_config_1.DatabaseConfig.type === 'sqlite') {
                        try {
                            yield DatabaseConnection_1.DatabaseConnection.appDataSource.query('PRAGMA journal_mode = WAL;');
                            yield DatabaseConnection_1.DatabaseConnection.appDataSource.query('PRAGMA synchronous = NORMAL;');
                            console.log('[DatabaseConfig] SQLite habilitado en modo WAL (Write-Ahead Logging).');
                        }
                        catch (walErr) {
                            console.warn('[DatabaseConfig] No se pudo establecer PRAGMA WAL:', walErr);
                        }
                    }
                    yield this.autoSeedIfEmpty();
                    try {
                        const { PrintQueueService } = yield Promise.resolve().then(() => __importStar(require('./modules/impresion/services/print-queue.service')));
                        yield PrintQueueService.getInstance().init();
                        const { SequenceService } = yield Promise.resolve().then(() => __importStar(require('./modules/impresion/services/sequence.service')));
                        yield SequenceService.getInstance().syncFromDatabase();
                    }
                    catch (initServicesErr) {
                        console.error('[Server] Error inicializando servicios de cola o secuencia:', initServicesErr);
                    }
                    return; // Éxito, salir
                }
                catch (error) {
                    console.error(`Database connection attempt ${attempt} failed:`, error);
                    if (attempt < maxRetries) {
                        console.log(`Retrying in ${delayMs}ms...`);
                        yield new Promise((resolve) => setTimeout(resolve, delayMs));
                    }
                }
            }
            throw new Error('Failed to connect to database after maximum retries');
        });
    }
    // Método público para inicializar la aplicación en pruebas sin lanzar el puerto
    initForTesting() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!DatabaseConnection_1.DatabaseConnection.appDataSource.isInitialized) {
                yield DatabaseConnection_1.DatabaseConnection.appDataSource.initialize();
            }
            this.routes();
            return this.app;
        });
    }
    getApp() {
        return this.app;
    }
    // Método público para iniciar el servidor
    listen() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.initializeDatabaseWithRetry();
                // Configurar rutas después de inicializar la DB
                this.routes();
                const serverInstance = this.app.listen(this.port, '0.0.0.0', () => {
                    console.log(`Server Running on: http://localhost:${this.port}${this.apiPrefix}`);
                    const nets = os_1.default.networkInterfaces();
                    for (const name of Object.keys(nets)) {
                        for (const net of nets[name] || []) {
                            if (net.family === 'IPv4' && !net.internal) {
                                console.log(`Network access: http://${net.address}:${this.port}${this.apiPrefix}`);
                            }
                        }
                    }
                });
                serverInstance.on('error', (err) => {
                    if (err.code === 'EADDRINUSE') {
                        console.warn(`[Server] Puerto ${this.port} ya en uso. Usando servidor activo.`);
                    }
                    else {
                        console.error('[Server] Error inesperado en puerto:', err);
                    }
                });
            }
            catch (error) {
                console.error('Error Starting Server', error);
                process.exit(1);
            }
        });
    }
}
exports.Server = Server;
