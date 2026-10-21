import path from 'path';
import fs from 'fs';
import sqlite3 from 'sqlite3';

// Define una clase para almacenar la configuración de la base de datos.
export class DatabaseConfig {
  public static readonly type: 'sqlite' | 'mysql' = (process.env.DB_TYPE || 'sqlite') as 'sqlite' | 'mysql';
  public static readonly host: string = process.env.DB_HOST || '127.0.0.1';
  public static readonly port: number = Number(process.env.DB_PORT || '3306') || 3306;
  public static readonly username: string = process.env.DB_USERNAME || 'root';
  public static readonly password: string = process.env.DB_PASSWORD || '';
  public static readonly database: string = process.env.DB_NAME || 'restausync.sqlite';

  private static getWritableDatabasePath(): string {
    // 1. Si se especificó una ruta explícita en variable de entorno
    if (process.env.DB_PATH) {
      const dir = path.dirname(process.env.DB_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      return process.env.DB_PATH;
    }

    // 2. Probar si el directorio actual de trabajo (process.cwd()) tiene permisos de escritura
    const localPath = path.join(process.cwd(), this.database);
    try {
      const testFile = path.join(process.cwd(), `.write_test_${Date.now()}`);
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      return localPath;
    } catch (_) {
      // 3. Fallback a directorio de usuario (AppData / Roaming / YiyoBurgerPOS) siempre escribible
      const appData = process.env.APPDATA || process.env.USERPROFILE || process.env.HOME || process.cwd();
      const userDataDir = path.join(appData, 'YiyoBurgerPOS');
      if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true });
      }
      return path.join(userDataDir, this.database);
    }
  }

  // Retorna las opciones de configuración formateadas para DataSource de TypeORM.
  public static getDataSourceOptions(): any {
    const isSqlite = this.type === 'sqlite';
    const dbPath = isSqlite ? this.getWritableDatabasePath() : this.database;
    console.log(`[DatabaseConfig] Usando ruta de base de datos SQLite: ${dbPath}`);

    return {
      type: this.type,
      database: dbPath,
      ...(isSqlite ? {
        driver: sqlite3,
        busyTimeout: 15000,
      } : {
        host: this.host,
        port: this.port,
        username: this.username,
        password: this.password,
      }),
      synchronize: true, // Auto-sincronizar el esquema con las entidades
      logging: false,
    };
  }
}
