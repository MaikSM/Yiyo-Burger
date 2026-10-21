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
exports.TokenExistsMiddleware = void 0;
const jwt_util_1 = require("../../utils/jwt.util");
class TokenExistsMiddleware {
    static check(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                console.log('🔐 TokenExistsMiddleware: Checking token...');
                console.log('🔐 Authorization header:', req.headers.authorization);
                if (!((_a = req === null || req === void 0 ? void 0 : req.headers) === null || _a === void 0 ? void 0 : _a.authorization)) {
                    console.log('❌ No authorization header');
                    return res.status(401).json({ message: 'Unauthorized' });
                }
                const token = (_c = (_b = req === null || req === void 0 ? void 0 : req.headers) === null || _b === void 0 ? void 0 : _b.authorization) === null || _c === void 0 ? void 0 : _c.split(' ')[1];
                console.log('🔐 Token extracted:', token ? `${token.substring(0, 20)}...` : 'null');
                if (!token || token === 'null' || token === 'undefined') {
                    console.log('❌ Token is invalid');
                    return res.status(401).json({
                        message: 'Unauthorized',
                        data: null,
                    });
                }
                // Verificar el token y decodificar el payload
                console.log('🔐 Verifying token...');
                const decoded = yield jwt_util_1.JwtUtil.verifyToken(token);
                console.log('🔐 Token verified successfully:', decoded);
                // Adjuntar la información del usuario a la solicitud
                req.user = decoded.data;
                console.log('🔐 User attached to request:', decoded.data);
                next();
            }
            catch (error) {
                console.error('❌ Token verification error:', error.message);
                return res.status(401).json({
                    message: 'Invalid or expired token',
                    data: null
                });
            }
        });
    }
}
exports.TokenExistsMiddleware = TokenExistsMiddleware;
