import { NextFunction, Request, Response } from 'express';
import { JwtUtil } from '../../utils/jwt.util';

export class TokenExistsMiddleware {
  public static async check(req: Request, res: Response, next: NextFunction) {
    try {
      console.log('🔐 TokenExistsMiddleware: Checking token...');
      console.log('🔐 Authorization header:', req.headers.authorization);
      
      if (!req?.headers?.authorization) {
        console.log('❌ No authorization header');
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const token: string = req?.headers?.authorization?.split(' ')[1];
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
      const decoded = await JwtUtil.verifyToken(token);
      console.log('🔐 Token verified successfully:', decoded);
      
      // Adjuntar la información del usuario a la solicitud
      (req as any).user = decoded.data;
      console.log('🔐 User attached to request:', decoded.data);
      
      next();
    } catch (error: any) {
      console.error('❌ Token verification error:', error.message);
      return res.status(401).json({ 
        message: 'Invalid or expired token',
        data: null 
      });
    }
  }
}
