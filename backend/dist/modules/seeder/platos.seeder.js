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
exports.PlatosSeeder = void 0;
const DatabaseConnection_1 = require("../../core/database/DatabaseConnection");
const plato_entity_1 = require("../menu/entities/plato.entity");
class PlatosSeeder {
    static run() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const platoRepository = DatabaseConnection_1.DatabaseConnection.appDataSource.getRepository(plato_entity_1.PlatoEntity);
                // Verificar si ya existen platos
                const existingPlatos = yield platoRepository.count();
                if (existingPlatos > 0) {
                    console.log('Los platos ya están creados en la base de datos');
                    return;
                }
                // Crear platos de ejemplo para cada categoría
                const platos = [
                    // Entradas
                    {
                        nombre: 'Ensalada César',
                        descripcion: 'Lechuga romana fresca con aderezo César, crutones y queso parmesano',
                        precio: 15.50,
                        categoria: 'ENTRADA',
                        disponible: true,
                        tiempo_preparacion_minutos: 10,
                        alergenos: ['lácteos', 'gluten'],
                    },
                    {
                        nombre: 'Sopa de Tomate',
                        descripcion: 'Sopa cremosa de tomate con albahaca fresca y un toque de crema',
                        precio: 12.00,
                        categoria: 'ENTRADA',
                        disponible: true,
                        tiempo_preparacion_minutos: 15,
                        alergenos: ['lácteos'],
                    },
                    // Platos Principales
                    {
                        nombre: 'Filete de Salmón a la Parrilla',
                        descripcion: 'Salmón fresco a la parrilla con verduras asadas y salsa de limón',
                        precio: 28.00,
                        categoria: 'PLATO_PRINCIPAL',
                        disponible: true,
                        tiempo_preparacion_minutos: 20,
                        alergenos: ['pescado'],
                    },
                    {
                        nombre: 'Pasta Carbonara',
                        descripcion: 'Pasta fresca con salsa carbonara, panceta y queso pecorino',
                        precio: 22.50,
                        categoria: 'PLATO_PRINCIPAL',
                        disponible: true,
                        tiempo_preparacion_minutos: 18,
                        alergenos: ['gluten', 'lácteos', 'huevos'],
                    },
                    {
                        nombre: 'Pollo al Curry',
                        descripcion: 'Pollo tierno en salsa de curry con arroz basmati y verduras',
                        precio: 24.00,
                        categoria: 'PLATO_PRINCIPAL',
                        disponible: true,
                        tiempo_preparacion_minutos: 25,
                        alergenos: [],
                    },
                    // Postres
                    {
                        nombre: 'Tiramisú',
                        descripcion: 'Clásico postre italiano con café, mascarpone y cacao',
                        precio: 8.50,
                        categoria: 'POSTRE',
                        disponible: true,
                        tiempo_preparacion_minutos: 5,
                        alergenos: ['gluten', 'lácteos', 'huevos'],
                    },
                    {
                        nombre: 'Frutas Frescas de Temporada',
                        descripcion: 'Selección de frutas frescas con miel y menta',
                        precio: 7.00,
                        categoria: 'POSTRE',
                        disponible: true,
                        tiempo_preparacion_minutos: 3,
                        alergenos: [],
                    },
                    // Bebidas
                    {
                        nombre: 'Café Espresso',
                        descripcion: 'Café espresso italiano recién preparado',
                        precio: 3.50,
                        categoria: 'BEBIDA',
                        disponible: true,
                        tiempo_preparacion_minutos: 2,
                        alergenos: [],
                    },
                    {
                        nombre: 'Jugo de Naranja Natural',
                        descripcion: 'Jugo fresco de naranjas exprimidas en el momento',
                        precio: 4.00,
                        categoria: 'BEBIDA',
                        disponible: true,
                        tiempo_preparacion_minutos: 1,
                        alergenos: [],
                    },
                    {
                        nombre: 'Agua Mineral',
                        descripcion: 'Agua mineral con gas o sin gas',
                        precio: 2.50,
                        categoria: 'BEBIDA',
                        disponible: true,
                        tiempo_preparacion_minutos: 1,
                        alergenos: [],
                    },
                    // Ensaladas
                    {
                        nombre: 'Ensalada Mediterránea',
                        descripcion: 'Mezcla de lechugas, tomates cherry, aceitunas, queso feta y aderezo de oliva',
                        precio: 16.00,
                        categoria: 'ENSALADA',
                        disponible: true,
                        tiempo_preparacion_minutos: 8,
                        alergenos: ['lácteos'],
                    },
                    // Sopas
                    {
                        nombre: 'Sopa de Pollo con Fideos',
                        descripcion: 'Sopa casera de pollo con fideos y verduras frescas',
                        precio: 13.50,
                        categoria: 'SOPA',
                        disponible: true,
                        tiempo_preparacion_minutos: 12,
                        alergenos: ['gluten'],
                    },
                ];
                yield platoRepository.save(platos);
                console.log('✅ Se han creado platos de ejemplo exitosamente en la base de datos');
                console.log('📊 Resumen:');
                console.log('   - Entradas: 2 platos');
                console.log('   - Platos Principales: 3 platos');
                console.log('   - Postres: 2 platos');
                console.log('   - Bebidas: 3 bebidas');
                console.log('   - Ensaladas: 1 plato');
                console.log('   - Sopas: 1 plato');
                console.log('   - Total: 12 platos creados');
            }
            catch (error) {
                console.error('❌ Error al crear los platos:', error);
                throw error;
            }
        });
    }
}
exports.PlatosSeeder = PlatosSeeder;
