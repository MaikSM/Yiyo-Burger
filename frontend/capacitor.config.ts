import type { CapacitorConfig } from '@capacitor/cli';

/**
 * APK de tablet (mesero) para Yiyo Burger POS.
 *
 * La app empaqueta SOLO una pantalla de conexión ligera (tablet-launcher/) que:
 *  1. Busca / recuerda la IP del PC de caja en la red Wi-Fi local.
 *  2. Abre el sistema servido por el PC (http://IP:4003), así la tablet siempre usa
 *     la misma versión del sistema que tiene la caja (no hay que recompilar el APK al actualizar).
 */
const config: CapacitorConfig = {
  appId: 'com.restausync.app',
  appName: 'Yiyo Burger POS',
  webDir: 'tablet-launcher',
  server: {
    androidScheme: 'http',
    cleartext: true,
    // Permitir que la app navegue al servidor del PC dentro de la red local (cualquier IP privada)
    allowNavigation: [
      '192.168.*.*',
      '10.*.*.*',
      '172.*.*.*',
      'localhost',
    ],
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
