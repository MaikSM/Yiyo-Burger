"use strict";
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
exports.SeederController = void 0;
const role_entity_1 = require("../../role/entities/role.entity");
const user_entity_1 = require("../../user/entities/user.entity");
const inventario_entity_1 = require("../../inventario/entities/inventario.entity");
const mesa_entity_1 = require("../../mesas/entities/mesa.entity");
const plato_entity_1 = require("../../menu/entities/plato.entity");
const categoria_entity_1 = require("../../categorias/entities/categoria.entity");
const DatabaseConnection_1 = require("../../../core/database/DatabaseConnection");
const bcrypt_util_1 = require("../../../utils/bcrypt.util");
const class_transformer_1 = require("class-transformer");
class SeederController {
    constructor() {
        this.roleRepository = DatabaseConnection_1.DatabaseConnection.appDataSource.getRepository(role_entity_1.RoleEntity);
        this.userRepository = DatabaseConnection_1.DatabaseConnection.appDataSource.getRepository(user_entity_1.UserEntity);
        this.inventarioRepository = DatabaseConnection_1.DatabaseConnection.appDataSource.getRepository(inventario_entity_1.InventarioEntity);
        this.mesaRepository = DatabaseConnection_1.DatabaseConnection.appDataSource.getRepository(mesa_entity_1.MesaEntity);
        this.platoRepository = DatabaseConnection_1.DatabaseConnection.appDataSource.getRepository(plato_entity_1.PlatoEntity);
    }
    executeSeeder() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                /* Admin Seed */
                let adminRole = yield this.roleRepository.findOne({
                    where: { name: 'admin' },
                    withDeleted: true,
                });
                if (!adminRole) {
                    adminRole = this.roleRepository.create({
                        name: 'admin',
                        description: 'Admin Role',
                    });
                    adminRole = yield this.roleRepository.save(adminRole);
                }
                else if (adminRole.deleted_at) {
                    adminRole.deleted_at = null;
                    adminRole = yield this.roleRepository.save(adminRole);
                }
                let adminUser = yield this.userRepository.findOne({
                    where: { email: 'admin@admin.com' },
                    withDeleted: true,
                });
                if (!adminUser) {
                    adminUser = this.userRepository.create({
                        name: 'Administrator',
                        surname: 'System',
                        email: 'admin@admin.com',
                        password: yield bcrypt_util_1.BcryptUtil.hashPassword('12345678'),
                        role_id: adminRole.id,
                    });
                    adminUser = yield this.userRepository.save(adminUser);
                }
                else if (adminUser.deleted_at) {
                    adminUser.deleted_at = null;
                    adminUser = yield this.userRepository.save(adminUser);
                }
                /* User Seed */
                let userRole = yield this.roleRepository.findOne({
                    where: { name: 'user' },
                    withDeleted: true,
                });
                if (!userRole) {
                    userRole = this.roleRepository.create({
                        name: 'user',
                        description: 'User Role',
                    });
                    userRole = yield this.roleRepository.save(userRole);
                }
                else if (userRole.deleted_at) {
                    userRole.deleted_at = null;
                    userRole = yield this.roleRepository.save(userRole);
                }
                let userUser = yield this.userRepository.findOne({
                    where: { email: 'user@user.com' },
                    withDeleted: true,
                });
                if (!userUser) {
                    userUser = this.userRepository.create({
                        name: 'User',
                        surname: 'Standard',
                        email: 'user@user.com',
                        password: yield bcrypt_util_1.BcryptUtil.hashPassword('12345678'),
                        role_id: userRole.id,
                    });
                    userUser = yield this.userRepository.save(userUser);
                }
                else if (userUser.deleted_at) {
                    userUser.deleted_at = null;
                    userUser = yield this.userRepository.save(userUser);
                }
                /* Guest Seed */
                let guestRole = yield this.roleRepository.findOne({
                    where: { name: 'guest' },
                    withDeleted: true,
                });
                if (!guestRole) {
                    guestRole = this.roleRepository.create({
                        name: 'guest',
                        description: 'Guest Role',
                    });
                    guestRole = yield this.roleRepository.save(guestRole);
                }
                else if (guestRole.deleted_at) {
                    guestRole.deleted_at = null;
                    guestRole = yield this.roleRepository.save(guestRole);
                }
                let guestUser = yield this.userRepository.findOne({
                    where: { email: 'guest@guest.com' },
                    withDeleted: true,
                });
                if (!guestUser) {
                    guestUser = this.userRepository.create({
                        name: 'Guest',
                        surname: 'Visitor',
                        email: 'guest@guest.com',
                        password: yield bcrypt_util_1.BcryptUtil.hashPassword('12345678'),
                        role_id: guestRole.id,
                    });
                    guestUser = yield this.userRepository.save(guestUser);
                }
                else if (guestUser.deleted_at) {
                    guestUser.deleted_at = null;
                    guestUser = yield this.userRepository.save(guestUser);
                }
                /* Cajero Seed */
                let cajeroRole = yield this.roleRepository.findOne({
                    where: { name: 'cajero' },
                    withDeleted: true,
                });
                if (!cajeroRole) {
                    cajeroRole = this.roleRepository.create({
                        name: 'cajero',
                        description: 'Cajero Role - Flujo de pedidos y caja',
                    });
                    cajeroRole = yield this.roleRepository.save(cajeroRole);
                }
                else if (cajeroRole.deleted_at) {
                    cajeroRole.deleted_at = null;
                    cajeroRole = yield this.roleRepository.save(cajeroRole);
                }
                let cajeroUser = yield this.userRepository.findOne({
                    where: { email: 'cajero@cajero.com' },
                    withDeleted: true,
                });
                if (!cajeroUser) {
                    cajeroUser = this.userRepository.create({
                        name: 'Cajero',
                        surname: 'Barra',
                        email: 'cajero@cajero.com',
                        password: yield bcrypt_util_1.BcryptUtil.hashPassword('12345678'),
                        role_id: cajeroRole.id,
                    });
                    cajeroUser = yield this.userRepository.save(cajeroUser);
                }
                else if (cajeroUser.deleted_at) {
                    cajeroUser.deleted_at = null;
                    cajeroUser = yield this.userRepository.save(cajeroUser);
                }
                /* Mesero Seed */
                let meseroRole = yield this.roleRepository.findOne({
                    where: { name: 'mesero' },
                    withDeleted: true,
                });
                if (!meseroRole) {
                    meseroRole = this.roleRepository.create({
                        name: 'mesero',
                        description: 'Mesero Role',
                    });
                    meseroRole = yield this.roleRepository.save(meseroRole);
                }
                else if (meseroRole.deleted_at) {
                    meseroRole.deleted_at = null;
                    meseroRole = yield this.roleRepository.save(meseroRole);
                }
                let meseroUser = yield this.userRepository.findOne({
                    where: { email: 'juan@juan.com' },
                    withDeleted: true,
                });
                if (!meseroUser) {
                    meseroUser = this.userRepository.create({
                        name: 'Juan',
                        surname: 'Pérez',
                        email: 'juan@juan.com',
                        password: yield bcrypt_util_1.BcryptUtil.hashPassword('12345678'),
                        role_id: meseroRole.id,
                    });
                    meseroUser = yield this.userRepository.save(meseroUser);
                }
                else if (meseroUser.deleted_at) {
                    meseroUser.deleted_at = null;
                    meseroUser = yield this.userRepository.save(meseroUser);
                }
                /* Cocinero Seed */
                let cocineroRole = yield this.roleRepository.findOne({
                    where: { name: 'cocinero' },
                    withDeleted: true,
                });
                if (!cocineroRole) {
                    cocineroRole = this.roleRepository.create({
                        name: 'cocinero',
                        description: 'Cocinero Role',
                    });
                    cocineroRole = yield this.roleRepository.save(cocineroRole);
                }
                else if (cocineroRole.deleted_at) {
                    cocineroRole.deleted_at = null;
                    cocineroRole = yield this.roleRepository.save(cocineroRole);
                }
                let cocineroUser = yield this.userRepository.findOne({
                    where: { email: 'cocinero@cocinero.com' },
                    withDeleted: true,
                });
                if (!cocineroUser) {
                    cocineroUser = this.userRepository.create({
                        name: 'Cocinero',
                        surname: 'Chef',
                        email: 'cocinero@cocinero.com',
                        password: yield bcrypt_util_1.BcryptUtil.hashPassword('12345678'),
                        role_id: cocineroRole.id,
                    });
                    cocineroUser = yield this.userRepository.save(cocineroUser);
                }
                else if (cocineroUser.deleted_at) {
                    cocineroUser.deleted_at = null;
                    cocineroUser = yield this.userRepository.save(cocineroUser);
                }
                /* Domiciliario Seed */
                let domiRole = yield this.roleRepository.findOne({
                    where: { name: 'domiciliario' },
                    withDeleted: true,
                });
                if (!domiRole) {
                    domiRole = this.roleRepository.create({
                        name: 'domiciliario',
                        description: 'Domiciliario Role',
                    });
                    domiRole = yield this.roleRepository.save(domiRole);
                }
                else if (domiRole.deleted_at) {
                    domiRole.deleted_at = null;
                    domiRole = yield this.roleRepository.save(domiRole);
                }
                // Seed 2 domiciliarios de prueba
                const domisData = [
                    { name: 'Carlos Domicilios', email: 'carlos@yiyo.com' },
                    { name: 'Andres Domicilios', email: 'andres@yiyo.com' }
                ];
                for (const d of domisData) {
                    let domiUser = yield this.userRepository.findOne({
                        where: { email: d.email },
                        withDeleted: true,
                    });
                    if (!domiUser) {
                        domiUser = this.userRepository.create({
                            name: d.name,
                            surname: 'Domiciliario',
                            email: d.email,
                            password: yield bcrypt_util_1.BcryptUtil.hashPassword('12345678'),
                            role_id: domiRole.id,
                        });
                        yield this.userRepository.save(domiUser);
                    }
                    else if (domiUser.deleted_at) {
                        domiUser.deleted_at = null;
                        yield this.userRepository.save(domiUser);
                    }
                }
                // Seed Mesas
                for (let i = 1; i <= 8; i++) {
                    let mesa = yield this.mesaRepository.findOne({
                        where: { numero: i },
                        withDeleted: true,
                    });
                    if (!mesa) {
                        mesa = this.mesaRepository.create({
                            numero: i,
                            capacidad: 4,
                            estado: 'libre',
                        });
                        yield this.mesaRepository.save(mesa);
                    }
                    else if (mesa.deleted_at) {
                        mesa.deleted_at = null;
                        yield this.mesaRepository.save(mesa);
                    }
                }
                // Limpiar Platos y Categorías de menú anteriores
                yield this.platoRepository.delete({});
                const categoriaRepository = DatabaseConnection_1.DatabaseConnection.appDataSource.getRepository(categoria_entity_1.CategoriaEntity);
                yield categoriaRepository.delete({ tipo: 'menu' });
                // Siembra categorías del menú de Yiyo's
                const categoriasData = [
                    { nombre: 'Hamburguesas', descripcion: 'Hamburguesas individuales y combos', tipo: 'menu', seccion: 'Parrilla', activo: true },
                    { nombre: 'Perros Calientes', descripcion: 'Perros sencillos, especiales y combos', tipo: 'menu', seccion: 'Parrilla', activo: true },
                    { nombre: 'Burros, Nachos y Tacos', descripcion: 'Burritos, nachos con guacamole y tacos', tipo: 'menu', seccion: 'Parrilla', activo: true },
                    { nombre: 'Arepas', descripcion: 'Arepas asadas y rellenas con queso, carne o pollo', tipo: 'menu', seccion: 'Parrilla', activo: true },
                    { nombre: 'Salchipapas y Porciones', descripcion: 'Salchipapas de la casa y porciones de papa', tipo: 'menu', seccion: 'Parrilla', activo: true },
                    { nombre: 'Platos Especiales y Pechugas', descripcion: 'Churrasco, costilla BBQ, pechugas gratinadas', tipo: 'menu', seccion: 'Parrilla', activo: true },
                    { nombre: 'Apanados, Pinchos y Crepes', descripcion: 'Pinchos, nuggets y crepes con pollo', tipo: 'menu', seccion: 'Parrilla', activo: true },
                    { nombre: 'Combos Infantiles', descripcion: 'Combos para niños con juguete sorpresa', tipo: 'menu', seccion: 'Parrilla', activo: true },
                    { nombre: 'Jugos y Dulces', descripcion: 'Jugos en agua o leche, malteadas y postres', tipo: 'menu', seccion: 'Bebidas', activo: true },
                    { nombre: 'Pizzas', descripcion: 'Yiyo\'s Pizzas Artesanales con tamaño', tipo: 'menu', seccion: 'Pizzas', activo: true },
                    { nombre: 'Sándwiches y Lasañas', descripcion: 'Sándwiches en combo y lasañas mixtas', tipo: 'menu', seccion: 'Parrilla', activo: true },
                    // Categorías de inventario (Si no existen, crearlas)
                    { nombre: 'Verduras', descripcion: 'Verduras frescas', tipo: 'inventario', seccion: 'Parrilla', activo: true },
                    { nombre: 'Frutas', descripcion: 'Frutas frescas', tipo: 'inventario', seccion: 'Bebidas', activo: true },
                    { nombre: 'Carnes', descripcion: 'Cortes de carne', tipo: 'inventario', seccion: 'Parrilla', activo: true },
                    { nombre: 'Pescados', descripcion: 'Productos del mar', tipo: 'inventario', seccion: 'Parrilla', activo: true },
                    { nombre: 'Lácteos', descripcion: 'Productos lácteos', tipo: 'inventario', seccion: 'Parrilla', activo: true },
                    { nombre: 'Especias', descripcion: 'Especias y condimentos', tipo: 'inventario', seccion: 'Parrilla', activo: true },
                    { nombre: 'Harinas', descripcion: 'Harinas y cereales', tipo: 'inventario', seccion: 'Parrilla', activo: true },
                    { nombre: 'Aceites', descripcion: 'Aceites y grasas', tipo: 'inventario', seccion: 'Parrilla', activo: true },
                ];
                for (const cat of categoriasData) {
                    const existing = yield categoriaRepository.findOne({
                        where: { nombre: cat.nombre, tipo: cat.tipo },
                        withDeleted: true,
                    });
                    if (!existing) {
                        yield categoriaRepository.save((0, class_transformer_1.plainToClass)(categoria_entity_1.CategoriaEntity, cat));
                    }
                    else {
                        existing.seccion = cat.seccion;
                        existing.descripcion = cat.descripcion;
                        if (existing.deleted_at) {
                            existing.deleted_at = null;
                        }
                        yield categoriaRepository.save(existing);
                    }
                }
                // Siembra platos del menú
                const platosData = [
                    // === Hamburguesas ===
                    {
                        nombre: 'Hamburguesa Sencilla',
                        descripcion: 'Carne Zenú, lechuga, tomate, cebolla, papas chips, queso y salsas. (Individual)',
                        precio: 11500,
                        categoria: 'Hamburguesas',
                        disponible: true,
                        tiempo_preparacion_minutos: 10,
                    },
                    {
                        nombre: 'Hamburguesa Sencilla en Combo',
                        descripcion: 'Carne Zenú, lechuga, tomate, cebolla, papas chips, queso y salsas. Incluye Gaseosa 250 ml y Papas a la francesa.',
                        precio: 20000,
                        categoria: 'Hamburguesas',
                        disponible: true,
                        tiempo_preparacion_minutos: 12,
                    },
                    {
                        nombre: 'Hamburguesa Sencilla Doble Carne',
                        descripcion: '2 carnes Zenú, lechuga, tomate, cebolla, papas chips, queso y salsas. (Individual)',
                        precio: 17500,
                        categoria: 'Hamburguesas',
                        disponible: true,
                        tiempo_preparacion_minutos: 11,
                    },
                    {
                        nombre: 'Hamburguesa Sencilla Doble Carne en Combo',
                        descripcion: '2 carnes Zenú, lechuga, tomate, cebolla, papas chips, queso y salsas. Incluye Combo.',
                        precio: 25500,
                        categoria: 'Hamburguesas',
                        disponible: true,
                        tiempo_preparacion_minutos: 13,
                    },
                    {
                        nombre: 'Hamburguesa Especial',
                        descripcion: 'Carne Zenú, lechuga, tomate, cebolla, papas chips, queso, jamón, huevo, pollo, champiñones. (Individual)',
                        precio: 16500,
                        categoria: 'Hamburguesas',
                        disponible: true,
                        tiempo_preparacion_minutos: 12,
                    },
                    {
                        nombre: 'Hamburguesa Especial en Combo',
                        descripcion: 'Carne Zenú, lechuga, tomate, cebolla, papas chips, queso, jamón, huevo, pollo, champiñones. Incluye Combo.',
                        precio: 25500,
                        categoria: 'Hamburguesas',
                        disponible: true,
                        tiempo_preparacion_minutos: 14,
                    },
                    {
                        nombre: 'Hamburguesa Especial Doble Carne',
                        descripcion: '2 carnes Zenú, lechuga, tomate, cebolla, papas chips, queso, jamón, huevo, pollo, champiñones. (Individual)',
                        precio: 20500,
                        categoria: 'Hamburguesas',
                        disponible: true,
                        tiempo_preparacion_minutos: 13,
                    },
                    {
                        nombre: 'Hamburguesa Especial Doble Carne en Combo',
                        descripcion: '2 carnes Zenú, lechuga, tomate, cebolla, papas chips, queso, jamón, huevo, pollo, champiñones. Incluye Combo.',
                        precio: 28000,
                        categoria: 'Hamburguesas',
                        disponible: true,
                        tiempo_preparacion_minutos: 15,
                    },
                    {
                        nombre: 'Hamburguesa Pollo Apanado',
                        descripcion: 'Apanada Klik, lechuga, tomate, cebolla, papas chips, queso, jamón, tocineta, huevo y salsas. (Individual)',
                        precio: 18000,
                        categoria: 'Hamburguesas',
                        disponible: true,
                        tiempo_preparacion_minutos: 12,
                    },
                    {
                        nombre: 'Hamburguesa Pollo Apanado en Combo',
                        descripcion: 'Apanada Klik, lechuga, tomate, cebolla, papas chips, queso, jamón, tocineta, huevo y salsas. Incluye Combo.',
                        precio: 27000,
                        categoria: 'Hamburguesas',
                        disponible: true,
                        tiempo_preparacion_minutos: 14,
                    },
                    {
                        nombre: 'Hamburguesa Mixta',
                        descripcion: '1 carne Zenú, una carne pollo Klik, queso, jamón, lechuga, tomate, cebolla, tocineta, huevo, papas chips y salsas. (Individual)',
                        precio: 22500,
                        categoria: 'Hamburguesas',
                        disponible: true,
                        tiempo_preparacion_minutos: 13,
                    },
                    {
                        nombre: 'Hamburguesa Mixta en Combo',
                        descripcion: '1 carne Zenú, una carne pollo Klik, queso, jamón, lechuga, tomate, cebolla, tocineta, huevo, papas chips y salsas. Incluye Combo.',
                        precio: 28500,
                        categoria: 'Hamburguesas',
                        disponible: true,
                        tiempo_preparacion_minutos: 15,
                    },
                    {
                        nombre: 'Hamburguesa Yiyo',
                        descripcion: 'Carne Angus 100%, queso, lechuga, tomate, cebolla, papas chips, jamón, tocineta, pollo, huevo, salsas, champiñones. (Individual)',
                        precio: 20500,
                        categoria: 'Hamburguesas',
                        disponible: true,
                        tiempo_preparacion_minutos: 14,
                    },
                    {
                        nombre: 'Hamburguesa Yiyo en Combo',
                        descripcion: 'Carne Angus 100%, queso, lechuga, tomate, cebolla, papas chips, jamón, tocineta, pollo, huevo, salsas, champiñones. Incluye Combo.',
                        precio: 29000,
                        categoria: 'Hamburguesas',
                        disponible: true,
                        tiempo_preparacion_minutos: 16,
                    },
                    {
                        nombre: 'Hamburguesa Yiyo Doble Carne',
                        descripcion: '2 carnes Angus 100%, queso, lechuga, tomate, cebolla, papas chips, jamón, tocineta, pollo, huevo, salsas, champiñones. (Individual)',
                        precio: 25000,
                        categoria: 'Hamburguesas',
                        disponible: true,
                        tiempo_preparacion_minutos: 15,
                    },
                    {
                        nombre: 'Hamburguesa Yiyo Doble Carne en Combo',
                        descripcion: '2 carnes Angus 100%, queso, lechuga, tomate, cebolla, papas chips, jamón, tocineta, pollo, huevo, salsas, champiñones. Incluye Combo.',
                        precio: 33000,
                        categoria: 'Hamburguesas',
                        disponible: true,
                        tiempo_preparacion_minutos: 17,
                    },
                    {
                        nombre: 'Hamburguesa Super Especial',
                        descripcion: '1 carne Zenú, pechuga asada, 100g jamón, lechuga, papas chips, cebolla, tomate, queso, salsas, champiñón. (Individual)',
                        precio: 18500,
                        categoria: 'Hamburguesas',
                        disponible: true,
                        tiempo_preparacion_minutos: 12,
                    },
                    {
                        nombre: 'Hamburguesa Super Especial en Combo',
                        descripcion: '1 carne Zenú, pechuga asada, 100g jamón, lechuga, papas chips, cebolla, tomate, queso, salsas, champiñón. Incluye Combo.',
                        precio: 27000,
                        categoria: 'Hamburguesas',
                        disponible: true,
                        tiempo_preparacion_minutos: 14,
                    },
                    {
                        nombre: 'Hamburguesa Mexicana',
                        descripcion: '1 carne Zenú, jamón, papas chips, cebolla, tomate, queso, jalapeños, lechuga, frijoles, guacamole, picante al gusto, tocineta y salsas. (Individual)',
                        precio: 19500,
                        categoria: 'Hamburguesas',
                        disponible: true,
                        tiempo_preparacion_minutos: 12,
                    },
                    {
                        nombre: 'Hamburguesa Mexicana en Combo',
                        descripcion: '1 carne Zenú, jamón, papas chips, cebolla, tomate, queso, jalapeños, lechuga, frijoles, guacamole, picante al gusto, tocineta y salsas. Incluye Combo.',
                        precio: 29000,
                        categoria: 'Hamburguesas',
                        disponible: true,
                        tiempo_preparacion_minutos: 14,
                    },
                    {
                        nombre: 'Hamburguesa Criolla',
                        descripcion: 'Carne Zenú, lechuga, tomate, cebolla, papas chips, queso, jamón, pollo, huevo frito, tocineta, maíz, champiñones, crema de champiñones y aguacate. (Individual)',
                        precio: 22000,
                        categoria: 'Hamburguesas',
                        disponible: true,
                        tiempo_preparacion_minutos: 13,
                    },
                    {
                        nombre: 'Hamburguesa Criolla en Combo',
                        descripcion: 'Carne Zenú, lechuga, tomate, cebolla, papas chips, queso, jamón, pollo, huevo frito, tocineta, maíz, champiñones, crema de champiñones y aguacate. Incluye Combo.',
                        precio: 31000,
                        categoria: 'Hamburguesas',
                        disponible: true,
                        tiempo_preparacion_minutos: 15,
                    },
                    // === Perros Calientes ===
                    {
                        nombre: 'Perro Sencillo',
                        descripcion: 'Salchicha Zenú, papa fosforito, queso, cebolla, salsas, huevo. (Individual)',
                        precio: 8500,
                        categoria: 'Perros Calientes',
                        disponible: true,
                        tiempo_preparacion_minutos: 8,
                    },
                    {
                        nombre: 'Perro Sencillo en Combo',
                        descripcion: 'Salchicha Zenú, papa fosforito, queso, cebolla, salsas, huevo. Incluye Combo.',
                        precio: 16500,
                        categoria: 'Perros Calientes',
                        disponible: true,
                        tiempo_preparacion_minutos: 10,
                    },
                    {
                        nombre: 'Perro Especial',
                        descripcion: 'Salchicha Zenú, papa fosforito, queso, cebolla, jamón, 2 huevos y salsas. (Individual)',
                        precio: 9500,
                        categoria: 'Perros Calientes',
                        disponible: true,
                        tiempo_preparacion_minutos: 8,
                    },
                    {
                        nombre: 'Perro Especial en Combo',
                        descripcion: 'Salchicha Zenú, papa fosforito, queso, cebolla, jamón, 2 huevos y salsas. Incluye Combo.',
                        precio: 17500,
                        categoria: 'Perros Calientes',
                        disponible: true,
                        tiempo_preparacion_minutos: 10,
                    },
                    {
                        nombre: 'Perro Americano',
                        descripcion: 'Salchicha Zenú americana, papa fosforito, queso, jamón, 2 huevos y salsas. (Individual)',
                        precio: 11500,
                        categoria: 'Perros Calientes',
                        disponible: true,
                        tiempo_preparacion_minutos: 8,
                    },
                    {
                        nombre: 'Perro Americano en Combo',
                        descripcion: 'Salchicha Zenú americana, papa fosforito, queso, jamón, 2 huevos y salsas. Incluye Combo.',
                        precio: 19000,
                        categoria: 'Perros Calientes',
                        disponible: true,
                        tiempo_preparacion_minutos: 10,
                    },
                    {
                        nombre: 'Perro Vaquero',
                        descripcion: 'Salchicha Zenú, papa fosforito, cebolla, queso, tocineta, huevo y salsas. (Individual)',
                        precio: 12000,
                        categoria: 'Perros Calientes',
                        disponible: true,
                        tiempo_preparacion_minutos: 9,
                    },
                    {
                        nombre: 'Perro Vaquero en Combo',
                        descripcion: 'Salchicha Zenú, papa fosforito, cebolla, queso, tocineta, huevo y salsas. Incluye Combo.',
                        precio: 19500,
                        categoria: 'Perros Calientes',
                        disponible: true,
                        tiempo_preparacion_minutos: 11,
                    },
                    {
                        nombre: 'Perro Mexicano',
                        descripcion: 'Salchicha Zenú americana, papa fosforito, cebolla, carne, pico de gallo, frijoles, jalapeños, nachos, huevo y salsa. (Individual)',
                        precio: 18000,
                        categoria: 'Perros Calientes',
                        disponible: true,
                        tiempo_preparacion_minutos: 10,
                    },
                    {
                        nombre: 'Perro Mexicano en Combo',
                        descripcion: 'Salchicha Zenú americana, papa fosforito, cebolla, carne, pico de gallo, frijoles, jalapeños, nachos, huevo y salsa. Incluye Combo.',
                        precio: 25500,
                        categoria: 'Perros Calientes',
                        disponible: true,
                        tiempo_preparacion_minutos: 12,
                    },
                    {
                        nombre: 'Perro Choriperro',
                        descripcion: 'Chorizo santarrosano, cebolla, papa fosforito, queso, huevo, salsas. (Individual)',
                        precio: 9500,
                        categoria: 'Perros Calientes',
                        disponible: true,
                        tiempo_preparacion_minutos: 8,
                    },
                    {
                        nombre: 'Perro Choriperro en Combo',
                        descripcion: 'Chorizo santarrosano, cebolla, papa fosforito, queso, huevo, salsas. Incluye Combo.',
                        precio: 18500,
                        categoria: 'Perros Calientes',
                        disponible: true,
                        tiempo_preparacion_minutos: 10,
                    },
                    {
                        nombre: 'Perro Hawaiano',
                        descripcion: 'Salchicha Zenú, papa fosforito, queso, huevo, piña, jamón y salsas. (Individual)',
                        precio: 12000,
                        categoria: 'Perros Calientes',
                        disponible: true,
                        tiempo_preparacion_minutos: 8,
                    },
                    {
                        nombre: 'Perro Hawaiano en Combo',
                        descripcion: 'Salchicha Zenú, papa fosforito, queso, huevo, piña, jamón y salsas. Incluye Combo.',
                        precio: 19000,
                        categoria: 'Perros Calientes',
                        disponible: true,
                        tiempo_preparacion_minutos: 10,
                    },
                    {
                        nombre: 'Perro Super Especial',
                        descripcion: 'Salchicha Zenú americana, papa fosforito, cebolla, queso, carne, pico de gallo, frijoles, jalapeños, nachos, huevo y salsas. (Individual)',
                        precio: 16500,
                        categoria: 'Perros Calientes',
                        disponible: true,
                        tiempo_preparacion_minutos: 10,
                    },
                    {
                        nombre: 'Perro Super Especial en Combo',
                        descripcion: 'Salchicha Zenú americana, papa fosforito, cebolla, queso, carne, pico de gallo, frijoles, jalapeños, nachos, huevo y salsas. Incluye Combo.',
                        precio: 23000,
                        categoria: 'Perros Calientes',
                        disponible: true,
                        tiempo_preparacion_minutos: 12,
                    },
                    // === Burros, Nachos y Tacos ===
                    {
                        nombre: 'Burro de Pollo',
                        descripcion: 'Tortilla, pollo, pico e gallo, lechuga, queso y dorito.',
                        precio: 18000,
                        categoria: 'Burros, Nachos y Tacos',
                        disponible: true,
                        tiempo_preparacion_minutos: 10,
                    },
                    {
                        nombre: 'Burro de Carne',
                        descripcion: 'Tortilla, carne, pico e gallo, lechuga, queso y dorito.',
                        precio: 18000,
                        categoria: 'Burros, Nachos y Tacos',
                        disponible: true,
                        tiempo_preparacion_minutos: 10,
                    },
                    {
                        nombre: 'Burro Mixto',
                        descripcion: 'Tortilla, pollo y carne, pico e gallo, lechuga, queso y dorito.',
                        precio: 21000,
                        categoria: 'Burros, Nachos y Tacos',
                        disponible: true,
                        tiempo_preparacion_minutos: 11,
                    },
                    {
                        nombre: 'Burro Mexicano',
                        descripcion: 'Tortilla, carne, pico e gallo, lechuga, aguacate, frijol, jalapeños, queso y dorito.',
                        precio: 25000,
                        categoria: 'Burros, Nachos y Tacos',
                        disponible: true,
                        tiempo_preparacion_minutos: 12,
                    },
                    {
                        nombre: 'Burro Criollo',
                        descripcion: 'Tortilla, pollo y carne, pico e gallo, lechuga, queso, guacamole, maíz tierno y dorito.',
                        precio: 25000,
                        categoria: 'Burros, Nachos y Tacos',
                        disponible: true,
                        tiempo_preparacion_minutos: 12,
                    },
                    {
                        nombre: 'Burro Vegetariano',
                        descripcion: 'Tortilla de maíz, pico e gallo, lechuga, maíz, frijol, champiñones, aguacate, queso y dorito.',
                        precio: 25000,
                        categoria: 'Burros, Nachos y Tacos',
                        disponible: true,
                        tiempo_preparacion_minutos: 12,
                    },
                    {
                        nombre: 'Nachos',
                        descripcion: 'Base de doritos, carne y pollo desmechados, tomate, lechuga, guacamole y doritos con frijol o maíz.',
                        precio: 23000,
                        categoria: 'Burros, Nachos y Tacos',
                        disponible: true,
                        tiempo_preparacion_minutos: 10,
                    },
                    {
                        nombre: 'Tacos',
                        descripcion: '4 tacos. Solo carne, maíz, frijol.',
                        precio: 22000,
                        categoria: 'Burros, Nachos y Tacos',
                        disponible: true,
                        tiempo_preparacion_minutos: 10,
                    },
                    // === Arepas ===
                    {
                        nombre: 'Arepa Queso',
                        descripcion: 'Arepa rellena de queso.',
                        precio: 5000,
                        categoria: 'Arepas',
                        disponible: true,
                        tiempo_preparacion_minutos: 6,
                    },
                    {
                        nombre: 'Arepa Jamón y Queso',
                        descripcion: 'Arepa rellena con jamón y queso.',
                        precio: 6000,
                        categoria: 'Arepas',
                        disponible: true,
                        tiempo_preparacion_minutos: 6,
                    },
                    {
                        nombre: 'Arepa Carne',
                        descripcion: 'Carne desmechada, cebolla, tomate, queso y huevo.',
                        precio: 9500,
                        categoria: 'Arepas',
                        disponible: true,
                        tiempo_preparacion_minutos: 8,
                    },
                    {
                        nombre: 'Arepa Pollo',
                        descripcion: 'Pollo desmechado, cebolla, tomate, queso y huevo.',
                        precio: 9500,
                        categoria: 'Arepas',
                        disponible: true,
                        tiempo_preparacion_minutos: 8,
                    },
                    {
                        nombre: 'Arepa Reina Pepiada',
                        descripcion: 'Pollo desmechado, aguacate y queso.',
                        precio: 11000,
                        categoria: 'Arepas',
                        disponible: true,
                        tiempo_preparacion_minutos: 8,
                    },
                    {
                        nombre: 'Arepa Pollo Champiñones',
                        descripcion: 'Pollo desmechado, cebolla, tomate, queso, champiñones y huevo.',
                        precio: 12000,
                        categoria: 'Arepas',
                        disponible: true,
                        tiempo_preparacion_minutos: 9,
                    },
                    {
                        nombre: 'Arepa Mixta',
                        descripcion: 'Pollo y carne desmechada, cebolla, tomate, queso y huevo.',
                        precio: 12500,
                        categoria: 'Arepas',
                        disponible: true,
                        tiempo_preparacion_minutos: 9,
                    },
                    {
                        nombre: 'Arepa Criolla',
                        descripcion: 'Pollo y carne desmechada, cebolla, tomate, queso, huevo y maíz.',
                        precio: 13000,
                        categoria: 'Arepas',
                        disponible: true,
                        tiempo_preparacion_minutos: 9,
                    },
                    {
                        nombre: 'Arepa Callejera',
                        descripcion: 'Arepa a la parrilla, chorizo santarrosano picado, carne y pollo desmechado, ahogado, queso y huevo.',
                        precio: 13500,
                        categoria: 'Arepas',
                        disponible: true,
                        tiempo_preparacion_minutos: 11,
                    },
                    {
                        nombre: 'Arepa Yiyo',
                        descripcion: 'Salchicha americana, ahogado, queso y huevo.',
                        precio: 9000,
                        categoria: 'Arepas',
                        disponible: true,
                        tiempo_preparacion_minutos: 8,
                    },
                    // === Salchipapas y Porciones ===
                    {
                        nombre: 'Salchipapa Sencilla',
                        descripcion: 'Salchicha Zenú, papa francesa y huevo.',
                        precio: 11000,
                        categoria: 'Salchipapas y Porciones',
                        disponible: true,
                        tiempo_preparacion_minutos: 8,
                    },
                    {
                        nombre: 'Salchipapa Americana',
                        descripcion: 'Salchicha americana, papa francesa y huevo.',
                        precio: 14000,
                        categoria: 'Salchipapas y Porciones',
                        disponible: true,
                        tiempo_preparacion_minutos: 8,
                    },
                    {
                        nombre: 'Salchipapa Especial',
                        descripcion: 'Salchicha Zenú, pollo desmechado, queso gratinado, huevo de codorniz.',
                        precio: 20000,
                        categoria: 'Salchipapas y Porciones',
                        disponible: true,
                        tiempo_preparacion_minutos: 10,
                    },
                    {
                        nombre: 'Salchipapa de la Casa',
                        descripcion: '2 salchichas americanas, pollo y carne desmechada, queso gratinado, tocineta y huevo de codorniz.',
                        precio: 27000,
                        categoria: 'Salchipapas y Porciones',
                        disponible: true,
                        tiempo_preparacion_minutos: 12,
                    },
                    {
                        nombre: 'Choripapa',
                        descripcion: 'Chorizo santarrosano y papa francesa.',
                        precio: 10000,
                        categoria: 'Salchipapas y Porciones',
                        disponible: true,
                        tiempo_preparacion_minutos: 8,
                    },
                    {
                        nombre: 'Choricriolla',
                        descripcion: 'Chorizo santarrosano y papa criolla.',
                        precio: 11500,
                        categoria: 'Salchipapas y Porciones',
                        disponible: true,
                        tiempo_preparacion_minutos: 8,
                    },
                    {
                        nombre: 'Nido',
                        descripcion: 'Papa francesa y 5 huevos de codorniz.',
                        precio: 10500,
                        categoria: 'Salchipapas y Porciones',
                        disponible: true,
                        tiempo_preparacion_minutos: 7,
                    },
                    {
                        nombre: 'Nido Especial',
                        descripcion: 'Pollo o carne, papa francesa, 6 huevos de codorniz, jamón y queso gratinado.',
                        precio: 22000,
                        categoria: 'Salchipapas y Porciones',
                        disponible: true,
                        tiempo_preparacion_minutos: 10,
                    },
                    {
                        nombre: 'Porción Francesa',
                        descripcion: 'Porción de papas fritas a la francesa.',
                        precio: 8000,
                        categoria: 'Salchipapas y Porciones',
                        disponible: true,
                        tiempo_preparacion_minutos: 5,
                    },
                    {
                        nombre: 'Porción Criolla',
                        descripcion: 'Porción de papas criollas fritas.',
                        precio: 9000,
                        categoria: 'Salchipapas y Porciones',
                        disponible: true,
                        tiempo_preparacion_minutos: 5,
                    },
                    // === Platos Especiales y Pechugas ===
                    {
                        nombre: 'Filete de Róbalo / Chuleta',
                        descripcion: 'Filete de róbalo o chuleta con papa a la francesa, ensalada, yuca y patacón.',
                        precio: 18000,
                        categoria: 'Platos Especiales y Pechugas',
                        disponible: true,
                        tiempo_preparacion_minutos: 20,
                    },
                    {
                        nombre: 'Carne Asada',
                        descripcion: 'Acompañada de papa a la francesa, ensalada, yuca y patacón.',
                        precio: 19500,
                        categoria: 'Platos Especiales y Pechugas',
                        disponible: true,
                        tiempo_preparacion_minutos: 15,
                    },
                    {
                        nombre: 'Churrasco / Costilla BBQ',
                        descripcion: 'Acompañado de papa a la francesa, ensalada, yuca y patacón.',
                        precio: 22000,
                        categoria: 'Platos Especiales y Pechugas',
                        disponible: true,
                        tiempo_preparacion_minutos: 18,
                    },
                    {
                        nombre: 'Carne al Caballo',
                        descripcion: 'Ahogado, papa a la francesa, ensalada, yuca, patacón, queso y huevo frito.',
                        precio: 23000,
                        categoria: 'Platos Especiales y Pechugas',
                        disponible: true,
                        tiempo_preparacion_minutos: 18,
                    },
                    {
                        nombre: 'Presa de Pollo Crispy',
                        descripcion: '1 presa con papa a la francesa.',
                        precio: 8000,
                        categoria: 'Platos Especiales y Pechugas',
                        disponible: true,
                        tiempo_preparacion_minutos: 10,
                    },
                    {
                        nombre: 'Bandeja de Pollo Crispy',
                        descripcion: '2 presas con papa a la francesa, ensalada hawaiana, yuca y patacón.',
                        precio: 15000,
                        categoria: 'Platos Especiales y Pechugas',
                        disponible: true,
                        tiempo_preparacion_minutos: 12,
                    },
                    {
                        nombre: 'Patacón con Carne o Pollo',
                        descripcion: 'Carne o pollo, ahogado, huevo, jamón y queso.',
                        precio: 17500,
                        categoria: 'Platos Especiales y Pechugas',
                        disponible: true,
                        tiempo_preparacion_minutos: 12,
                    },
                    {
                        nombre: 'Patacón Mixto',
                        descripcion: 'Carne y pollo, ahogado, huevo, jamón y queso.',
                        precio: 21500,
                        categoria: 'Platos Especiales y Pechugas',
                        disponible: true,
                        tiempo_preparacion_minutos: 12,
                    },
                    {
                        nombre: 'Patacón Mixto con Champiñón',
                        descripcion: 'Carne y pollo, ahogado, champiñón, huevo, jamón y queso.',
                        precio: 23000,
                        categoria: 'Platos Especiales y Pechugas',
                        disponible: true,
                        tiempo_preparacion_minutos: 13,
                    },
                    {
                        nombre: 'Mazorcada de Carne o Pollo',
                        descripcion: 'Maíz tierno, carne o pollo, ahogado, queso, papa fosforito, jamón, huevo y salsas.',
                        precio: 19500,
                        categoria: 'Platos Especiales y Pechugas',
                        disponible: true,
                        tiempo_preparacion_minutos: 12,
                    },
                    {
                        nombre: 'Mazorcada Mixta',
                        descripcion: 'Maíz tierno, carne y pollo, ahogado, queso, papa fosforito, jamón, huevo y salsas.',
                        precio: 23000,
                        categoria: 'Platos Especiales y Pechugas',
                        disponible: true,
                        tiempo_preparacion_minutos: 12,
                    },
                    {
                        nombre: 'Mazorcada Mixta con Tocineta',
                        descripcion: 'Maíz tierno, carne y pollo, tocineta, ahogado, queso, papa fosforito, jamón, huevo y salsas.',
                        precio: 24000,
                        categoria: 'Platos Especiales y Pechugas',
                        disponible: true,
                        tiempo_preparacion_minutos: 13,
                    },
                    {
                        nombre: 'Mazorcada de la Casa',
                        descripcion: 'Maíz tierno, carne y pollo, tocineta, ahogado, queso, papa fosforito, jamón, huevo y salsas.',
                        precio: 27000,
                        categoria: 'Platos Especiales y Pechugas',
                        disponible: true,
                        tiempo_preparacion_minutos: 14,
                    },
                    {
                        nombre: 'Alas BBQ',
                        descripcion: 'Alas de pollo bañadas en salsa BBQ.',
                        precio: 12000,
                        categoria: 'Platos Especiales y Pechugas',
                        disponible: true,
                        tiempo_preparacion_minutos: 10,
                    },
                    {
                        nombre: 'Pechuga Cordon Blue',
                        descripcion: 'Acompañada de papa a la francesa, ensalada, yuca y patacón.',
                        precio: 18000,
                        categoria: 'Platos Especiales y Pechugas',
                        disponible: true,
                        tiempo_preparacion_minutos: 18,
                    },
                    {
                        nombre: 'Pechuga Asada',
                        descripcion: 'Acompañada de papa a la francesa, ensalada, yuca y patacón.',
                        precio: 21000,
                        categoria: 'Platos Especiales y Pechugas',
                        disponible: true,
                        tiempo_preparacion_minutos: 15,
                    },
                    {
                        nombre: 'Pechuga Gratinada',
                        descripcion: 'Pechuga con queso gratinado. Acompañada de papa, ensalada, yuca y patacón.',
                        precio: 22000,
                        categoria: 'Platos Especiales y Pechugas',
                        disponible: true,
                        tiempo_preparacion_minutos: 16,
                    },
                    {
                        nombre: 'Pechuga Encebollada',
                        descripcion: 'Acompañada de papa a la francesa, ensalada, yuca y patacón.',
                        precio: 22000,
                        categoria: 'Platos Especiales y Pechugas',
                        disponible: true,
                        tiempo_preparacion_minutos: 16,
                    },
                    {
                        nombre: 'Pechuga Hawaiana',
                        descripcion: 'Acompañada de papa a la francesa, ensalada, yuca y patacón.',
                        precio: 23500,
                        categoria: 'Platos Especiales y Pechugas',
                        disponible: true,
                        tiempo_preparacion_minutos: 16,
                    },
                    {
                        nombre: 'Pechuga Pollo Champiñón',
                        descripcion: 'Pechuga bañada en salsa de champiñones. Acompañada de papa, ensalada, yuca y patacón.',
                        precio: 24000,
                        categoria: 'Platos Especiales y Pechugas',
                        disponible: true,
                        tiempo_preparacion_minutos: 17,
                    },
                    {
                        nombre: 'Pechuga Marinera',
                        descripcion: 'Acompañada de papa a la francesa, ensalada, yuca y patacón.',
                        precio: 25000,
                        categoria: 'Platos Especiales y Pechugas',
                        disponible: true,
                        tiempo_preparacion_minutos: 20,
                    },
                    // === Apanados, Pinchos y Crepes ===
                    {
                        nombre: 'Pincho Apanado + Papa francesa',
                        descripcion: 'Pincho de pollo apanado crujiente con papas fritas.',
                        precio: 11500,
                        categoria: 'Apanados, Pinchos y Crepes',
                        disponible: true,
                        tiempo_preparacion_minutos: 10,
                    },
                    {
                        nombre: 'Nuggets de Pollo Apanado + Papa francesa',
                        descripcion: 'Nuggets crocantes con papas francesas.',
                        precio: 9500,
                        categoria: 'Apanados, Pinchos y Crepes',
                        disponible: true,
                        tiempo_preparacion_minutos: 8,
                    },
                    {
                        nombre: 'Pincho de Cerdo Asado',
                        descripcion: 'Pincho de cerdo asado con papa o arepa pequeña.',
                        precio: 8500,
                        categoria: 'Apanados, Pinchos y Crepes',
                        disponible: true,
                        tiempo_preparacion_minutos: 10,
                    },
                    {
                        nombre: 'Pincho de Res Asado',
                        descripcion: 'Pincho de res asada con papa o arepa pequeña.',
                        precio: 8500,
                        categoria: 'Apanados, Pinchos y Crepes',
                        disponible: true,
                        tiempo_preparacion_minutos: 10,
                    },
                    {
                        nombre: 'Chorizo con Arepa',
                        descripcion: 'Chorizo santarrosano con arepa de maíz.',
                        precio: 7500,
                        categoria: 'Apanados, Pinchos y Crepes',
                        disponible: true,
                        tiempo_preparacion_minutos: 7,
                    },
                    {
                        nombre: 'Chorizo Arepa Queso',
                        descripcion: 'Chorizo con arepa de maíz con queso gratinado.',
                        precio: 8500,
                        categoria: 'Apanados, Pinchos y Crepes',
                        disponible: true,
                        tiempo_preparacion_minutos: 8,
                    },
                    {
                        nombre: 'Combo Asado',
                        descripcion: 'Chorizo, arepa con queso y pincho de res o cerdo.',
                        precio: 12000,
                        categoria: 'Apanados, Pinchos y Crepes',
                        disponible: true,
                        tiempo_preparacion_minutos: 12,
                    },
                    {
                        nombre: 'Crepe Sencillo',
                        descripcion: 'Pollo desmechado, salsa de champiñones y queso.',
                        precio: 12500,
                        categoria: 'Apanados, Pinchos y Crepes',
                        disponible: true,
                        tiempo_preparacion_minutos: 10,
                    },
                    {
                        nombre: 'Crepe Especial',
                        descripcion: 'Pollo desmechado, salsa de champiñones, queso y champiñones enteros.',
                        precio: 14500,
                        categoria: 'Apanados, Pinchos y Crepes',
                        disponible: true,
                        tiempo_preparacion_minutos: 12,
                    },
                    // === Combos Infantiles ===
                    {
                        nombre: 'Combo Infantil - Pincho de Pollo Apanado',
                        descripcion: 'Incluye Papa a la francesa + Jugo + Juguete sorpresa.',
                        precio: 23000,
                        categoria: 'Combos Infantiles',
                        disponible: true,
                        tiempo_preparacion_minutos: 10,
                    },
                    {
                        nombre: 'Combo Infantil - Nuggets de Pollo Apanado',
                        descripcion: 'Incluye Papa a la francesa + Jugo + Juguete sorpresa.',
                        precio: 23000,
                        categoria: 'Combos Infantiles',
                        disponible: true,
                        tiempo_preparacion_minutos: 8,
                    },
                    {
                        nombre: 'Combo Infantil - Salchipapa',
                        descripcion: 'Incluye Papa a la francesa + Jugo + Juguete sorpresa.',
                        precio: 23000,
                        categoria: 'Combos Infantiles',
                        disponible: true,
                        tiempo_preparacion_minutos: 8,
                    },
                    {
                        nombre: 'Combo Infantil - Pollo Crispy',
                        descripcion: 'Incluye Papa a la francesa + Jugo + Juguete sorpresa.',
                        precio: 23000,
                        categoria: 'Combos Infantiles',
                        disponible: true,
                        tiempo_preparacion_minutos: 10,
                    },
                    {
                        nombre: 'Combo Infantil - Hamburguesa Sencilla',
                        descripcion: 'Incluye Papa a la francesa + Jugo + Juguete sorpresa.',
                        precio: 23000,
                        categoria: 'Combos Infantiles',
                        disponible: true,
                        tiempo_preparacion_minutos: 10,
                    },
                    {
                        nombre: 'Combo Infantil - Perro Sencillo',
                        descripcion: 'Incluye Papa a la francesa + Jugo + Juguete sorpresa.',
                        precio: 23000,
                        categoria: 'Combos Infantiles',
                        disponible: true,
                        tiempo_preparacion_minutos: 8,
                    },
                    // === Jugos y Dulces ===
                    {
                        nombre: 'Jugo Natural en Agua',
                        descripcion: 'Fresa, mango, lulo, maracuyá, mora o guanábana en agua.',
                        precio: 6000,
                        categoria: 'Jugos y Dulces',
                        disponible: true,
                        tiempo_preparacion_minutos: 4,
                    },
                    {
                        nombre: 'Jugo Natural en Leche',
                        descripcion: 'Fresa, mango, lulo, maracuyá, mora o guanábana en leche.',
                        precio: 7000,
                        categoria: 'Jugos y Dulces',
                        disponible: true,
                        tiempo_preparacion_minutos: 4,
                    },
                    {
                        nombre: 'Limonada Natural',
                        descripcion: 'Limonada natural clásica exprimida al momento.',
                        precio: 6000,
                        categoria: 'Jugos y Dulces',
                        disponible: true,
                        tiempo_preparacion_minutos: 3,
                    },
                    {
                        nombre: 'Limonada de Coco',
                        descripcion: 'Limonada cremosa con leche de coco y hielo.',
                        precio: 7000,
                        categoria: 'Jugos y Dulces',
                        disponible: true,
                        tiempo_preparacion_minutos: 4,
                    },
                    {
                        nombre: 'Limonada Cerezada',
                        descripcion: 'Limonada natural frapeada con cerezas.',
                        precio: 7000,
                        categoria: 'Jugos y Dulces',
                        disponible: true,
                        tiempo_preparacion_minutos: 4,
                    },
                    {
                        nombre: 'Malteada',
                        descripcion: 'Malteada cremosa de vainilla, chocolate o fresa con crema batida.',
                        precio: 13000,
                        categoria: 'Jugos y Dulces',
                        disponible: true,
                        tiempo_preparacion_minutos: 5,
                    },
                    {
                        nombre: 'Crepe Fresa y Nutella',
                        descripcion: 'Crepe relleno de fresas frescas y chocolate Nutella.',
                        precio: 12000,
                        categoria: 'Jugos y Dulces',
                        disponible: true,
                        tiempo_preparacion_minutos: 8,
                    },
                    {
                        nombre: 'Crepe Banano y Nutella',
                        descripcion: 'Crepe relleno de banano y Nutella.',
                        precio: 12500,
                        categoria: 'Jugos y Dulces',
                        disponible: true,
                        tiempo_preparacion_minutos: 8,
                    },
                    {
                        nombre: 'Crazy Crepe',
                        descripcion: 'Crepe gigante con frutas variadas, helado y salsa de chocolate.',
                        precio: 16000,
                        categoria: 'Jugos y Dulces',
                        disponible: true,
                        tiempo_preparacion_minutos: 10,
                    },
                    {
                        nombre: 'Brownie con Helado',
                        descripcion: 'Brownie caliente de chocolate con una bola de helado de vainilla.',
                        precio: 10000,
                        categoria: 'Jugos y Dulces',
                        disponible: true,
                        tiempo_preparacion_minutos: 5,
                    },
                    {
                        nombre: 'Chiqui Empanadas',
                        descripcion: 'Empanadita pequeña de carne y papa.',
                        precio: 800,
                        categoria: 'Jugos y Dulces',
                        disponible: true,
                        tiempo_preparacion_minutos: 3,
                    },
                    {
                        nombre: 'Empanada Grande',
                        descripcion: 'Pollo Champiñón, Mexicana, Ranchera, Hawaiana o Papa y Carne.',
                        precio: 2500,
                        categoria: 'Jugos y Dulces',
                        disponible: true,
                        tiempo_preparacion_minutos: 4,
                    },
                    {
                        nombre: 'Deditos de Queso',
                        descripcion: 'Dedito de queso y bocadillo caliente.',
                        precio: 800,
                        categoria: 'Jugos y Dulces',
                        disponible: true,
                        tiempo_preparacion_minutos: 3,
                    },
                    // === Pizzas ===
                    {
                        nombre: 'Pizza Hawaiana Tocineta',
                        descripcion: 'Piña, jamón, tocineta, extraqueso y salsa de la casa.',
                        precio: 28500,
                        categoria: 'Pizzas',
                        disponible: true,
                        precios_por_tamano: { Personal: 18000, Mediana: 28500, Grande: 39500, Extragrande: 51500, Gigante: 63500, Familiar: 76000 }
                    },
                    {
                        nombre: 'Pizza Hawaiana',
                        descripcion: 'Jamón, extraqueso, piña y salsa de la casa.',
                        precio: 26500,
                        categoria: 'Pizzas',
                        disponible: true,
                        precios_por_tamano: { Personal: 18000, Mediana: 26500, Grande: 36500, Extragrande: 48500, Gigante: 60500, Familiar: 76000 }
                    },
                    {
                        nombre: 'Pizza Tropical',
                        descripcion: 'Uvas pasas, cerezas, piña, extraqueso y salsa de la casa.',
                        precio: 25500,
                        categoria: 'Pizzas',
                        disponible: true,
                        precios_por_tamano: { Personal: 18000, Mediana: 25500, Grande: 36500, Extragrande: 48500, Gigante: 60500, Familiar: 76000 }
                    },
                    {
                        nombre: 'Pizza Pollo Champiñón',
                        descripcion: 'Pollo, champiñones, extraqueso y salsa de la casa.',
                        precio: 28000,
                        categoria: 'Pizzas',
                        disponible: true,
                        precios_por_tamano: { Personal: 18000, Mediana: 28000, Grande: 38000, Extragrande: 51000, Gigante: 62000, Familiar: 75000 }
                    },
                    {
                        nombre: 'Pizza Pollo Champiñones Gourmet',
                        descripcion: 'Pollo, champiñones, salsa bechamel, picado de cebolla y pimentón, extraqueso y salsa.',
                        precio: 31500,
                        categoria: 'Pizzas',
                        disponible: true,
                        precios_por_tamano: { Personal: 18000, Mediana: 31500, Grande: 41500, Extragrande: 55500, Gigante: 66500, Familiar: 76000 }
                    },
                    {
                        nombre: 'Pizza Carnes',
                        descripcion: 'Salami, jamón, pollo, picado de cebolla y pimentón, extraqueso y salsa.',
                        precio: 30000,
                        categoria: 'Pizzas',
                        disponible: true,
                        precios_por_tamano: { Personal: 18000, Mediana: 30000, Grande: 41000, Extragrande: 51000, Gigante: 63000, Familiar: 76000 }
                    },
                    {
                        nombre: 'Pizza Campesina',
                        descripcion: 'Maíz tierno, espinacas, chorizo pre frito, tocineta, extraqueso y salsa.',
                        precio: 32000,
                        categoria: 'Pizzas',
                        disponible: true,
                        precios_por_tamano: { Personal: 18000, Mediana: 32000, Grande: 42000, Extragrande: 54000, Gigante: 66000, Familiar: 76000 }
                    },
                    {
                        nombre: 'Pizza Criolla',
                        descripcion: 'Desmechada, maíz tierno, chorizo pre frito, tocineta, extraqueso y salsa.',
                        precio: 31000,
                        categoria: 'Pizzas',
                        disponible: true,
                        precios_por_tamano: { Personal: 18000, Mediana: 31000, Grande: 41000, Extragrande: 54000, Gigante: 65000, Familiar: 76000 }
                    },
                    {
                        nombre: 'Pizza Italiana',
                        descripcion: 'Champiñones, pimentón, chorizo pre frito, extraqueso y salsa de la casa.',
                        precio: 27500,
                        categoria: 'Pizzas',
                        disponible: true,
                        precios_por_tamano: { Personal: 18000, Mediana: 27500, Grande: 36500, Extragrande: 51500, Gigante: 63500, Familiar: 76000 }
                    },
                    {
                        nombre: 'Pizza Napolitana',
                        descripcion: 'Tomates en rodajas, orégano, champiñones, extraqueso y salsa de la casa.',
                        precio: 27500,
                        categoria: 'Pizzas',
                        disponible: true,
                        precios_por_tamano: { Personal: 18000, Mediana: 27500, Grande: 36500, Extragrande: 51500, Gigante: 63500, Familiar: 76000 }
                    },
                    {
                        nombre: 'Pizza Megacarnes',
                        descripcion: 'Pollo, salami, carne desmechada, jamón, tocineta, extraqueso y salsa.',
                        precio: 30500,
                        categoria: 'Pizzas',
                        disponible: true,
                        precios_por_tamano: { Personal: 18000, Mediana: 30500, Grande: 41500, Extragrande: 53500, Gigante: 65500, Familiar: 76000 }
                    },
                    {
                        nombre: 'Pizza Pollo Carbonara',
                        descripcion: 'Pollo bañado en salsa bechamel, tocineta, extraqueso y salsa.',
                        precio: 30000,
                        categoria: 'Pizzas',
                        disponible: true,
                        precios_por_tamano: { Personal: 18000, Mediana: 30000, Grande: 40000, Extragrande: 52000, Gigante: 64000, Familiar: 76000 }
                    },
                    {
                        nombre: 'Pizza Pollo BBQ',
                        descripcion: 'Pollo bañado en salsa BBQ, champiñones, extraqueso y salsa.',
                        precio: 30000,
                        categoria: 'Pizzas',
                        disponible: true,
                        precios_por_tamano: { Personal: 18000, Mediana: 30000, Grande: 40000, Extragrande: 52000, Gigante: 64000, Familiar: 76000 }
                    },
                    {
                        nombre: 'Pizza Pollo Miel Mostaza',
                        descripcion: 'Pollo desmechado, salsa miel mostaza, tocineta, extraqueso y salsa.',
                        precio: 30000,
                        categoria: 'Pizzas',
                        disponible: true,
                        precios_por_tamano: { Personal: 18000, Mediana: 30000, Grande: 40000, Extragrande: 52000, Gigante: 64000, Familiar: 76000 }
                    },
                    {
                        nombre: 'Pizza Salami y Champiñones',
                        descripcion: 'Salami, champiñones, extraqueso y salsa de la casa.',
                        precio: 27500,
                        categoria: 'Pizzas',
                        disponible: true,
                        precios_por_tamano: { Personal: 18000, Mediana: 27500, Grande: 36500, Extragrande: 48500, Gigante: 60500, Familiar: 76000 }
                    },
                    {
                        nombre: 'Pizza Colombiana',
                        descripcion: 'Maíz tierno, carne, tomate en cuadros, cebolla, orégano, extraqueso y salsa.',
                        precio: 30000,
                        categoria: 'Pizzas',
                        disponible: true,
                        precios_por_tamano: { Personal: 18000, Mediana: 30000, Grande: 40000, Extragrande: 53000, Gigante: 65000, Familiar: 76000 }
                    },
                    {
                        nombre: 'Pizza Jamón y Pollo',
                        descripcion: 'Jamón, pollo, extraqueso y salsa de la casa.',
                        precio: 27500,
                        categoria: 'Pizzas',
                        disponible: true,
                        precios_por_tamano: { Personal: 18000, Mediana: 27500, Grande: 37500, Extragrande: 52500, Gigante: 61500, Familiar: 76000 }
                    },
                    {
                        nombre: 'Pizza Vegetariana',
                        descripcion: 'Champiñones, tomate en cuadros, maíz tierno, espinaca, orégano, extraqueso y salsa.',
                        precio: 28000,
                        categoria: 'Pizzas',
                        disponible: true,
                        precios_por_tamano: { Personal: 18000, Mediana: 28000, Grande: 37000, Extragrande: 50000, Gigante: 62000, Familiar: 76000 }
                    },
                    {
                        nombre: 'Pizza Mexicana',
                        descripcion: 'Pimentón, carne molida, chorizo prefrito, jalapeños, nachos, cebolla, tomate, cilantro, extraqueso y salsa.',
                        precio: 30000,
                        categoria: 'Pizzas',
                        disponible: true,
                        precios_por_tamano: { Personal: 18000, Mediana: 30000, Grande: 41500, Extragrande: 53500, Gigante: 65000, Familiar: 76000 }
                    },
                    // === Sándwiches y Lasañas ===
                    {
                        nombre: 'Sándwich Sencillo Solo',
                        descripcion: 'Cebolla, tomate, lechuga, queso, jamón Pietrán y huevo. (Solo)',
                        precio: 10000,
                        categoria: 'Sándwiches y Lasañas',
                        disponible: true,
                    },
                    {
                        nombre: 'Sándwich Sencillo en Combo',
                        descripcion: 'Cebolla, tomate, lechuga, queso, jamón Pietrán y huevo. Incluye papas y gaseosa o limonada.',
                        precio: 12000,
                        categoria: 'Sándwiches y Lasañas',
                        disponible: true,
                    },
                    {
                        nombre: 'Sándwich de Pollo Solo',
                        descripcion: 'Pollo desmechado, cebolla, queso, tomate, jamón Pietrán y huevo. (Solo)',
                        precio: 12500,
                        categoria: 'Sándwiches y Lasañas',
                        disponible: true,
                    },
                    {
                        nombre: 'Sándwich de Pollo en Combo',
                        descripcion: 'Pollo desmechado, cebolla, queso, tomate, jamón Pietrán y huevo. Incluye papas y gaseosa o limonada.',
                        precio: 14000,
                        categoria: 'Sándwiches y Lasañas',
                        disponible: true,
                    },
                    {
                        nombre: 'Sándwich de Carne Solo',
                        descripcion: 'Carne desmechada, cebolla, queso, tomate, jamón Pietrán y huevo. (Solo)',
                        precio: 12500,
                        categoria: 'Sándwiches y Lasañas',
                        disponible: true,
                    },
                    {
                        nombre: 'Sándwich de Carne en Combo',
                        descripcion: 'Carne desmechada, cebolla, queso, tomate, jamón Pietrán y huevo. Incluye papas y gaseosa o limonada.',
                        precio: 14000,
                        categoria: 'Sándwiches y Lasañas',
                        disponible: true,
                    },
                    {
                        nombre: 'Sándwich de Atún Solo',
                        descripcion: 'Atún Van Camp\'s, lechuga, cebolla, queso, tomate, jamón Pietrán. (Solo)',
                        precio: 16500,
                        categoria: 'Sándwiches y Lasañas',
                        disponible: true,
                    },
                    {
                        nombre: 'Sándwich de Atún en Combo',
                        descripcion: 'Atún Van Camp\'s, lechuga, cebolla, queso, tomate, jamón Pietrán. Incluye papas y gaseosa o limonada.',
                        precio: 18000,
                        categoria: 'Sándwiches y Lasañas',
                        disponible: true,
                    },
                    {
                        nombre: 'Lasaña Grande Mixta',
                        descripcion: 'Pollo y carne desmechados con doble capa de queso gratinado.',
                        precio: 15500,
                        categoria: 'Sándwiches y Lasañas',
                        disponible: true,
                    },
                    {
                        nombre: 'Lasaña Grande Mixta con Champiñones',
                        descripcion: 'Pollo y carne desmechados con doble capa de queso y champiñones frescos.',
                        precio: 16500,
                        categoria: 'Sándwiches y Lasañas',
                        disponible: true,
                    },
                ];
                const platosCreados = [];
                for (const data of platosData) {
                    const plato = yield this.platoRepository.save((0, class_transformer_1.plainToClass)(plato_entity_1.PlatoEntity, data));
                    platosCreados.push(plato);
                }
                yield this.fixImageUrls();
                console.log('✅ Seeder execution completed successfully');
            }
            catch (error) {
                console.error('Error in executeSeeder:', error);
                throw error;
            }
        });
    }
    seedRolesUsers(_, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.executeSeeder();
                return res.status(200).json({
                    message: 'Roles and Users Seeded Successfully',
                });
            }
            catch (error) {
                console.error(error);
                return res.status(500).json({
                    message: 'Error Seeding Roles and Users',
                    data: error,
                });
            }
        });
    }
    fixImageUrls() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const platosRepository = DatabaseConnection_1.DatabaseConnection.appDataSource.getRepository(plato_entity_1.PlatoEntity);
                const platos = yield platosRepository.find({
                    where: {
                        imagen_url: require('typeorm').Not(require('typeorm').IsNull())
                    }
                });
                let updatedCount = 0;
                for (const plato of platos) {
                    if (plato.imagen_url && plato.imagen_url.includes(':4001')) {
                        const correctedUrl = plato.imagen_url.replace(':4001', ':4003');
                        yield platosRepository.update(plato.plato_id, { imagen_url: correctedUrl });
                        updatedCount++;
                    }
                }
                console.log(`Fixed ${updatedCount} image URLs`);
            }
            catch (error) {
                console.error('Error fixing image URLs:', error);
            }
        });
    }
}
exports.SeederController = SeederController;
