import path from 'path';
import fs from 'fs';

export function getUploadsDir(): string {
  if (process.env.UPLOADS_PATH) {
    if (!fs.existsSync(process.env.UPLOADS_PATH)) {
      try {
        fs.mkdirSync(process.env.UPLOADS_PATH, { recursive: true });
      } catch (_) {}
    }
    return process.env.UPLOADS_PATH;
  }

  const localUploadsDir = path.join(process.cwd(), 'uploads');
  try {
    if (!fs.existsSync(localUploadsDir)) {
      fs.mkdirSync(localUploadsDir, { recursive: true });
    }
    return localUploadsDir;
  } catch (_) {
    const appData = process.env.APPDATA || process.env.USERPROFILE || process.env.HOME || process.cwd();
    const fallbackDir = path.join(appData, 'YiyoBurgerPOS', 'uploads');
    if (!fs.existsSync(fallbackDir)) {
      try {
        fs.mkdirSync(fallbackDir, { recursive: true });
      } catch (_) {}
    }
    return fallbackDir;
  }
}
