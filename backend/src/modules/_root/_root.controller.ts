import { Request, Response } from 'express';

export class RootController {
  // Variable para almacenar el prefijo de la API
  private readonly apiPrefix: string;

  // Constructor que inicializa el prefijo de la API
  constructor() {
    this.apiPrefix = process.env.API_PREFIX || '/api/v2';
  }

  // Método para manejar la solicitud a la ruta raíz
  static async root(_req: Request, res: Response): Promise<void> {
    try {
      // Enviar respuesta exitosa al cliente

      res.status(200).json({
        version: '1.0.0',
        author: 'MaikSM',
        description: 'Yiyo Burger POS API RESTful with TypeScript, Node.js, Express',
        contact: 'salamancamai12@gmail.com',
      });
    } catch (error) {
      console.error('RootController root method error:', error);

      // Enviar respuesta de error al cliente
      res.status(500).json({
        message: 'Internal Server Error',
        data: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
