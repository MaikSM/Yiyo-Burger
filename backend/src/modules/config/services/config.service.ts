import fs from 'fs';
import path from 'path';

export interface PosConfig {
  printer_caja_ip: string;
  printer_pizzas_ip: string;
  printer_parrilla_ip: string;
}

export class ConfigService {
  private getAllPossibleConfigPaths(): string[] {
    const paths: string[] = [];

    if (process.env.UPLOADS_PATH) {
      const userDataDir = path.dirname(process.env.UPLOADS_PATH);
      paths.push(path.join(userDataDir, 'pos-config.json'));
    }

    const appData = process.env.APPDATA || process.env.USERPROFILE || process.env.HOME || process.cwd();
    paths.push(path.join(appData, 'restausync-oficcial', 'pos-config.json'));
    paths.push(path.join(appData, 'YiyoBurgerPOS', 'pos-config.json'));
    paths.push(path.join(process.cwd(), 'pos-config.json'));
    paths.push(path.join(process.cwd(), 'backend', 'pos-config.json'));

    // Eliminar duplicados
    return Array.from(new Set(paths));
  }

  private getConfigPath(): string {
    const possiblePaths = this.getAllPossibleConfigPaths();
    const existing = possiblePaths.find(p => fs.existsSync(p));
    return existing || possiblePaths[0];
  }

  public getConfig(): PosConfig {
    const possiblePaths = this.getAllPossibleConfigPaths();
    const configPath = possiblePaths.find(p => fs.existsSync(p)) || possiblePaths[0];

    const defaultConfig: PosConfig = {
      printer_caja_ip: '192.168.0.9',
      printer_pizzas_ip: '192.168.0.10',
      printer_parrilla_ip: '192.168.0.13',
    };

    if (!fs.existsSync(configPath)) {
      this.saveConfig(defaultConfig);
      return defaultConfig;
    }

    try {
      const data = fs.readFileSync(configPath, 'utf-8');
      return { ...defaultConfig, ...JSON.parse(data) };
    } catch (e) {
      console.error('Error reading pos-config.json', e);
      return defaultConfig;
    }
  }

  public saveConfig(config: Partial<PosConfig>): PosConfig {
    const current = this.getConfig();
    const updated = { ...current, ...config };

    const possiblePaths = this.getAllPossibleConfigPaths();

    for (const p of possiblePaths) {
      try {
        const dir = path.dirname(p);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(p, JSON.stringify(updated, null, 2), 'utf-8');
      } catch (err) {
        // Silently skip read-only or unreachable fallback paths
      }
    }

    return updated;
  }
}
