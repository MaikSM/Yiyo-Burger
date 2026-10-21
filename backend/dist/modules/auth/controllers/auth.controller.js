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
exports.AuthController = void 0;
// Importa funciones de "class-transformer" para transformar datos planos a instancias de clases.
const class_transformer_1 = require("class-transformer");
// Importa las funciones de "class-validator" para realizar validaciones de datos.
const class_validator_1 = require("class-validator");
// Importa el servicio de autenticación para manejar la lógica de negocio.
const auth_service_1 = require("../services/auth.service");
// Importar los DTOs para la validación de datos de entrada.
const login_user_dto_1 = require("../dtos/login-user.dto");
const register_user_dto_1 = require("../dtos/register-user.dto");
// Importa utilidades para manejar el hashing de contraseñas y la generación de tokens JWT.
const bcrypt_util_1 = require("../../../utils/bcrypt.util");
const jwt_util_1 = require("../../../utils/jwt.util");
// Importa la entidad de usuario para interactuar con la base de datos.
const user_entity_1 = require("../../user/entities/user.entity");
const update_user_dto_1 = require("../dtos/update-user.dto");
const system_security_service_1 = require("../../config/services/system-security.service");
// Define la clase AuthController para manejar la autenticación de usuarios.
class AuthController {
    constructor() {
        // Inicializa el servicio de autenticación.
        this.service = new auth_service_1.AuthService();
        this.systemSecurityService = new system_security_service_1.SystemSecurityService();
    }
    // Método para manejar el inicio de sesión de usuarios.
    login(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                console.log('🔐 Login attempt - Email received:', req.body.email);
                // Verificar si el sistema está bloqueado por seguridad mensual
                const securityStatus = yield this.systemSecurityService.getStatus();
                if (securityStatus.isLocked) {
                    console.log('🔒 Login rejected - System is locked for monthly security');
                    return res.status(423).json({
                        message: securityStatus.message,
                        isSystemLocked: true,
                    });
                }
                // Convierte el cuerpo de la solicitud (req.body) a una instancia del DTO de inicio de sesión.
                const dto = (0, class_transformer_1.plainToInstance)(login_user_dto_1.LoginUserDto, req.body);
                // Valida los datos del DTO.
                const errors = yield (0, class_validator_1.validate)(dto);
                // Si hay errores de validación, devuelve una respuesta con el mensaje de error.
                if (errors.length > 0) {
                    console.log('❌ Validation errors:', errors);
                    return res.status(400).json({
                        message: 'Validation Error | UserController CreateNew',
                        errors: errors.map((err) => ({
                            property: err.property,
                            constraints: err.constraints,
                        })),
                    });
                }
                // Obtiene el usuario por su correo electrónico.
                let data = yield this.service.getByEmail(dto.email);
                // Si el usuario no existe, devuelve un mensaje de error.
                if (!data) {
                    console.log('❌ User not found with email:', dto.email);
                    return res.status(401).json('Invalid Credentials');
                }
                console.log('✅ User found:', data.email, '| Role:', (_a = data.role) === null || _a === void 0 ? void 0 : _a.name);
                // Si el usuario está desactivado, devuelve un mensaje de error.
                if (!data.is_active) {
                    console.log('❌ Account deactivated:', dto.email);
                    return res.status(403).json('Account deactivated');
                }
                // Comprueba si la contraseña ingresada coincide con la almacenada (hasheada).
                const isMatch = yield bcrypt_util_1.BcryptUtil.comparePassword(dto.password, data.password);
                console.log('🔑 Password match result:', isMatch);
                // Si las contraseñas no coinciden, devuelve un mensaje de error.
                if (!isMatch)
                    return res.status(401).json('Invalid Credentials');
                // Genera un token JWT para el usuario autenticado.
                const token = yield this.service.login(data.role.id, data.id);
                // Devuelve una respuesta exitosa con la información del usuario y el token.
                return res.status(200).json({
                    id: data.id,
                    name: data.name,
                    surname: data.surname,
                    email: data.email,
                    photo: data.photo,
                    role: {
                        id: data.role.id,
                        name: data.role.name,
                    },
                    created_at: data.created_at,
                    token,
                });
            }
            catch (error) {
                // Maneja cualquier error inesperado y devuelve un mensaje de error genérico.
                return res.status(401).json({
                    message: 'Unauthorized',
                    data: error,
                });
            }
        });
    }
    // Método para obtener el perfil del usuario autenticado.
    profile(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                // Obtiene el token de autorización de los encabezados de la solicitud.
                const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
                // Verifica la validez del token.
                const decoded = yield jwt_util_1.JwtUtil.verifyToken(token);
                // Extrae el ID del usuario del token decodificado.
                const id = Number((_b = decoded === null || decoded === void 0 ? void 0 : decoded.data) === null || _b === void 0 ? void 0 : _b.user_id);
                // Si no se obtiene un ID válido, devuelve un error de autorización.
                if (!id)
                    return res.status(401).json('Unauthorized');
                // Obtiene los datos del usuario por su ID.
                let data = yield this.service.getById(id);
                // Si el usuario no existe o está desactivado, devuelve un error de autorización.
                if (!data || !data.is_active)
                    return res.status(401).json('Unauthorized');
                const resData = Object.assign(Object.assign({}, data), { token: token, role: data.role, photo: data.photo });
                // Devuelve la información del perfil del usuario.
                return res.status(200).json(resData);
            }
            catch (error) {
                // Maneja cualquier error inesperado y devuelve un mensaje de error genérico.
                return res.status(500).json({
                    message: 'Unauthorized',
                    data: error,
                });
            }
        });
    }
    // Método para registrar un nuevo usuario.
    register(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Convierte el cuerpo de la solicitud (req.body) a una instancia del DTO de registro de usuario.
                const dto = (0, class_transformer_1.plainToInstance)(register_user_dto_1.RegisterUserDto, req.body);
                // Valida los datos del DTO.
                const errors = yield (0, class_validator_1.validate)(dto);
                // Si hay errores de validación, devuelve una respuesta con el mensaje de error.
                if (errors.length > 0) {
                    return res.status(400).json({
                        message: 'Validation Error | AuthController Register',
                        errors: errors.map((err) => ({
                            property: err.property,
                            constraints: err.constraints,
                        })),
                    });
                }
                // Verifica si el usuario ya existe en la base de datos por su correo electrónico.
                const exists = yield this.service.getByEmail(dto.email);
                // Si el usuario ya existe, devuelve un mensaje de error.
                if (exists) {
                    return res.status(400).json(`User Already Exists: ${exists.name}`);
                }
                // Si no se proporciona role_id, asignar el rol de 'user' por defecto
                if (!dto.role_id) {
                    const { DatabaseConnection } = yield Promise.resolve().then(() => __importStar(require('../../../core/database/DatabaseConnection')));
                    const { RoleEntity } = yield Promise.resolve().then(() => __importStar(require('../../role/entities/role.entity')));
                    const roleRepository = DatabaseConnection.appDataSource.getRepository(RoleEntity);
                    const userRole = yield roleRepository.findOne({ where: { name: 'user' } });
                    if (userRole) {
                        dto.role_id = userRole.id;
                    }
                    else {
                        return res.status(500).json('Default user role not found. Please run seeders first.');
                    }
                }
                // Hashea la contraseña antes de guardarla en la base de datos.
                dto.password = yield bcrypt_util_1.BcryptUtil.hashPassword(dto.password);
                // Crea el nuevo usuario usando el servicio y el DTO.
                let data = yield this.service.register((0, class_transformer_1.plainToInstance)(user_entity_1.UserEntity, dto));
                // Si hubo un error al crear el usuario, devuelve un mensaje de error.
                if (!data)
                    return res.status(500).json('Error Registering User');
                data = yield this.service.getByEmail(data.email);
                const token = yield this.service.login(data === null || data === void 0 ? void 0 : data.role.id, data === null || data === void 0 ? void 0 : data.id);
                // Si el usuario fue creado correctamente, devuelve los datos del usuario registrado.
                return res.status(201).json({
                    id: data === null || data === void 0 ? void 0 : data.id,
                    name: data === null || data === void 0 ? void 0 : data.name,
                    surname: data === null || data === void 0 ? void 0 : data.surname,
                    email: data === null || data === void 0 ? void 0 : data.email,
                    photo: data === null || data === void 0 ? void 0 : data.photo,
                    role: {
                        id: data === null || data === void 0 ? void 0 : data.role.id,
                        name: data === null || data === void 0 ? void 0 : data.role.name,
                    },
                    created_at: data === null || data === void 0 ? void 0 : data.created_at,
                    token,
                });
            }
            catch (error) {
                console.log(error);
                // Maneja cualquier error inesperado y devuelve un mensaje de error genérico.
                return res.status(401).json({
                    message: 'Error Registering User',
                    data: error,
                });
            }
        });
    }
    checkToken(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                // Obtiene el token de autorización de los encabezados de la solicitud.
                const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
                // Verifica la validez del token.
                const decoded = yield jwt_util_1.JwtUtil.verifyToken(token);
                // Extrae el ID del usuario del token decodificado.
                const id = Number((_b = decoded === null || decoded === void 0 ? void 0 : decoded.data) === null || _b === void 0 ? void 0 : _b.user_id);
                // Si no se obtiene un ID válido, devuelve un error de autorización.
                if (!id)
                    return res.status(401).json('Unauthorized');
                // Obtiene los datos del usuario por su ID.
                const data = yield this.service.getById(id);
                // Si el usuario no existe o está desactivado, devuelve un error de autorización.
                if (!data || !data.is_active)
                    return res.status(401).json('Unauthorized');
                const resData = Object.assign(Object.assign({}, data), { token: token, role: data.role, photo: data.photo });
                // Devuelve la información del perfil del usuario.
                return res.status(200).json(resData);
            }
            catch (error) {
                // Maneja cualquier error inesperado y devuelve un mensaje de error genérico.
                return res.status(401).json({
                    message: 'Unauthorized',
                    data: error,
                });
            }
        });
    }
    updateById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                let token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
                const decoded = yield jwt_util_1.JwtUtil.verifyToken(token);
                const id = Number((_b = decoded === null || decoded === void 0 ? void 0 : decoded.data) === null || _b === void 0 ? void 0 : _b.user_id);
                if (!id)
                    return res.status(401).json('Unauthorized');
                let data = yield this.service.getById(id);
                if (!data)
                    return res.status(401).json('Unauthorized');
                const dto = (0, class_transformer_1.plainToInstance)(update_user_dto_1.UpdateUserDto, req.body);
                const errors = yield (0, class_validator_1.validate)(dto);
                // Si hay errores de validación, devuelve una respuesta con el mensaje de error.
                if (errors.length > 0) {
                    return res.status(400).json({
                        message: 'Validation Error | AuthController Update',
                        errors: errors.map((err) => ({
                            property: err.property,
                            constraints: err.constraints,
                        })),
                    });
                }
                // Verifica si el usuario ya existe en la base de datos por su correo electrónico.
                const exists = yield this.service.getByEmail(dto.email);
                // Si el usuario ya existe con ese correo y no es el usuario actual, devuelve un mensaje de error.
                if (exists && exists.id !== id) {
                    return res.status(400).json(`User Already Exists: ${exists.name}`);
                }
                if (dto.password)
                    dto.password = yield bcrypt_util_1.BcryptUtil.hashPassword(dto.password);
                const updatedData = yield this.service.updateById(id, (0, class_transformer_1.plainToInstance)(user_entity_1.UserEntity, dto));
                // Si hubo un error al actualizar, devuelve un mensaje de error.
                if (!updatedData)
                    return res.status(500).json('Error Updating User');
                // Llama al servicio para obtener el usuario actualizado por su ID.
                data = yield this.service.getById(id);
                if (!data)
                    return res.status(401).json('Unauthorized');
                token = yield this.service.login(data === null || data === void 0 ? void 0 : data.role.id, data === null || data === void 0 ? void 0 : data.id);
                // Si la actualización fue exitosa, devuelve el usuario actualizado con un mensaje de éxito.
                return res.status(201).json({
                    id: data === null || data === void 0 ? void 0 : data.id,
                    name: data === null || data === void 0 ? void 0 : data.name,
                    surname: data === null || data === void 0 ? void 0 : data.surname,
                    email: data === null || data === void 0 ? void 0 : data.email,
                    photo: data === null || data === void 0 ? void 0 : data.photo,
                    role: {
                        id: data === null || data === void 0 ? void 0 : data.role.id,
                        name: data === null || data === void 0 ? void 0 : data.role.name,
                    },
                    created_at: data === null || data === void 0 ? void 0 : data.created_at,
                    token,
                });
            }
            catch (error) {
                return res.status(500).json({
                    message: 'Unauthorized',
                    data: error,
                });
            }
        });
    }
    // Método para solicitar recuperación de contraseña
    requestPasswordRecovery(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Convierte el cuerpo de la solicitud a una instancia del DTO
                const dto = (0, class_transformer_1.plainToInstance)(login_user_dto_1.PasswordRecoveryDto, req.body);
                // Valida los datos del DTO
                const errors = yield (0, class_validator_1.validate)(dto);
                if (errors.length > 0) {
                    return res.status(400).json({
                        message: 'Validation Error',
                        errors: errors.map((err) => ({
                            property: err.property,
                            constraints: err.constraints,
                        })),
                    });
                }
                // Busca el usuario por su correo electrónico
                const user = yield this.service.getByEmail(dto.email);
                // Por seguridad, siempre devolvemos el mismo mensaje aunque el usuario no exista
                if (!user) {
                    console.log(`📧 Intento de recuperación para email no registrado: ${dto.email}`);
                    return res.status(200).json({
                        message: 'Si el correo está registrado, recibirás un email con las instrucciones para restablecer tu contraseña.',
                    });
                }
                // Genera un token de recuperación
                const token = yield this.service.generatePasswordRecoveryToken(user.id);
                // URL para restablecer la contraseña (frontend)
                const resetUrl = process.env.FRONTEND_URL
                    ? `${process.env.FRONTEND_URL}/auth/restablecer-contrasena`
                    : 'http://localhost:4200/auth/restablecer-contrasena';
                // Importa y envía el correo electrónico
                const { EmailUtil } = yield Promise.resolve().then(() => __importStar(require('../../../utils/email.util')));
                const emailSent = yield EmailUtil.sendPasswordRecoveryEmail(user.email, token, resetUrl);
                if (!emailSent) {
                    console.error('❌ Error al enviar el correo de recuperación');
                }
                console.log(`📧 Correo de recuperación enviado a: ${user.email}`);
                return res.status(200).json({
                    message: 'Si el correo está registrado, recibirás un email con las instrucciones para restablecer tu contraseña.',
                });
            }
            catch (error) {
                console.error('❌ Error en requestPasswordRecovery:', error);
                return res.status(500).json({
                    message: 'Error al procesar la solicitud',
                    data: error,
                });
            }
        });
    }
    // Método para restablecer la contraseña
    resetPassword(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Convierte el cuerpo de la solicitud a una instancia del DTO
                const dto = (0, class_transformer_1.plainToInstance)(login_user_dto_1.PasswordResetDto, req.body);
                // Valida los datos del DTO
                const errors = yield (0, class_validator_1.validate)(dto);
                if (errors.length > 0) {
                    return res.status(400).json({
                        message: 'Validation Error',
                        errors: errors.map((err) => ({
                            property: err.property,
                            constraints: err.constraints,
                        })),
                    });
                }
                // Verifica el token de recuperación
                const userId = yield this.service.verifyPasswordRecoveryToken(dto.token);
                if (!userId) {
                    return res.status(400).json({
                        message: 'Token inválido o expirado. Por favor, solicita un nuevo enlace de recuperación.',
                    });
                }
                // Busca el usuario
                const user = yield this.service.getById(userId);
                if (!user) {
                    return res.status(400).json({
                        message: 'Usuario no encontrado.',
                    });
                }
                // Hashea la nueva contraseña
                const hashedPassword = yield bcrypt_util_1.BcryptUtil.hashPassword(dto.password);
                // Actualiza la contraseña
                yield this.service.updatePassword(userId, hashedPassword);
                console.log(`✅ Contraseña actualizada para usuario: ${user.email}`);
                return res.status(200).json({
                    message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión con tu nueva contraseña.',
                });
            }
            catch (error) {
                console.error('❌ Error en resetPassword:', error);
                return res.status(500).json({
                    message: 'Error al restablecer la contraseña',
                    data: error,
                });
            }
        });
    }
}
exports.AuthController = AuthController;
