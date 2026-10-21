// Importa tipos de Express para manejar peticiones (Request), respuestas (Response) y funciones de middleware (NextFunction).
import { NextFunction, Request, Response } from 'express';

// Importa la utilidad JwtUtil para verificar la validez de los tokens JWT.
import { JwtUtil } from '../../utils/jwt.util';

// Define la clase IsAdminMiddleware que contendrá el middleware para verificar si el usuario es administrador.
export class IsAdminMiddleware {
  // Método estático que actúa como middleware para comprobar si el usuario tiene el rol de administrador.
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
    } catch (error) {
      // Si ocurre un error durante el proceso, lo pasa al siguiente middleware de manejo de errores.
      next(error);
    }
  }
}
