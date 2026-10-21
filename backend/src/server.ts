import morgan from 'morgan';
import cors from 'cors';
import helmet from 'helmet';
import express, { Application } from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { RootRoutes } from './modules/_root/_root.routes';
import { DatabaseConnection } from './core/database/DatabaseConnection';
import { DatabaseConfig } from './core/config/database.config';
import { getUploadsDir } from './core/config/uploads.config';
import { RoleEntity } from './modules/role/entities/role.entity';
import { SeederController } from './modules/seeder/controllers/seeder.controller';

export class Server {
   // Propiedades privadas de la clase Server
   private app: Application;
   private port: number;
   private apiPrefix: string;
   // Trigger restart

  // Constructor que inicializa la aplicación
  // Restart trigger - updated port
  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '4003', 10) || 4003;
    this.apiPrefix = process.env.API_PREFIX || '/api/v1';
    this.middlewares(); // Llama al método de middlewares
    // this.routes(); // Mover a listen() después de DB init
  }

  // Método privado para configurar los middlewares
  private middlewares(): void {
    this.app.use(morgan('dev')); // Logger para las peticiones HTTP

    // Configuración CORS - permitir todos los orígenes en desarrollo
    this.app.use(cors());

    this.app.use(helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // Permite CORS
      contentSecurityPolicy: false, // Desactivar CSP para permitir estilos en línea (onload) y scripts externos (Botpress)
    }));

    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Servir archivos estáticos con CORS seguro
    this.app.use('/uploads', express.static(getUploadsDir(), {
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
      path.join(__dirname, '../../frontend/dist/frontend/browser'),
      path.join(__dirname, '../frontend/dist/frontend/browser'),
      path.join(__dirname, '../../frontend/dist/frontend'),
      path.join(process.cwd(), 'frontend/dist/frontend/browser'),
      path.join(process.cwd(), 'resources/app/frontend/dist/frontend/browser')
    ];
    const frontendPath = possibleFrontendPaths.find(p => fs.existsSync(p)) || path.join(__dirname, '../../frontend/dist/frontend/browser');
    this.app.use(express.static(frontendPath));
  }

  // Método privado para configurar las rutas
  private routes(): void {
    const routes: RootRoutes = new RootRoutes(); // Instancia las rutas del Root
    this.app.use(this.apiPrefix, routes.router); // Usar las rutas definidas

    // Catch-all route para Angular (debe ir después de las rutas de la API)
    const possibleIndexPaths = [
      path.join(__dirname, '../../frontend/dist/frontend/browser/index.html'),
      path.join(__dirname, '../frontend/dist/frontend/browser/index.html'),
      path.join(__dirname, '../../frontend/dist/frontend/index.html'),
      path.join(process.cwd(), 'frontend/dist/frontend/browser/index.html'),
      path.join(process.cwd(), 'resources/app/frontend/dist/frontend/browser/index.html')
    ];
    const frontendIndexPath = possibleIndexPaths.find(p => fs.existsSync(p)) || path.join(__dirname, '../../frontend/dist/frontend/browser/index.html');
    
    this.app.get('*', (req, res) => {
      res.sendFile(frontendIndexPath);
    });
  }
  private async autoSeedIfEmpty(): Promise<void> {
    try {
      const roleRepo = DatabaseConnection.appDataSource.getRepository(RoleEntity);
      const count = await roleRepo.count();
      if (count === 0) {
        console.log('[AutoSeed] Base de datos limpia detectada. Ejecutando sembrado inicial de roles, usuarios y mesas...');
        const seederController = new SeederController();
        await seederController.executeSeeder();
        console.log('[AutoSeed] ✅ Sembrado inicial completado con éxito.');
      }
    } catch (seedErr) {
      console.error('[AutoSeed] Error ejecutando sembrado automático:', seedErr);
    }
  }

  // Método privado para inicializar la base de datos con reintento
  private async initializeDatabaseWithRetry(
    maxRetries: number = 5,
    delayMs: number = 2000,
  ): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await DatabaseConnection.appDataSource.initialize();
        console.log('Database Connected');
        if (DatabaseConfig.type === 'sqlite') {
          try {
            await DatabaseConnection.appDataSource.query('PRAGMA journal_mode = WAL;');
            await DatabaseConnection.appDataSource.query('PRAGMA synchronous = NORMAL;');
            console.log('[DatabaseConfig] SQLite habilitado en modo WAL (Write-Ahead Logging).');
          } catch (walErr) {
            console.warn('[DatabaseConfig] No se pudo establecer PRAGMA WAL:', walErr);
          }
        }
        await this.autoSeedIfEmpty();
        try {
          const { PrintQueueService } = await import('./modules/impresion/services/print-queue.service');
          await PrintQueueService.getInstance().init();
          const { SequenceService } = await import('./modules/impresion/services/sequence.service');
          await SequenceService.getInstance().syncFromDatabase();
        } catch (initServicesErr) {
          console.error('[Server] Error inicializando servicios de cola o secuencia:', initServicesErr);
        }
        return; // Éxito, salir
      } catch (error) {
        console.error(`Database connection attempt ${attempt} failed:`, error);
        if (attempt < maxRetries) {
          console.log(`Retrying in ${delayMs}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }
    throw new Error('Failed to connect to database after maximum retries');
  }

  // Método público para inicializar la aplicación en pruebas sin lanzar el puerto
  public async initForTesting(): Promise<Application> {
    if (!DatabaseConnection.appDataSource.isInitialized) {
      await DatabaseConnection.appDataSource.initialize();
    }
    this.routes();
    return this.app;
  }

  public getApp(): Application {
    return this.app;
  }

  // Método público para iniciar el servidor
  public async listen(): Promise<void> {
    try {
      await this.initializeDatabaseWithRetry();
      // Configurar rutas después de inicializar la DB
      this.routes();
      const serverInstance = this.app.listen(this.port, '0.0.0.0', () => {
        console.log(
          `Server Running on: http://localhost:${this.port}${this.apiPrefix}`,
        );
        const nets = os.networkInterfaces();
        for (const name of Object.keys(nets)) {
          for (const net of nets[name] || []) {
            if (net.family === 'IPv4' && !net.internal) {
              console.log(
                `Network access: http://${net.address}:${this.port}${this.apiPrefix}`,
              );
            }
          }
        }
      });

      serverInstance.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          console.warn(`[Server] Puerto ${this.port} ya en uso. Usando servidor activo.`);
        } else {
          console.error('[Server] Error inesperado en puerto:', err);
        }
      });
    } catch (error) {
      console.error('Error Starting Server', error);
      process.exit(1);
    }
  }
}
