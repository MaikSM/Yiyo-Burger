import { Router } from 'express';
import { ConfigController } from '../controllers/config.controller';
import multer from 'multer';
import { getUploadsDir } from '../../../core/config/uploads.config';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, getUploadsDir());
  },
  filename: (_req, file, cb) => {
    cb(null, `import_db_${Date.now()}_${file.originalname}`);
  }
});

const upload = multer({ storage });

export class ConfigRoutes {
  public static get routes(): Router {
    const router = Router();
    const controller = new ConfigController();

    router.get('/', controller.getConfig);
    router.get('/system-printers', controller.getSystemPrinters);
    router.post('/', controller.updateConfig);
    router.post('/test-printer', controller.testPrinter);
    router.get('/export-db', controller.exportDatabase);
    router.post('/import-db', upload.single('database'), controller.importDatabase);

    return router;
  }
}
