import { Request, Response } from 'express';
import { ConfigService } from '../services/config.service';
import { ImpresionService } from '../../impresion/services/impresion.service';

export class ConfigController {
  private configService: ConfigService;
  private impresionService: ImpresionService;

  constructor() {
    this.configService = new ConfigService();
    this.impresionService = new ImpresionService();
  }

  public getConfig = (req: Request, res: Response): void => {
    try {
      const config = this.configService.getConfig();
      res.status(200).json(config);
    } catch (error: any) {
      res.status(500).json({ error: 'Error al obtener la configuración' });
    }
  };

  public updateConfig = (req: Request, res: Response): void => {
    try {
      const config = this.configService.saveConfig(req.body);
      res.status(200).json({ message: 'Configuración guardada', data: config });
    } catch (error: any) {
      res.status(500).json({ error: 'Error al guardar la configuración' });
    }
  };

  public testPrinter = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tipo, ip } = req.body;
      const result = await this.impresionService.probarImpresora(tipo, ip);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Error al probar la impresora', ip: req.body?.ip || '' });
    }
  };

  public getSystemPrinters = async (req: Request, res: Response): Promise<void> => {
    try {
      const printers = await this.impresionService.getSystemPrinters();
      res.status(200).json({ success: true, printers });
    } catch (error: any) {
      res.status(500).json({ success: false, printers: [], message: error.message });
    }
  };

  public exportDatabase = (req: Request, res: Response): void => {
    try {
      const path = require('path');
      const fs = require('fs');

      const possibleDbPaths = [
        process.env.DB_PATH || '',
        path.join(process.cwd(), 'restausync.sqlite'),
        path.join(process.cwd(), 'backend', 'restausync.sqlite'),
        path.join(__dirname, '..', '..', '..', 'restausync.sqlite'),
        path.join(__dirname, '..', '..', '..', '..', 'restausync.sqlite')
      ];

      const dbPath = possibleDbPaths.find((p: string) => fs.existsSync(p));
      if (!dbPath) {
        res.status(404).json({ error: 'Archivo de base de datos no encontrado' });
        return;
      }

      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
      const filename = `restausync_backup_${dateStr}.sqlite`;

      res.setHeader('Content-Type', 'application/x-sqlite3');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      res.download(dbPath, filename, (err) => {
        if (err && !res.headersSent) {
          res.status(500).json({ error: 'Error al descargar el archivo de base de datos' });
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Error al exportar la base de datos' });
    }
  };

  public importDatabase = async (req: Request, res: Response): Promise<void> => {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: 'No se ha adjuntado ningún archivo de base de datos (.sqlite)' });
        return;
      }

      const path = require('path');
      const fs = require('fs');

      const possibleDbPaths = [
        process.env.DB_PATH || '',
        path.join(process.cwd(), 'restausync.sqlite'),
        path.join(process.cwd(), 'backend', 'restausync.sqlite'),
        path.join(__dirname, '..', '..', '..', 'restausync.sqlite'),
        path.join(__dirname, '..', '..', '..', '..', 'restausync.sqlite')
      ];

      let dbPath = possibleDbPaths.find((p: string) => fs.existsSync(p));
      if (!dbPath) {
        dbPath = path.join(process.cwd(), 'restausync.sqlite');
      }

      // 1. Crear copia preventiva antes de sobrescribir
      const backupsDir = path.join(path.dirname(dbPath), 'backups');
      if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
      }

      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
      const preImportBackup = path.join(backupsDir, `restausync_pre_import_${dateStr}.sqlite`);

      if (fs.existsSync(dbPath)) {
        fs.copyFileSync(dbPath, preImportBackup);
        console.log(`[ImportDB] ✅ Respaldo previo creado en: ${preImportBackup}`);
      }

      // 2. Sobrescribir archivo de base de datos con el archivo subido
      fs.copyFileSync(file.path, dbPath);

      // 3. Eliminar archivo temporal subido
      try {
        fs.unlinkSync(file.path);
      } catch (_) {}

      res.status(200).json({
        message: 'Base de datos importada exitosamente. Se ha generado una copia de seguridad previa.',
        backup: path.basename(preImportBackup)
      });
    } catch (error: any) {
      console.error('Error al importar base de datos:', error);
      res.status(500).json({ error: error.message || 'Error al importar la base de datos' });
    }
  };
}
