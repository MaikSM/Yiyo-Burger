"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseConnection = void 0;
// Importa "reflect-metadata", necesario para que TypeORM maneje decoradores correctamente.
require("reflect-metadata");
// Importa la clase DataSource de TypeORM, que se usa para configurar la conexión a la base de datos.
const typeorm_1 = require("typeorm");
const path_1 = __importDefault(require("path"));
const role_entity_1 = require("../role/entities/role.entity");
const user_entity_1 = require("../user/entities/user.entity");
const ingrediente_entity_1 = require("../inventario/entities/ingrediente.entity");
const inventario_entity_1 = require("../inventario/entities/inventario.entity");
const mesa_entity_1 = require("../mesas/entities/mesa.entity");
const pedido_entity_1 = require("../pedidos/entities/pedido.entity");
const plato_entity_1 = require("../menu/entities/plato.entity");
const categoria_entity_1 = require("../categorias/entities/categoria.entity");
const cliente_entity_1 = require("../clientes/entities/cliente.entity");
// Define una clase para manejar la conexión a la base de datos.
class DatabaseConnection {
}
exports.DatabaseConnection = DatabaseConnection;
// Declara una propiedad estática para almacenar la instancia de la conexión a la base de datos.
DatabaseConnection.appDataSource = new typeorm_1.DataSource({
    type: 'sqlite', // Define el tipo de base de datos a usar, en este caso SQLite local.
    database: path_1.default.join(process.cwd(), 'restausync.sqlite'), // Nombre y ruta del archivo de la base de datos local.
    entities: [
        role_entity_1.RoleEntity,
        user_entity_1.UserEntity,
        ingrediente_entity_1.IngredienteEntity,
        inventario_entity_1.InventarioEntity,
        mesa_entity_1.MesaEntity,
        pedido_entity_1.PedidoEntity,
        plato_entity_1.PlatoEntity,
        categoria_entity_1.CategoriaEntity,
        cliente_entity_1.ClienteEntity,
    ], // Lista de entidades a utilizar en la base de datos.
    synchronize: true, // Enabled to auto-sync schema with entities (ideal para SQLite local)
    logging: false, // Desactivado para reducir logs
});
