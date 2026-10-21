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
exports.MesasRoutes = void 0;
const express_1 = require("express");
const mesa_entity_1 = require("../entities/mesa.entity");
const mesas_controller_1 = require("../controllers/mesas.controller");
const mesas_service_1 = require("../services/mesas.service");
const mesa_repository_1 = require("../repositories/mesa.repository");
const DatabaseConnection_1 = require("../../../core/database/DatabaseConnection");
class MesasRoutes {
    constructor() {
        this.router = (0, express_1.Router)();
        const mesaRepository = DatabaseConnection_1.DatabaseConnection.appDataSource.getRepository(mesa_entity_1.MesaEntity);
        const iMesaRepository = new mesa_repository_1.MesaRepository(mesaRepository);
        const mesasService = new mesas_service_1.MesasService(iMesaRepository);
        this.mesasController = new mesas_controller_1.MesasController(mesasService);
        this.initializeRoutes();
    }
    initializeRoutes() {
        // GET /api/v1/mesas - Obtener todas las mesas (solo autenticados)
        this.router.get('/', (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const mesas = yield this.mesasController.findAll();
                res.json(mesas);
            }
            catch (error) {
                res.status(500).json({ error: 'Error al obtener las mesas' });
            }
        }));
        // GET /api/v1/mesas/:id - Obtener una mesa por ID
        this.router.get('/:id', (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const id = parseInt(req.params.id);
                const mesa = yield this.mesasController.findById(id);
                res.json(mesa);
            }
            catch (error) {
                if (error.message.includes('no encontrada')) {
                    res.status(404).json({ error: error.message });
                }
                else {
                    res.status(500).json({ error: 'Error al obtener la mesa' });
                }
            }
        }));
        // POST /api/v1/mesas - Crear una nueva mesa
        this.router.post('/', (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const createMesaDto = req.body;
                const mesa = yield this.mesasController.create(createMesaDto);
                res.status(201).json(mesa);
            }
            catch (error) {
                if (error.message && error.message.includes('Ya existe')) {
                    res.status(400).json({ error: error.message });
                }
                else {
                    res.status(500).json({ error: 'Error al crear la mesa' });
                }
            }
        }));
        // PATCH /api/v1/mesas/:id - Actualizar una mesa
        this.router.patch('/:id', (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const id = parseInt(req.params.id);
                const updateMesaDto = req.body;
                const mesa = yield this.mesasController.update(id, updateMesaDto);
                res.json(mesa);
            }
            catch (error) {
                if (error.message.includes('no encontrada')) {
                    res.status(404).json({ error: error.message });
                }
                else {
                    res.status(500).json({ error: 'Error al actualizar la mesa' });
                }
            }
        }));
        // DELETE /api/v1/mesas/:id - Eliminar una mesa
        this.router.delete('/:id', (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const id = parseInt(req.params.id);
                yield this.mesasController.delete(id);
                res.status(200).json({ message: 'Mesa eliminada correctamente' });
            }
            catch (error) {
                const msg = error.message || 'Error al eliminar la mesa';
                if (msg.includes('no encontrada')) {
                    res.status(404).json({ error: msg });
                }
                else if (msg.includes('No se puede eliminar')) {
                    res.status(400).json({ error: msg });
                }
                else {
                    res.status(500).json({ error: msg });
                }
            }
        }));
        // PATCH /api/v1/mesas/:id/estado - Cambiar el estado de una mesa
        this.router.patch('/:id/estado', (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const id = parseInt(req.params.id);
                const { estado } = req.body;
                const mesa = yield this.mesasController.cambiarEstado(id, estado);
                res.json(mesa);
            }
            catch (error) {
                if (error.message.includes('no encontrada')) {
                    res.status(404).json({ error: error.message });
                }
                else {
                    res
                        .status(500)
                        .json({ error: 'Error al cambiar el estado de la mesa' });
                }
            }
        }));
        // GET /api/v1/mesas/estado/:estado - Obtener mesas por estado
        this.router.get('/estado/:estado', (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { estado } = req.params;
                const validEstados = ['libre', 'reservada', 'ocupada', 'mantenimiento'];
                if (!validEstados.includes(estado)) {
                    return res.status(400).json({ error: 'Estado inválido' });
                }
                const mesas = yield this.mesasController.findByEstado(estado);
                res.json(mesas);
            }
            catch (error) {
                res
                    .status(500)
                    .json({ error: 'Error al obtener las mesas por estado' });
            }
        }));
        // POST /api/v1/mesas/confirmar-pedido
        this.router.post('/confirmar-pedido', (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { pedidoInfo, items } = req.body;
                if (!pedidoInfo || !items || !Array.isArray(items)) {
                    return res.status(400).json({ error: 'Faltan datos de pedidoInfo o items' });
                }
                const result = yield this.mesasController.confirmarPedido(pedidoInfo, items);
                res.status(200).json(result);
            }
            catch (error) {
                console.error('Error al confirmar pedido:', error);
                res.status(500).json({ error: 'Error al confirmar pedido e imprimir ticket' });
            }
        }));
        // POST /api/v1/mesas/imprimir-factura
        this.router.post('/imprimir-factura', (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { pedidoInfo, tipo } = req.body;
                if (!pedidoInfo) {
                    return res.status(400).json({ error: 'Faltan datos de pedidoInfo' });
                }
                const result = yield this.mesasController.imprimirFactura(pedidoInfo, tipo);
                res.status(200).json(result);
            }
            catch (error) {
                console.error('Error al imprimir factura:', error);
                res.status(500).json({ error: 'Error al imprimir factura' });
            }
        }));
        // POST /api/v1/mesas/imprimir-precuenta
        this.router.post('/imprimir-precuenta', (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { pedidoInfo, tipo } = req.body;
                if (!pedidoInfo) {
                    return res.status(400).json({ error: 'Faltan datos de pedidoInfo' });
                }
                const result = yield this.mesasController.imprimirPrecuenta(pedidoInfo, tipo);
                res.status(200).json(result);
            }
            catch (error) {
                console.error('Error al imprimir pre-cuenta:', error);
                res.status(500).json({ error: 'Error al imprimir pre-cuenta de mesa' });
            }
        }));
        // POST /api/v1/mesas/confirmar-domicilio
        this.router.post('/confirmar-domicilio', (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { pedidoInfo, items } = req.body;
                if (!pedidoInfo || !items || !Array.isArray(items)) {
                    return res.status(400).json({ error: 'Faltan datos de pedidoInfo o items' });
                }
                const result = yield this.mesasController.confirmarDomicilio(pedidoInfo, items);
                res.status(200).json(result);
            }
            catch (error) {
                console.error('Error al confirmar domicilio:', error);
                res.status(500).json({ error: 'Error al confirmar domicilio e imprimir ticket' });
            }
        }));
        // POST /api/v1/mesas/abrir-caja
        this.router.post('/abrir-caja', (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield this.mesasController.abrirCaja();
                res.status(200).json(result);
            }
            catch (error) {
                console.error('Error al abrir caja:', error);
                res.status(500).json({ error: 'Error al abrir caja' });
            }
        }));
    }
    getRouter() {
        return this.router;
    }
}
exports.MesasRoutes = MesasRoutes;
