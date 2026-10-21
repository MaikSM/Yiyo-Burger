"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseConfig = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const sqlite3_1 = __importDefault(require("sqlite3"));
// Define una clase para almacenar la configuración de la base de datos.
class DatabaseConfig {
    static getWritableDatabasePath() {
        // 1. Si se especificó una ruta explícita en variable de entorno
        if (process.env.DB_PATH) {
            const dir = path_1.default.dirname(process.env.DB_PATH);
            if (!fs_1.default.existsSync(dir))
                fs_1.default.mkdirSync(dir, { recursive: true });
            return process.env.DB_PATH;
        }
        // 2. Probar si el directorio actual de trabajo (process.cwd()) tiene permisos de escritura
        const localPath = path_1.default.join(process.cwd(), this.database);
        try {
            const testFile = path_1.default.join(process.cwd(), `.write_test_${Date.now()}`);
            fs_1.default.writeFileSync(testFile, 'test');
            fs_1.default.unlinkSync(testFile);
            return localPath;
        }
        catch (_) {
            // 3. Fallback a directorio de usuario (AppData / Roaming / YiyoBurgerPOS) siempre escribible
            const appData = process.env.APPDATA || process.env.USERPROFILE || process.env.HOME || process.cwd();
            const userDataDir = path_1.default.join(appData, 'YiyoBurgerPOS');
            if (!fs_1.default.existsSync(userDataDir)) {
                fs_1.default.mkdirSync(userDataDir, { recursive: true });
            }
            return path_1.default.join(userDataDir, this.database);
        }
    }
    // Retorna las opciones de configuración formateadas para DataSource de TypeORM.
    static getDataSourceOptions() {
        const isSqlite = this.type === 'sqlite';
        const dbPath = isSqlite ? this.getWritableDatabasePath() : this.database;
        console.log(`[DatabaseConfig] Usando ruta de base de datos SQLite: ${dbPath}`);
        return Object.assign(Object.assign({ type: this.type, database: dbPath }, (isSqlite ? {
            driver: sqlite3_1.default,
            busyTimeout: 15000,
        } : {
            host: this.host,
            port: this.port,
            username: this.username,
            password: this.password,
        })), { synchronize: true, logging: false });
    }
}
exports.DatabaseConfig = DatabaseConfig;
DatabaseConfig.type = (process.env.DB_TYPE || 'sqlite');
DatabaseConfig.host = process.env.DB_HOST || '127.0.0.1';
DatabaseConfig.port = Number(process.env.DB_PORT || '3306') || 3306;
DatabaseConfig.username = process.env.DB_USERNAME || 'root';
DatabaseConfig.password = process.env.DB_PASSWORD || '';
DatabaseConfig.database = process.env.DB_NAME || 'restausync.sqlite';
