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
exports.MesaRepository = void 0;
class MesaRepository {
    constructor(repository) {
        this.repository = repository;
    }
    findAll() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.repository.find({
                order: { numero: 'ASC' },
            });
        });
    }
    findById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.repository.findOne({ where: { mesa_id: id } });
        });
    }
    findByNumero(numero) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.repository.findOne({ where: { numero } });
        });
    }
    findByEstado(estado) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.repository.find({
                where: { estado },
                order: { numero: 'ASC' },
            });
        });
    }
    create(mesa) {
        return __awaiter(this, void 0, void 0, function* () {
            const newMesa = this.repository.create(mesa);
            return yield this.repository.save(newMesa);
        });
    }
    update(id, mesa) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.repository.update(id, mesa);
            const updatedMesa = yield this.findById(id);
            if (!updatedMesa) {
                throw new Error('Mesa no encontrada después de actualizar');
            }
            return updatedMesa;
        });
    }
    delete(id) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.repository.delete({ mesa_id: id });
        });
    }
    cambiarEstado(id, estado) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.repository.update({ mesa_id: id }, { estado });
            const updatedMesa = yield this.findById(id);
            if (!updatedMesa) {
                throw new Error('Mesa no encontrada después de cambiar estado');
            }
            return updatedMesa;
        });
    }
    countByEstado(estado) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.repository.count({ where: { estado } });
        });
    }
    hasActiveReservations(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const count = yield this.repository.manager.query(`SELECT COUNT(*) as cnt FROM reservas WHERE mesa_id = ? AND (estado = 'pendiente' OR estado = 'confirmado') AND deleted_at IS NULL`, [id]);
                return count && count[0] && Number(count[0].cnt || count[0]['COUNT(*)']) > 0;
            }
            catch (error) {
                return false;
            }
        });
    }
}
exports.MesaRepository = MesaRepository;
