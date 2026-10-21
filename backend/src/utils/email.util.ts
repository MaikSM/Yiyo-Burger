import nodemailer from 'nodemailer';

// Configuración del transportador de correo
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true para 465, false para otros puertos
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASSWORD || '',
    },
  });
};

// Interfaz para las opciones del correo
interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Clase para manejar el envío de correos electrónicos
export class EmailUtil {
  private static transporter = createTransporter();

  /**
   * Envía un correo electrónico
   * @param options Opciones del correo (destinatario, asunto, contenido)
   * @returns Promise<boolean> true si se envió correctamente, false en caso contrario
   */
  public static async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // Verificar si hay configuración SMTP
      if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
        console.log('📧 Email no configurado. Simulando envío de correo:');
        console.log(`   Para: ${options.to}`);
        console.log(`   Asunto: ${options.subject}`);
        console.log(`   Contenido: ${options.text || 'HTML content'}`);
        return true; // Simular éxito en desarrollo
      }

      const mailOptions = {
        from: `"${process.env.SMTP_FROM_NAME || 'Yiyo Burger'}" <${process.env.SMTP_USER}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || '',
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('📧 Correo enviado:', info.messageId);
      return true;
    } catch (error) {
      console.error('❌ Error al enviar correo:', error);
      return false;
    }
  }

  /**
   * Envía un correo de recuperación de contraseña
   * @param email Correo del destinatario
   * @param token Token de recuperación
   * @param resetUrl URL para restablecer la contraseña
   */
  public static async sendPasswordRecoveryEmail(
    email: string,
    token: string,
    resetUrl: string,
  ): Promise<boolean> {
    const subject = 'Recuperación de Contraseña - Yiyo Burger';
    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recuperación de Contraseña</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #f9f9f9;
            border-radius: 10px;
            padding: 30px;
            border: 1px solid #e0e0e0;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .header h1 {
            color: #f97316;
            margin: 0;
          }
          .content {
            background-color: #fff;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          .button {
            display: inline-block;
            background-color: #f97316;
            color: #fff;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin: 20px 0;
          }
          .button:hover {
            background-color: #ea580c;
          }
          .footer {
            text-align: center;
            font-size: 12px;
            color: #666;
            margin-top: 20px;
          }
          .warning {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 10px 15px;
            margin: 20px 0;
            border-radius: 0 5px 5px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🍔 Yiyo Burger</h1>
          </div>
          <div class="content">
            <h2>Recuperación de Contraseña</h2>
            <p>Hola,</p>
            <p>Hemos recibido una solicitud para restablecer tu contraseña. Haz clic en el siguiente botón para crear una nueva contraseña:</p>
            <p style="text-align: center;">
              <a href="${resetUrl}?token=${token}" class="button">Restablecer Contraseña</a>
            </p>
            <p>Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:</p>
            <p style="word-break: break-all; background-color: #f3f4f6; padding: 10px; border-radius: 5px; font-size: 12px;">
              ${resetUrl}?token=${token}
            </p>
            <div class="warning">
              <strong>⚠️ Importante:</strong>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Este enlace expirará en <strong>15 minutos</strong>.</li>
                <li>Si no solicitaste este cambio, puedes ignorar este correo.</li>
              </ul>
            </div>
          </div>
          <div class="footer">
            <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
            <p>© ${new Date().getFullYear()} Yiyo Burger. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Recuperación de Contraseña - Yiyo Burger
      
      Hola,
      
      Hemos recibido una solicitud para restablecer tu contraseña.
      
      Visita el siguiente enlace para crear una nueva contraseña:
      ${resetUrl}?token=${token}
      
      Este enlace expirará en 15 minutos.
      
      Si no solicitaste este cambio, puedes ignorar este correo.
      
      © ${new Date().getFullYear()} Yiyo Burger. Todos los derechos reservados.
    `;

    return await this.sendEmail({ to: email, subject, html, text });
  }
}
