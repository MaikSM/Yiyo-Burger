"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.IsAdminMiddleware = void 0;
// Importa la utilidad JwtUtil para verificar la validez de los tokens JWT.
const jwt_util_1 = require("../../utils/jwt.util");
// Define la clase IsAdminMiddleware que contendrá el middleware para verificar si el usuario es administrador.
class IsAdminMiddleware {
    // Método estático que actúa como middleware para comprobar si el usuario tiene el rol de administrador.
    static check(req, // Objeto de la solicitud HTTP entrante.
    res, // Objeto de la respuesta HTTP para enviar respuestas al cliente.
    next) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                // Obtiene el token JWT del encabezado Authorization de la solicitud.
                // El formato esperado es "Bearer <token>", por lo que se divide por el espacio y se toma la segunda parte.
                const token = (_b = (_a = req === null || req === void 0 ? void 0 : req.headers) === null || _a === void 0 ? void 0 : _a.authorization) === null || _b === void 0 ? void 0 : _b.split(' ')[1];
                // Verifica la validez del token utilizando la utilidad JwtUtil.
                const decoded = yield jwt_util_1.JwtUtil.verifyToken(token);
                if (!decoded || !((_c = decoded === null || decoded === void 0 ? void 0 : decoded.data) === null || _c === void 0 ? void 0 : _c.user_id))
                    return res.status(401).json({ message: 'Unauthorized' });
                const userId = Number(decoded.data.user_id);
                const { DatabaseConnection } = yield Promise.resolve().then(() => __importStar(require('../database/DatabaseConnection')));
                const { UserEntity } = yield Promise.resolve().then(() => __importStar(require('../../modules/user/entities/user.entity')));
                const userRepo = DatabaseConnection.appDataSource.getRepository(UserEntity);
                const user = yield userRepo.findOne({ where: { id: userId }, relations: ['role'] });
                if (!user || !user.is_active || !user.role) {
                    return res.status(401).json({ message: 'Unauthorized' });
                }
                const roleName = (user.role.name || '').toLowerCase();
                if (decoded.data.role_id !== 1 && roleName !== 'admin') {
                    return res.status(401).json({ message: 'Unauthorized' });
                }
                next();
                /*
                      Código comentado que parece ser una versión anterior del middleware:
                      
                      - Comprueba si existe el encabezado de autorización.
                      if (!req?.headers?.authorization)
                          return res
                              .status(401)
                              .json({ message: "Unauthorized" });
          
                      - Obtiene el token de autorización de la cabecera.
                      const token: string =
                          req?.headers?.authorization?.split(" ")[1];
          
                      - Verifica si el token es inválido o está vacío.
                      if (!token || token === "null" || token === "undefined")
                          return res.status(401).json({
                              message: "Unauthorized",
                              data: null,
                          });
          
                      - Llama a next() para continuar si el token es válido.
                      next();
                      */
            }
            catch (error) {
                // Si ocurre un error durante el proceso, lo pasa al siguiente middleware de manejo de errores.
                next(error);
            }
        });
    }
}
exports.IsAdminMiddleware = IsAdminMiddleware;
