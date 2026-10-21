// Importa tipos de Express para manejar peticiones (Request), respuestas (Response) y funciones de middleware (NextFunction).
import { NextFunction, Request, Response } from 'express';

// Importa la utilidad JwtUtil para verificar la validez de los tokens JWT.
import { JwtUtil } from '../../utils/jwt.util';

// Define la clase IsWaiterOrAdminMiddleware que contendrá el middleware para verificar si el usuario tiene el rol de mesero o administrador.
export class IsWaiterOrAdminMiddleware {
  // Método estático que actúa como middleware para comprobar si el usuario tiene el rol de mesero o administrador.
  public static async check(
    req: Request, // Objeto de la solicitud HTTP entrante.
    res: Response, // Objeto de la respuesta HTTP para enviar respuestas al cliente.
    next: NextFunction, // Función que llama al siguiente middleware en la pila.
  ): Promise<Response | void> {
    try {
      // Obtiene el token JWT del encabezado Authorization de la solicitud.
      // El formato esperado es "Bearer <token>", por lo que se divide por el espacio y se toma la segunda parte.
      const token: string = req?.headers?.authorization?.split(
        ' ',
      )[1] as string;

      // Verifica la validez del token utilizando la utilidad JwtUtil.
      const decoded = await JwtUtil.verifyToken(token);

      if (!decoded || !decoded?.data?.user_id) return res.status(401).json({ message: 'Unauthorized' });

      const userId = Number(decoded.data.user_id);
      const { DatabaseConnection } = await import('../database/DatabaseConnection');
      const { UserEntity } = await import('../../modules/user/entities/user.entity');
      const userRepo = DatabaseConnection.appDataSource.getRepository(UserEntity);
      const user = await userRepo.findOne({ where: { id: userId }, relations: ['role'] });

      if (!user || !user.is_active || !user.role) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const roleName = (user.role.name || '').toLowerCase();
      const isAllowed =
        decoded.data.role_id === 1 ||
        decoded.data.role_id === 2 ||
        decoded.data.role_id === 3 ||
        decoded.data.role_id === 4 ||
        roleName.includes('admin') ||
        roleName.includes('mesero') ||
        roleName.includes('camarero') ||
        roleName.includes('cajero') ||
        roleName === 'user';
                         
      if (!isAllowed) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      next();
    } catch (error) {
      // Si ocurre un error durante el proceso, lo pasa al siguiente middleware de manejo de errores.
      next(error);
    }
  }
}