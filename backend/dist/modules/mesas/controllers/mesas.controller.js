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
exports.MesasController = void 0;
const impresion_service_1 = require("../../impresion/services/impresion.service");
const sequence_service_1 = require("../../impresion/services/sequence.service");
class MesasController {
    constructor(mesasService) {
        this.mesasService = mesasService;
        this.impresionService = new impresion_service_1.ImpresionService();
        this.sequenceService = sequence_service_1.SequenceService.getInstance();
    }
    findAll() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.mesasService.findAll();
        });
    }
    findById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.mesasService.findById(id);
        });
    }
    create(createMesaDto) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.mesasService.create(createMesaDto);
        });
    }
    update(id, updateMesaDto) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.mesasService.update(id, updateMesaDto);
        });
    }
    delete(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.mesasService.delete(id);
        });
    }
    cambiarEstado(id, estado) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.mesasService.cambiarEstado(id, estado);
        });
    }
    findByEstado(estado) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.mesasService.findByEstado(estado);
        });
    }
    confirmarPedido(pedidoInfo, items) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!pedidoInfo.orderNumber) {
                const seq = this.sequenceService.getOrderSequence(pedidoInfo.id, false);
                pedidoInfo.orderNumber = seq.orderNumber;
            }
            const result = yield this.impresionService.encolarComandaCocina(pedidoInfo, items, Boolean(pedidoInfo.esAdicion));
            return Object.assign({ success: true, message: 'Pedido confirmado y encolado a impresoras', orderNumber: pedidoInfo.orderNumber }, result);
        });
    }
    confirmarDomicilio(pedidoInfo, items) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!pedidoInfo.orderNumber) {
                const seq = this.sequenceService.getOrderSequence(pedidoInfo.id, true);
                pedidoInfo.orderNumber = seq.orderNumber;
                pedidoInfo.domicilioNumber = seq.domicilioNumber;
            }
            const result = yield this.impresionService.encolarComandaDomicilio(pedidoInfo, items, Boolean(pedidoInfo.esAdicion));
            return Object.assign({ success: true, message: 'Domicilio confirmado y encolado a impresión', orderNumber: pedidoInfo.orderNumber }, result);
        });
    }
    abrirCaja() {
        return __awaiter(this, void 0, void 0, function* () {
            const success = yield this.impresionService.abrirCaja();
            return { success };
        });
    }
    imprimirFactura(pedidoInfo, targetTipo) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!pedidoInfo.orderNumber) {
                const seq = this.sequenceService.getOrderSequence(pedidoInfo.id, pedidoInfo.tipo === 'Domicilio', false);
                if (seq.orderNumber)
                    pedidoInfo.orderNumber = seq.orderNumber;
                if (seq.domicilioNumber)
                    pedidoInfo.domicilioNumber = seq.domicilioNumber;
            }
            const success = yield this.impresionService.imprimirFacturaCliente(pedidoInfo, targetTipo);
            return {
                success,
                message: 'Factura en cola de impresión',
            };
        });
    }
    imprimirPrecuenta(pedidoInfo, targetTipo) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!pedidoInfo.orderNumber) {
                const seq = this.sequenceService.getOrderSequence(pedidoInfo.id, pedidoInfo.tipo === 'Domicilio', false);
                if (seq.orderNumber)
                    pedidoInfo.orderNumber = seq.orderNumber;
            }
            const success = yield this.impresionService.encolarPrecuenta(pedidoInfo, targetTipo);
            return {
                success,
                message: 'Pre-cuenta de mesa encolada exitosamente',
            };
        });
    }
}
exports.MesasController = MesasController;
