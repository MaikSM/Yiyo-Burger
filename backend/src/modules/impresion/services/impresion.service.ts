const escpos = require('escpos');
escpos.Network = require('escpos-network');

export interface ImpresionItem {
  id?: string;
  nombre: string;
  precio?: number;
  qty: number;
  seccion?: string;
  categoria?: string;
  tipoEntrega?: 'mesa' | 'llevar';
  notas?: string;
}

import { DatabaseConnection } from '../../../core/database/DatabaseConnection';
import { ConfigService, PosConfig } from '../../config/services/config.service';
import { PrintQueueService } from './print-queue.service';

export class ImpresionService {
  private configService: ConfigService;
  private printerCache: { list: string[]; timestamp: number } | null = null;

  constructor() {
    this.configService = new ConfigService();
  }

  private async getWindowsPrinters(): Promise<string[]> {
    const NOW = Date.now();
    if (this.printerCache && NOW - this.printerCache.timestamp < 30000) {
      return this.printerCache.list;
    }
    const printers = await this.getSystemPrinters();
    if (printers.length > 0) {
      this.printerCache = { list: printers, timestamp: NOW };
    }
    return printers;
  }

  public getIpForTipo(tipo: 'Pizzas' | 'Parrilla' | 'Caja'): string {
    const config = this.configService.getConfig();
    if (tipo === 'Pizzas') return config.printer_pizzas_ip;
    if (tipo === 'Parrilla') return config.printer_parrilla_ip;
    return config.printer_caja_ip;
  }

  /**
   * Helper function to wrap text by words.
   * Prints the text to the printer instance, respecting the max columns.
   */
  private printWrappedText(printer: any, text: string, maxCols: number): void {
    const words = text.split(' ');
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + word).length > maxCols) {
        if (currentLine.length > 0) {
          printer.text(currentLine.trimEnd());
          currentLine = '';
        }
        if (word.length > maxCols) {
          printer.text(word.substring(0, maxCols));
          currentLine = word.substring(maxCols) + ' ';
        } else {
          currentLine = word + ' ';
        }
      } else {
        currentLine += word + ' ';
      }
    }

    if (currentLine.trim().length > 0) {
      printer.text(currentLine.trimEnd());
    }
  }

  private formatDate(dateInput?: Date | string | number): string {
    const date = dateInput ? new Date(dateInput) : new Date();
    if (isNaN(date.getTime())) {
      return this.formatDate(new Date());
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = String(hours).padStart(2, '0');
    return `${day}/${month}/${year} ${hoursStr}:${minutes} ${ampm}`;
  }

  /**
   * Helper para emitir un número específico de pitidos (buzzer hardware) en la impresora térmica ESC/POS.
   */
  private triggerBuzzer(printer: any, count: 1 | 2): void {
    try {
      if (typeof printer.beep === 'function') {
        printer.beep(count, 5);
      } else if (typeof printer.raw === 'function') {
        printer.raw(Buffer.from([0x1b, 0x42, count, 0x05]));
      } else if (typeof printer.hardware === 'function') {
        printer.hardware('BEEP');
      }
    } catch (err) {
      console.warn('[Impresion] Advertencia al disparar buzzer hardware:', err);
    }
  }

  public formatKitchenTicketText(pedido: any, items: ImpresionItem[], tipo: 'Pizzas' | 'Parrilla'): string {
    const numMesa = String(pedido.mesa || '').replace(/barra\s*/i, '').trim();
    const esDomicilio = pedido.tipo === 'Domicilio';
    const esLlevar = pedido.tipo === 'Llevar' || items.some((i) => i.tipoEntrega === 'llevar');
    const esBarra =
      pedido.ubicacion === 'Barra' ||
      String(pedido.mesa || '').toLowerCase().includes('barra') ||
      String(pedido.tipo || '').toLowerCase().includes('barra');

    const header = pedido.esAdicion
      ? '*** ADICION ***'
      : esDomicilio
      ? '*** DOMICILIO ***'
      : esLlevar || esBarra
      ? '*** PARA LLEVAR ***'
      : `*** MESA ${numMesa} ***`;
    const shortId = String(pedido.id || '').length > 8 ? String(pedido.id).slice(0, 8) : pedido.id || '';
    const mesaDisplay = esDomicilio ? 'DOMICILIO' : esLlevar || esBarra ? 'PARA LLEVAR' : `Mesa ${pedido.mesa || ''}`;

    let text = `================================\n        ${header}\n--------------------------------\n`;
    if (pedido.esAdicion) text += `   *** PRODUCTOS ADICIONALES ***\n--------------------------------\n`;
    if (pedido.orderNumber) text += `          PEDIDO #${pedido.orderNumber}\n--------------------------------\n`;
    const fechaPedido = pedido?.fecha || pedido?.created_at || pedido?.createdAt || pedido?.fecha_creacion;
    text += `Servicio: ${mesaDisplay}\nID: ${shortId}\nFecha: ${this.formatDate(fechaPedido)}\n`;
    if (pedido.mesero) text += `Atendido por: ${pedido.mesero}\n`;
    text += `--------------------------------\n`;

    for (const item of items) {
      text += `${item.qty}x ${item.nombre}\n`;
      if (item.tipoEntrega === 'llevar') text += `   *** PARA LLEVAR ***\n`;
      if (item.notas) text += `   * NOTA: ${String(item.notas).toUpperCase()}\n`;
    }

    text += `--------------------------------\n          Yiyo Burguer\n================================\n\n\n\n\n`;
    return text;
  }

  public formatFacturaText(pedido: any): string {
    const esDomicilio = pedido.tipo === 'Domicilio';
    const esBarra =
      pedido.ubicacion === 'Barra' ||
      String(pedido.mesa || '').toLowerCase().includes('barra') ||
      String(pedido.tipo || '').toLowerCase().includes('barra');
    const headerText = esDomicilio ? 'DOMICILIO' : esBarra ? 'RECIBO PARA LLEVAR' : 'Comprobante de Venta';
    const shortId = String(pedido.id || '').length > 8 ? String(pedido.id).slice(0, 8) : pedido.id || '';
    const mesaDisplay =
      esBarra || String(pedido.tipo || '').toLowerCase().includes('llevar') ? 'PARA LLEVAR' : `Mesa ${pedido.mesa || ''}`;

    let text = `================================\n          Yiyo Burguer\n       ${headerText}\n--------------------------------\n`;

    if (esDomicilio && (pedido.domicilioNumber || pedido.orderNumber)) {
      text += `       DOMICILIO #${pedido.domicilioNumber || pedido.orderNumber}`;
      if (pedido.orderNumber && pedido.domicilioNumber) text += ` (Orden #${pedido.orderNumber})`;
      text += `\n--------------------------------\n`;
    } else if (pedido.orderNumber) {
      text += `          PEDIDO #${pedido.orderNumber}\n--------------------------------\n`;
    }

    const fechaPedido = pedido?.fecha || pedido?.created_at || pedido?.createdAt || pedido?.fecha_creacion;
    text += `Pedido ID: ${shortId}\nServicio: ${esDomicilio ? 'Domicilio' : mesaDisplay}\nFecha: ${this.formatDate(fechaPedido)}\n`;
    if (pedido.mesero) text += `Atendido por: ${pedido.mesero}\n`;
    text += `--------------------------------\n`;

    const clienteNombre =
      pedido.cliente_nombre ||
      (typeof pedido.cliente === 'string' ? pedido.cliente : pedido.cliente?.nombre || '');
    if (esDomicilio || clienteNombre || pedido.cliente_direccion || pedido.cliente_barrio || pedido.cliente_telefono) {
      text += `*** DATOS DE ENTREGA ***\n`;
      if (clienteNombre) text += `Cliente: ${clienteNombre}\n`;
      if (pedido.cliente_telefono) text += `Telefono: ${pedido.cliente_telefono}\n`;
      if (pedido.cliente_direccion) text += `DIRECCION: ${String(pedido.cliente_direccion).toUpperCase()}\n`;
      if (pedido.cliente_barrio) text += `BARRIO: ${String(pedido.cliente_barrio).toUpperCase()}\n`;
      if (pedido.domiciliario) text += `Repartidor: ${pedido.domiciliario}\n`;
      text += `--------------------------------\n`;
    }

    let itemsList: any[] = [];
    if (Array.isArray(pedido.items)) {
      itemsList = pedido.items;
    } else if (typeof pedido.items === 'string') {
      try {
        const parsed = JSON.parse(pedido.items);
        if (Array.isArray(parsed)) itemsList = parsed;
      } catch (e) {}
    }

    if (itemsList.length > 0) {
      text += `PRODUCTOS:\n`;
      for (const item of itemsList) {
        const sub = (Number(item.precio) || 0) * (Number(item.qty) || 1);
        text += `${item.qty || 1}x ${item.nombre || ''} - $${sub.toLocaleString('es-CO')}\n`;
        if (item.notas) text += `   * NOTA: ${String(item.notas).toUpperCase()}\n`;
      }
    }

    const explicitCosto =
      Number(pedido.costo_domicilio || pedido.tarifa_domicilio || pedido.costo_envio || pedido.domicilio_valor) || 0;
    const computedCosto =
      esDomicilio && Number(pedido.total || 0) > Number(pedido.subtotal || 0)
        ? Number(pedido.total) -
          Number(pedido.subtotal || 0) -
          Number(pedido.impuesto_valor || 0) -
          Number(pedido.propina_valor || 0)
        : 0;
    const costoDomi = explicitCosto > 0 ? explicitCosto : Math.max(0, computedCosto);

    text += `--------------------------------\n`;
    if (pedido.subtotal) text += `Subtotal: $${Number(pedido.subtotal).toLocaleString('es-CO')}\n`;
    if (costoDomi > 0)
      text += `Domicilio (${pedido.cliente_barrio || 'Barrio'}): $${Number(costoDomi).toLocaleString('es-CO')}\n`;
    if (pedido.impuesto_valor > 0) text += `Impuesto: $${Number(pedido.impuesto_valor).toLocaleString('es-CO')}\n`;
    if (pedido.propina_valor > 0) text += `Propina: $${Number(pedido.propina_valor).toLocaleString('es-CO')}\n`;
    if (pedido.total) text += `TOTAL: $${Number(pedido.total).toLocaleString('es-CO')}\n`;
    text += `--------------------------------\n`;

    let pagosMixtosList: { metodo: string; monto: number }[] = [];
    if (Array.isArray(pedido.pagos_mixtos)) {
      pagosMixtosList = pedido.pagos_mixtos;
    } else if (typeof pedido.pagos_mixtos === 'string') {
      try {
        const parsed = JSON.parse(pedido.pagos_mixtos);
        if (Array.isArray(parsed)) pagosMixtosList = parsed;
      } catch (e) {}
    }

    if (pagosMixtosList.length > 0) {
      text += `Metodo de pago: PAGO MIXTO\n`;
      for (const sub of pagosMixtosList) {
        text += ` - ${sub.metodo}: $${Number(sub.monto).toLocaleString('es-CO')}\n`;
      }
      if (pedido.monto_entregado > 0)
        text += `Paga en efectivo con: $${Number(pedido.monto_entregado).toLocaleString('es-CO')}\n`;
      if (pedido.vuelto > 0) text += `Vuelto / Cambio: $${Number(pedido.vuelto).toLocaleString('es-CO')}\n`;
    } else {
      text += `Metodo de pago: ${pedido.metodo_pago || 'Efectivo'}\n`;
      if (pedido.metodo_pago === 'Efectivo' && (pedido.monto_entregado > 0 || pedido.vuelto > 0)) {
        if (pedido.monto_entregado > 0)
          text += `Paga con: $${Number(pedido.monto_entregado).toLocaleString('es-CO')}\n`;
        if (pedido.vuelto > 0) text += `Vuelto / Cambio: $${Number(pedido.vuelto).toLocaleString('es-CO')}\n`;
      }
    }
    text += `--------------------------------\n   ¡Gracias por su compra!\n================================\n\n\n\n\n`;

    const tieneEfectivo =
      pedido.metodo_pago === 'Efectivo' ||
      pagosMixtosList.some((p) => String(p.metodo).toLowerCase().includes('efectivo'));
    if (tieneEfectivo) {
      text += '\x1b\x70\x00\x19\xfa\x1b\x70\x01\x19\xfa';
    }
    return text;
  }

  public formatPrecuentaText(pedido: any): string {
    const esBarra =
      pedido.ubicacion === 'Barra' ||
      String(pedido.mesa || '').toLowerCase().includes('barra') ||
      String(pedido.tipo || '').toLowerCase().includes('barra');
    const mesaDisplay = esBarra ? 'BARRA' : `Mesa ${pedido.mesa || ''}`;
    const shortId = String(pedido.id || '').length > 8 ? String(pedido.id).slice(0, 8) : pedido.id || '';
    const fechaPedido = pedido?.fecha || pedido?.created_at || pedido?.createdAt || pedido?.fecha_creacion;

    let text = `================================\n          Yiyo Burguer\n       *** PRE-CUENTA ***\n   CUENTA DE MESA - INFORMATIVO\n     (NO VALIDO COMO FACTURA)\n--------------------------------\n`;

    if (pedido.orderNumber) {
      text += `          PEDIDO #${pedido.orderNumber}\n--------------------------------\n`;
    }

    text += `Servicio: ${mesaDisplay}\nID: ${shortId}\nFecha: ${this.formatDate(fechaPedido)}\n`;
    if (pedido.mesero) text += `Atendido por: ${pedido.mesero}\n`;
    if (pedido.cliente_nombre && pedido.cliente_nombre !== 'Cliente Mesa') {
      text += `Cliente: ${pedido.cliente_nombre}\n`;
    }
    text += `--------------------------------\n`;

    let itemsList: any[] = [];
    if (Array.isArray(pedido.items)) {
      itemsList = pedido.items;
    } else if (typeof pedido.items === 'string') {
      try {
        const parsed = JSON.parse(pedido.items);
        if (Array.isArray(parsed)) itemsList = parsed;
      } catch (e) {}
    }

    if (itemsList.length > 0) {
      text += `PRODUCTOS CONSUMIDOS:\n`;
      for (const item of itemsList) {
        const sub = (Number(item.precio) || 0) * (Number(item.qty) || 1);
        text += `${item.qty || 1}x ${item.nombre || ''} - $${sub.toLocaleString('es-CO')}\n`;
        if (item.notas) text += `   * NOTA: ${String(item.notas).toUpperCase()}\n`;
      }
    }

    const subtotal = Number(pedido.subtotal || pedido.total || 0);
    const propina10 = Math.round(subtotal * 0.1);
    const totalConPropina = subtotal + propina10;

    text += `--------------------------------\n`;
    text += `Subtotal consumo: $${subtotal.toLocaleString('es-CO')}\n`;
    text += `Propina sugerida (10%): $${propina10.toLocaleString('es-CO')}\n`;
    text += `--------------------------------\n`;
    text += `TOTAL NETO (sin propina):   $${subtotal.toLocaleString('es-CO')}\n`;
    text += `TOTAL SUGERIDO (+propina):  $${totalConPropina.toLocaleString('es-CO')}\n`;
    text += `--------------------------------\n`;
    text += `    ¡Gracias por su visita!\nSolicite su factura electronica o\ncomprobante oficial al pagar en caja\n================================\n\n\n\n\n`;

    return text;
  }

  /**
   * Clasifica los productos del pedido para determinar a qué impresora de cocina deben enviarse.
   * Regla de negocio:
   * - Pizzas: Siempre van a la impresora de Pizzas.
   * - Si son SOLO Pizzas (sin bebidas y sin parrilla), NO van a Parrilla.
   * - Parrilla / Bebidas / Mixtos van a la impresora de Parrilla.
   */
  public classifyItemsForPrinters(items: any[]): {
    shouldPrintPizza: boolean;
    shouldPrintParrilla: boolean;
    allItems: ImpresionItem[];
  } {
    const formattedItems: ImpresionItem[] = items.map((item) => ({
      id: item.id,
      nombre: item.nombre,
      precio: Number(item.precio) || 0,
      qty: Number(item.qty) || 1,
      seccion: item.seccion || item.categoria || '',
      categoria: item.categoria || item.seccion || '',
      tipoEntrega: item.tipoEntrega,
      notas: item.notas,
    }));

    const isPizza = (item: any) => {
      const categoryText = `${item.seccion || ''} ${item.categoria || ''}`.toLowerCase();
      const nameText = `${item.nombre || ''}`.toLowerCase();
      const idStr = String(item.id || '').toLowerCase();

      const isExplicitParrilla =
        /parrilla|carne|carnes|pollo|pollos|arepa|arepas|hamburguesa|burger|perro|patacon|patacón|empana|salchipapa|desgranado|mazorca|chuzo|alita|costilla/i.test(
          `${categoryText} ${nameText}`
        );
      if (isExplicitParrilla && !categoryText.includes('pizza') && !nameText.includes('pizza')) {
        return false;
      }

      if (categoryText.includes('pizza') || nameText.includes('pizza')) return true;
      if (
        idStr.startsWith('half-') ||
        idStr.includes('-personal') ||
        idStr.includes('-mediana') ||
        idStr.includes('-familiar') ||
        idStr.includes('-gigante')
      )
        return true;

      return false;
    };

    const isBebida = (item: any) => {
      const text = `${item.seccion || ''} ${item.categoria || ''} ${item.nombre || ''}`.toLowerCase();
      return /bebida|gaseosa|jugo|cerveza|agua|refresco|soda|jugos|licor|té|te|boba/i.test(text);
    };

    const isParrilla = (item: any) => !isPizza(item) && !isBebida(item);

    const hasPizza = formattedItems.some((item) => isPizza(item));
    const hasBebida = formattedItems.some((item) => isBebida(item));
    const hasParrilla = formattedItems.some((item) => isParrilla(item));

    const shouldPrintPizza = hasPizza;
    const isSoloPizza = hasPizza && !hasBebida && !hasParrilla;
    const shouldPrintParrilla = !isSoloPizza && (hasParrilla || hasBebida || hasPizza);

    return {
      shouldPrintPizza,
      shouldPrintParrilla,
      allItems: formattedItems,
    };
  }

  // =========================================================================
  // ENCOLADO ATÓMICO (API PRINCIPAL)
  // =========================================================================

  /**
   * Encola una comanda de cocina para un pedido (Mesa, Barra o Llevar).
   * Clasifica los productos y los encola en sus respectivas impresoras.
   */
  public async encolarComandaCocina(
    pedido: any,
    items: any[],
    esAdicion: boolean = false
  ): Promise<{ shouldPrintPizza: boolean; shouldPrintParrilla: boolean }> {
    if (!items || items.length === 0) {
      return { shouldPrintPizza: false, shouldPrintParrilla: false };
    }

    const { shouldPrintPizza, shouldPrintParrilla, allItems } = this.classifyItemsForPrinters(items);
    const queue = PrintQueueService.getInstance();
    const pedidoConAdicion = { ...pedido, esAdicion };

    if (shouldPrintPizza) {
      const dest = this.getIpForTipo('Pizzas');
      await queue.enqueue({
        pedido_id: pedido.id ? String(pedido.id) : undefined,
        tipo_ticket: 'cocina_pizzas',
        destino: dest,
        payload: { pedido: pedidoConAdicion, items: allItems },
      });
    }

    if (shouldPrintParrilla) {
      const dest = this.getIpForTipo('Parrilla');
      await queue.enqueue({
        pedido_id: pedido.id ? String(pedido.id) : undefined,
        tipo_ticket: 'cocina_parrilla',
        destino: dest,
        payload: { pedido: pedidoConAdicion, items: allItems },
      });
    }

    return { shouldPrintPizza, shouldPrintParrilla };
  }

  /**
   * Encola una comanda de domicilio para cocina.
   */
  public async encolarComandaDomicilio(
    pedido: any,
    items: any[],
    esAdicion: boolean = false
  ): Promise<{ shouldPrintPizza: boolean; shouldPrintParrilla: boolean }> {
    if (!items || items.length === 0) {
      return { shouldPrintPizza: false, shouldPrintParrilla: false };
    }

    const { shouldPrintPizza, shouldPrintParrilla, allItems } = this.classifyItemsForPrinters(items);
    const queue = PrintQueueService.getInstance();
    const pedidoConAdicion = { ...pedido, esAdicion, tipo: 'Domicilio' };

    if (shouldPrintPizza) {
      const dest = this.getIpForTipo('Pizzas');
      await queue.enqueue({
        pedido_id: pedido.id ? String(pedido.id) : undefined,
        tipo_ticket: 'domicilio',
        destino: dest,
        payload: { pedido: pedidoConAdicion, items: allItems, tipo: 'Pizzas' },
      });
    }

    if (shouldPrintParrilla) {
      const dest = this.getIpForTipo('Parrilla');
      await queue.enqueue({
        pedido_id: pedido.id ? String(pedido.id) : undefined,
        tipo_ticket: 'domicilio',
        destino: dest,
        payload: { pedido: pedidoConAdicion, items: allItems, tipo: 'Parrilla' },
      });
    }

    return { shouldPrintPizza, shouldPrintParrilla };
  }

  /**
   * Encola un ticket/factura para el cliente en la impresora de Caja o Parrilla.
   */
  public async encolarFacturaCliente(pedido: any, targetTipo: 'Caja' | 'Parrilla' = 'Caja'): Promise<boolean> {
    const config = this.configService.getConfig();
    let dest = (targetTipo === 'Parrilla' ? config.printer_parrilla_ip : config.printer_caja_ip) || '';
    if (!dest || dest.trim() === '') {
      dest = config.printer_parrilla_ip || 'POS-80C';
    }

    const queue = PrintQueueService.getInstance();
    await queue.enqueue({
      pedido_id: pedido?.id ? String(pedido.id) : undefined,
      tipo_ticket: 'factura',
      destino: dest.trim(),
      payload: { pedido },
    });
    return true;
  }

  /**
   * Encola una pre-cuenta informativa para mesa en la impresora de Caja o principal.
   */
  public async encolarPrecuenta(pedido: any, targetTipo: 'Caja' | 'Parrilla' = 'Caja'): Promise<boolean> {
    const config = this.configService.getConfig();
    let dest = (targetTipo === 'Parrilla' ? config.printer_parrilla_ip : config.printer_caja_ip) || '';
    if (!dest || dest.trim() === '') {
      dest = config.printer_parrilla_ip || 'POS-80C';
    }

    const queue = PrintQueueService.getInstance();
    await queue.enqueue({
      pedido_id: pedido?.id ? String(pedido.id) : undefined,
      tipo_ticket: 'precuenta',
      destino: dest.trim(),
      payload: { pedido },
    });
    return true;
  }

  /**
   * Encola el pulso para abrir el cajón de dinero.
   */
  public async encolarAperturaCaja(targetTipo: 'Caja' | 'Parrilla' = 'Caja'): Promise<boolean> {
    const config = this.configService.getConfig();
    let dest = (config.printer_caja_ip || config.printer_parrilla_ip || 'POS-58').trim();
    const queue = PrintQueueService.getInstance();
    await queue.enqueue({
      tipo_ticket: 'cajon',
      destino: dest,
      payload: { targetTipo },
    });
    return true;
  }

  // =========================================================================
  // MÉTODOS DE COMPATIBILIDAD CON CÓDIGO EXISTENTE
  // =========================================================================

  public async imprimirTicketCocina(pedido: any, items: ImpresionItem[], tipo: 'Pizzas' | 'Parrilla'): Promise<boolean> {
    if (items.length === 0 || process.env.NODE_ENV === 'test') return true;
    const dest = this.getIpForTipo(tipo);
    const queue = PrintQueueService.getInstance();
    await queue.enqueue({
      pedido_id: pedido?.id ? String(pedido.id) : undefined,
      tipo_ticket: tipo === 'Pizzas' ? 'cocina_pizzas' : 'cocina_parrilla',
      destino: dest,
      payload: { pedido, items },
    });
    return true;
  }

  public async imprimirTicketDomicilio(pedido: any, items: ImpresionItem[], tipo: 'Pizzas' | 'Parrilla'): Promise<boolean> {
    if (items.length === 0 || process.env.NODE_ENV === 'test') return true;
    const dest = this.getIpForTipo(tipo);
    const queue = PrintQueueService.getInstance();
    await queue.enqueue({
      pedido_id: pedido?.id ? String(pedido.id) : undefined,
      tipo_ticket: 'domicilio',
      destino: dest,
      payload: { pedido, items, tipo },
    });
    return true;
  }

  public async imprimirFacturaCliente(pedido: any, targetTipo: 'Caja' | 'Parrilla' = 'Caja'): Promise<boolean> {
    return this.encolarFacturaCliente(pedido, targetTipo);
  }

  public async abrirCaja(): Promise<boolean> {
    return this.encolarAperturaCaja('Caja');
  }

  // =========================================================================
  // EJECUCIÓN FÍSICA DIRECTA (INVOCADA EXCLUSIVAMENTE POR EL WORKER DE LA COLA)
  // =========================================================================

  public async imprimirTicketCocinaDirecto(
    pedido: any,
    items: ImpresionItem[],
    tipo: 'Pizzas' | 'Parrilla',
    customIp?: string
  ): Promise<boolean> {
    if (items.length === 0 || process.env.NODE_ENV === 'test') return true;

    const ip = (customIp || this.getIpForTipo(tipo) || '').trim();
    const port = 9100;
    const isIpAddress = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip);

    if (!isIpAddress && ip && ip.toLowerCase() !== '127.0.0.1' && ip.toLowerCase() !== 'localhost') {
      const text = this.formatKitchenTicketText(pedido, items, tipo);
      const res = await this.printWindowsSpooler(text, ip);
      return res.success;
    }

    return new Promise((resolve) => {
      try {
        console.log(`[ImpresionDirecta] Conectando a impresora de ${tipo} en ${ip}:${port}...`);
        // Timeout balanceado a 5000ms para impresoras térmicas de red
        const device = new escpos.Network(ip, port, { timeout: 5000 });
        const printer = new escpos.Printer(device);

        device.open(async (error: any) => {
          if (error) {
            console.error(`[ImpresionDirecta] Error abriendo impresora ${tipo} en ${ip}:`, error.message);
            return resolve(false);
          }

          try {
            const esDomicilio = pedido.tipo === 'Domicilio';
            const esLlevar = pedido.tipo === 'Llevar' || items.some((i) => i.tipoEntrega === 'llevar');
            const esBarra =
              pedido.ubicacion === 'Barra' ||
              String(pedido.mesa || '').toLowerCase().includes('barra') ||
              String(pedido.tipo || '').toLowerCase().includes('barra');
            const beepCount: 1 | 2 = esDomicilio || esLlevar ? 2 : 1;

            this.triggerBuzzer(printer, beepCount);

            const numMesa = String(pedido.mesa || '').replace(/barra\s*/i, '').trim();
            const tituloTipoHeader = pedido.esAdicion
              ? '*** ADICIÓN ***'
              : esDomicilio
              ? '*** DOMICILIO ***'
              : esLlevar || esBarra
              ? '*** PARA LLEVAR ***'
              : `*** MESA ${numMesa} ***`;

            printer
              .font('a')
              .align('ct')
              .style('b')
              .size(1, 1)
              .text(tituloTipoHeader)
              .size(0, 0)
              .text('--------------------------------');

            if (pedido.esAdicion) {
              printer.style('b').align('ct').text('*** PRODUCTOS ADICIONALES ***').style('normal').align('lt');
            }

            if (pedido.orderNumber) {
              printer
                .size(1, 1)
                .style('b')
                .align('ct')
                .text(`PEDIDO #${pedido.orderNumber}`)
                .size(0, 0)
                .style('normal')
                .align('lt');
            }

            const shortId = String(pedido.id || '').length > 8 ? String(pedido.id).slice(0, 8) : pedido.id || '';
            const mesaDisplay = esDomicilio ? 'DOMICILIO' : esLlevar || esBarra ? 'PARA LLEVAR' : `Mesa ${pedido.mesa || ''}`;
            const fechaPedido = pedido?.fecha || pedido?.created_at || pedido?.createdAt || pedido?.fecha_creacion;

            printer
              .align('lt')
              .style(esBarra ? 'b' : 'normal')
              .text(`Servicio: ${mesaDisplay}`)
              .style('normal')
              .text(`Pedido ID: ${shortId}`)
              .text(`Fecha: ${this.formatDate(fechaPedido)}`);

            printer.text('--------------------------------');

            items.forEach((item) => {
              printer.style('b').size(1, 1);
              const lineText = `${item.qty}x ${item.nombre}`;
              this.printWrappedText(printer, lineText, 16);

              printer.style('normal').size(0, 0);
              if (item.tipoEntrega === 'llevar') {
                printer.text('   *** PARA LLEVAR ***');
              }
              if (item.notas) {
                printer.style('b').size(1, 1);
                this.printWrappedText(printer, `* NOTA: ${String(item.notas).toUpperCase()}`, 16);
                printer.style('normal').size(0, 0);
              }
            });

            printer
              .text('--------------------------------')
              .align('ct')
              .text('Yiyo Burguer')
              .feed(1)
              .cut()
              .close();

            console.log(`[ImpresionDirecta] Ticket enviado a cocina de ${tipo} exitosamente.`);
            resolve(true);
          } catch (ticketErr: any) {
            console.error(`[ImpresionDirecta] Error formateando ticket de ${tipo}:`, ticketErr.message);
            resolve(false);
          }
        });
      } catch (err: any) {
        console.error(`[ImpresionDirecta] Excepción al imprimir en ${tipo}:`, err.message);
        resolve(false);
      }
    });
  }

  public async imprimirTicketDomicilioDirecto(
    pedido: any,
    items: ImpresionItem[],
    tipo: 'Pizzas' | 'Parrilla',
    customIp?: string
  ): Promise<boolean> {
    if (items.length === 0) return true;

    const ip = (customIp || this.getIpForTipo(tipo) || '').trim();
    const port = 9100;
    const isIpAddress = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip);

    if (!isIpAddress && ip && ip.toLowerCase() !== '127.0.0.1' && ip.toLowerCase() !== 'localhost') {
      const text = this.formatKitchenTicketText(pedido, items, tipo);
      const res = await this.printWindowsSpooler(text, ip);
      return res.success;
    }

    return new Promise((resolve) => {
      try {
        console.log(`[ImpresionDirecta] Conectando a impresora de ${tipo} en ${ip}:${port}...`);
        const device = new escpos.Network(ip, port, { timeout: 5000 });
        const printer = new escpos.Printer(device);

        device.open(async (error: any) => {
          if (error) {
            console.error(`[ImpresionDirecta] Error abriendo impresora de ${tipo} en ${ip}:`, error.message);
            return resolve(false);
          }

          try {
            this.triggerBuzzer(printer, 2);

            printer
              .font('a')
              .align('ct')
              .style('b')
              .size(1, 1)
              .text(pedido.esAdicion ? '*** ADICIÓN DOMICILIO ***' : 'DOMICILIO')
              .size(0, 0)
              .text(`COCINA - ${tipo.toUpperCase()}`)
              .text('--------------------------------');

            if (pedido.orderNumber) {
              printer.size(1, 1).text(`ORDEN #${pedido.orderNumber}`).size(0, 0);
            }
            if (pedido.domicilioNumber) {
              printer.style('b').text(`(Domicilio #${pedido.domicilioNumber} del dia)`).style('normal');
            }

            const fechaPedido = pedido?.fecha || pedido?.created_at || pedido?.createdAt || pedido?.fecha_creacion;
            printer
              .align('lt')
              .text(`Tel: ${pedido.cliente_telefono || ''}`)
              .text(`Nombre: ${pedido.cliente_nombre || ''}`)
              .text(`Dir: ${pedido.cliente_direccion || ''}`)
              .text(`Barrio: ${pedido.cliente_barrio || ''}`)
              .text(`Domiciliario: ${pedido.domiciliario || ''}`)
              .text(`Fecha: ${this.formatDate(fechaPedido)}`)
              .text('--------------------------------');

            items.forEach((item) => {
              printer.style('b').size(1, 1);
              const lineText = `${item.qty}x ${item.nombre}`;
              this.printWrappedText(printer, lineText, 16);

              printer.style('normal').size(0, 0);
              if (item.notas) {
                printer.style('b').size(1, 1);
                this.printWrappedText(printer, `* NOTA: ${item.notas.toUpperCase()}`, 16);
                printer.style('normal').size(0, 0);
              }
            });

            printer
              .text('--------------------------------')
              .align('ct')
              .text('Yiyo Burguer')
              .feed(1)
              .cut()
              .close();

            console.log(`[ImpresionDirecta] Ticket de domicilio enviado a ${tipo} exitosamente.`);
            resolve(true);
          } catch (ticketErr: any) {
            console.error(`[ImpresionDirecta] Error formateando ticket domicilio ${tipo}:`, ticketErr.message);
            resolve(false);
          }
        });
      } catch (err: any) {
        console.error(`[ImpresionDirecta] Excepción al imprimir domicilio en ${tipo}:`, err.message);
        resolve(false);
      }
    });
  }

  public async abrirCajaDirecto(customPrinterTarget?: string): Promise<boolean> {
    if (process.env.NODE_ENV === 'test') return true;

    const config = this.configService.getConfig();
    let printerTarget = (customPrinterTarget || config.printer_caja_ip || config.printer_parrilla_ip || 'POS-58').trim();
    const isIpAddress = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(printerTarget);

    const pulseBuffer = Buffer.from([
      0x1b, 0x70, 0x00, 0x19, 0xfa,
      0x1b, 0x70, 0x01, 0x19, 0xfa,
      0x1b, 0x70, 0x30, 0x19, 0xfa,
      0x10, 0x14, 0x01, 0x01, 0x01,
    ]);

    if (!isIpAddress && printerTarget.toLowerCase() !== '127.0.0.1' && printerTarget.toLowerCase() !== 'localhost') {
      const res = await this.printWindowsSpooler(pulseBuffer, printerTarget);
      return res.success;
    }

    const targetIp = printerTarget || '127.0.0.1';
    const port = 9100;

    return new Promise((resolve) => {
      try {
        const device = new escpos.Network(targetIp, port, { timeout: 3000 });
        const printer = new escpos.Printer(device);

        device.open((error: any) => {
          if (error) {
            console.error(`[ImpresionDirecta] Error abriendo impresora de Caja para cajón:`, error.message);
            return resolve(false);
          }
          printer.cashdraw(2).cashdraw(5).close();
          console.log(`[ImpresionDirecta] Pulso de cajón enviado exitosamente.`);
          resolve(true);
        });
      } catch (err: any) {
        console.error(`[ImpresionDirecta] Excepción al abrir cajón:`, err.message);
        resolve(false);
      }
    });
  }

  public async imprimirFacturaClienteDirecto(pedido: any, targetIpOrName: string): Promise<boolean> {
    const isIpAddress = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(targetIpOrName);

    if (!isIpAddress && targetIpOrName && targetIpOrName.toLowerCase() !== '127.0.0.1' && targetIpOrName.toLowerCase() !== 'localhost') {
      const text = this.formatFacturaText(pedido);
      const res = await this.printWindowsSpooler(text, targetIpOrName);
      return res.success;
    }

    const port = 9100;
    return new Promise((resolve) => {
      try {
        console.log(`[ImpresionDirecta] Imprimiendo recibo cliente en ${targetIpOrName}:${port}...`);
        const device = new escpos.Network(targetIpOrName, port, { timeout: 5000 });
        const printer = new escpos.Printer(device);

        device.open(async (error: any) => {
          try {
            if (error) {
              console.error(`[ImpresionDirecta] Error abriendo impresora factura (${targetIpOrName}):`, error.message);
              return resolve(false);
            }

            const esDomicilio = pedido.tipo === 'Domicilio';
            const esBarra =
              pedido.ubicacion === 'Barra' ||
              String(pedido.mesa || '').toLowerCase().includes('barra') ||
              String(pedido.tipo || '').toLowerCase().includes('barra');

            printer.font('a').align('ct').style('b').size(0, 0).text('Yiyo Burguer');

            if (esDomicilio) {
              printer.size(1, 1).style('b').align('ct').text('DOMICILIO').size(0, 0).style('normal');
            } else {
              const headerText = esBarra ? 'RECIBO PARA LLEVAR' : 'Comprobante de Venta';
              printer.style('normal').text(headerText);
            }

            printer.text('--------------------------------').align('lt');

            if (pedido.orderNumber) {
              printer
                .size(1, 1)
                .style('b')
                .align('ct')
                .text(`PEDIDO #${pedido.orderNumber}`)
                .size(0, 0)
                .style('normal')
                .align('lt');
            }

            const shortId = String(pedido.id || '').length > 8 ? String(pedido.id).slice(0, 8) : pedido.id || '';
            const mesaDisplay = esBarra || String(pedido.tipo || '').toLowerCase().includes('llevar') ? 'PARA LLEVAR' : `Mesa ${pedido.mesa || ''}`;
            const fechaPedido = pedido?.fecha || pedido?.created_at || pedido?.createdAt || pedido?.fecha_creacion;

            printer
              .text(`Pedido ID: ${shortId}`)
              .style(esBarra ? 'b' : 'normal')
              .text(`Servicio: ${pedido.tipo === 'Domicilio' ? 'Domicilio' : mesaDisplay}`)
              .style('normal')
              .text(`Fecha: ${this.formatDate(fechaPedido)}`);

            const clienteNombreEsc =
              pedido.cliente_nombre || (typeof pedido.cliente === 'string' ? pedido.cliente : pedido.cliente?.nombre || '');
            if (pedido.tipo === 'Domicilio' || clienteNombreEsc || pedido.cliente_barrio) {
              if (clienteNombreEsc) printer.text(`Cliente: ${clienteNombreEsc}`);
              if (pedido.cliente_telefono) printer.text(`Tel: ${pedido.cliente_telefono}`);
              if (pedido.cliente_direccion) printer.text(`Dir: ${pedido.cliente_direccion}`);
              if (pedido.cliente_barrio) printer.style('b').text(`Barrio: ${pedido.cliente_barrio}`).style('normal');
              if (pedido.domiciliario) printer.text(`Repartidor: ${pedido.domiciliario}`);
            }

            printer.text('--------------------------------');

            let itemsListEsc: any[] = [];
            if (Array.isArray(pedido.items)) {
              itemsListEsc = pedido.items;
            } else if (typeof pedido.items === 'string') {
              try {
                const parsed = JSON.parse(pedido.items);
                if (Array.isArray(parsed)) itemsListEsc = parsed;
              } catch (e) {}
            }

            if (itemsListEsc.length > 0) {
              itemsListEsc.forEach((item: any) => {
                const sub = (Number(item.precio) || 0) * (Number(item.qty) || 1);
                printer.align('lt').text(`${item.qty || 1}x ${item.nombre || ''} - $${sub.toLocaleString('es-CO')}`);
                if (item.notas) {
                  printer.style('b').size(1, 1);
                  this.printWrappedText(printer, `* NOTA: ${item.notas.toUpperCase()}`, 16);
                  printer.style('normal').size(0, 0);
                }
              });
            }

            printer.align('lt').text('--------------------------------');

            const explicitCosto =
              Number(pedido.costo_domicilio || pedido.tarifa_domicilio || pedido.costo_envio || pedido.domicilio_valor) || 0;
            const computedCosto =
              esDomicilio && Number(pedido.total || 0) > Number(pedido.subtotal || 0)
                ? Number(pedido.total) -
                  Number(pedido.subtotal || 0) -
                  Number(pedido.impuesto_valor || 0) -
                  Number(pedido.propina_valor || 0)
                : 0;
            const costoDomi = explicitCosto > 0 ? explicitCosto : Math.max(0, computedCosto);

            printer.align('rt');
            printer.text(`Subtotal: $${(Number(pedido.subtotal) || 0).toLocaleString('es-CO')}`);
            if (costoDomi > 0) {
              printer.text(`Domicilio (${pedido.cliente_barrio || 'Barrio'}): $${Number(costoDomi).toLocaleString('es-CO')}`);
            }
            if (pedido.impuesto_valor > 0) {
              printer.text(`Impuesto (${pedido.impuesto_porcentaje || 0}%): $${Number(pedido.impuesto_valor).toLocaleString('es-CO')}`);
            }
            if (pedido.propina_valor > 0) {
              printer.text(`Propina: $${Number(pedido.propina_valor).toLocaleString('es-CO')}`);
            }
            printer.style('b').text(`TOTAL: $${(Number(pedido.total) || 0).toLocaleString('es-CO')}`).style('normal');
            printer.text('--------------------------------');

            printer.align('lt');
            let pagosMixtosEsc: { metodo: string; monto: number }[] = [];
            if (Array.isArray(pedido.pagos_mixtos)) {
              pagosMixtosEsc = pedido.pagos_mixtos;
            } else if (typeof pedido.pagos_mixtos === 'string') {
              try {
                const parsed = JSON.parse(pedido.pagos_mixtos);
                if (Array.isArray(parsed)) pagosMixtosEsc = parsed;
              } catch (e) {}
            }

            if (pagosMixtosEsc.length > 0) {
              printer.text(`Metodo de Pago: PAGO MIXTO`);
              pagosMixtosEsc.forEach((sub: any) => {
                printer.text(` - ${sub.metodo}: $${(Number(sub.monto) || 0).toLocaleString('es-CO')}`);
              });
              if (pedido.monto_entregado > 0) printer.text(`Paga en efectivo con: $${(pedido.monto_entregado || 0).toLocaleString('es-CO')}`);
              if (pedido.vuelto > 0) printer.text(`Cambio / Vuelto: $${(pedido.vuelto || 0).toLocaleString('es-CO')}`);
            } else {
              printer.text(`Metodo de Pago: ${pedido.metodo_pago || 'No especificado'}`);
              if (pedido.metodo_pago === 'Efectivo' && (pedido.monto_entregado > 0 || pedido.vuelto > 0)) {
                printer.text(`Entregado: $${(pedido.monto_entregado || 0).toLocaleString('es-CO')}`);
                printer.text(`Cambio / Vuelto: $${(pedido.vuelto || 0).toLocaleString('es-CO')}`);
              }
            }

            const tieneEfectivoEsc =
              pedido.metodo_pago === 'Efectivo' ||
              pagosMixtosEsc.some((p) => String(p.metodo).toLowerCase().includes('efectivo'));
            if (tieneEfectivoEsc) {
              printer.cashdraw(2);
            }

            printer.align('ct').feed(1).text('¡Gracias por su compra!').feed(1).cut().close();

            console.log(`[ImpresionDirecta] Recibo impreso exitosamente en ${targetIpOrName}.`);
            resolve(true);
          } catch (innerErr: any) {
            console.error(`[ImpresionDirecta] Excepción formateando factura:`, innerErr.message);
            resolve(false);
          }
        });
      } catch (err: any) {
        console.error(`[ImpresionDirecta] Excepción al conectar para recibo:`, err.message);
        resolve(false);
      }
    });
  }

  public async imprimirPrecuentaDirecto(pedido: any, targetIpOrName: string): Promise<boolean> {
    const isIpAddress = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(targetIpOrName);

    if (!isIpAddress && targetIpOrName && targetIpOrName.toLowerCase() !== '127.0.0.1' && targetIpOrName.toLowerCase() !== 'localhost') {
      const text = this.formatPrecuentaText(pedido);
      const res = await this.printWindowsSpooler(text, targetIpOrName);
      return res.success;
    }

    const port = 9100;
    return new Promise((resolve) => {
      try {
        console.log(`[ImpresionDirecta] Imprimiendo pre-cuenta en ${targetIpOrName}:${port}...`);
        const device = new escpos.Network(targetIpOrName, port, { timeout: 5000 });
        const printer = new escpos.Printer(device);

        device.open(async (error: any) => {
          try {
            if (error) {
              console.error(`[ImpresionDirecta] Error abriendo impresora para pre-cuenta (${targetIpOrName}):`, error.message);
              return resolve(false);
            }

            const esBarra =
              pedido.ubicacion === 'Barra' ||
              String(pedido.mesa || '').toLowerCase().includes('barra') ||
              String(pedido.tipo || '').toLowerCase().includes('barra');

            printer
              .font('a')
              .align('ct')
              .style('b')
              .size(0, 0)
              .text('Yiyo Burguer')
              .size(1, 1)
              .text('*** PRE-CUENTA ***')
              .size(0, 0)
              .text('CUENTA DE MESA (INFORMATIVO)')
              .text('(NO VALIDO COMO FACTURA)')
              .text('--------------------------------')
              .align('lt');

            if (pedido.orderNumber) {
              printer
                .size(1, 1)
                .style('b')
                .align('ct')
                .text(`PEDIDO #${pedido.orderNumber}`)
                .size(0, 0)
                .style('normal')
                .align('lt');
            }

            const shortId = String(pedido.id || '').length > 8 ? String(pedido.id).slice(0, 8) : pedido.id || '';
            const mesaDisplay = esBarra ? 'BARRA' : `Mesa ${pedido.mesa || ''}`;
            const fechaPedido = pedido?.fecha || pedido?.created_at || pedido?.createdAt || pedido?.fecha_creacion;

            printer
              .text(`Servicio: ${mesaDisplay}`)
              .text(`Pedido ID: ${shortId}`)
              .text(`Fecha: ${this.formatDate(fechaPedido)}`);

            if (pedido.mesero) printer.text(`Atendido por: ${pedido.mesero}`);
            if (pedido.cliente_nombre && pedido.cliente_nombre !== 'Cliente Mesa') {
              printer.text(`Cliente: ${pedido.cliente_nombre}`);
            }

            printer.text('--------------------------------');

            let itemsListEsc: any[] = [];
            if (Array.isArray(pedido.items)) {
              itemsListEsc = pedido.items;
            } else if (typeof pedido.items === 'string') {
              try {
                const parsed = JSON.parse(pedido.items);
                if (Array.isArray(parsed)) itemsListEsc = parsed;
              } catch (e) {}
            }

            if (itemsListEsc.length > 0) {
              itemsListEsc.forEach((item: any) => {
                const sub = (Number(item.precio) || 0) * (Number(item.qty) || 1);
                printer.align('lt').text(`${item.qty || 1}x ${item.nombre || ''} - $${sub.toLocaleString('es-CO')}`);
                if (item.notas) {
                  printer.style('b').size(1, 1);
                  this.printWrappedText(printer, `* NOTA: ${item.notas.toUpperCase()}`, 16);
                  printer.style('normal').size(0, 0);
                }
              });
            }

            printer.align('lt').text('--------------------------------');

            const subtotal = Number(pedido.subtotal || pedido.total || 0);
            const propina10 = Math.round(subtotal * 0.1);
            const totalConPropina = subtotal + propina10;

            printer.align('rt');
            printer.text(`Subtotal consumo: $${subtotal.toLocaleString('es-CO')}`);
            printer.text(`Propina sugerida (10%): $${propina10.toLocaleString('es-CO')}`);
            printer.text('--------------------------------');
            printer.text(`TOTAL NETO: $${subtotal.toLocaleString('es-CO')}`);
            printer.style('b').text(`TOTAL (+PROPINA): $${totalConPropina.toLocaleString('es-CO')}`).style('normal');
            printer.text('--------------------------------');

            printer
              .align('ct')
              .feed(1)
              .text('Solicite su factura electronica o')
              .text('comprobante oficial al pagar en caja.')
              .feed(1)
              .cut()
              .close();

            console.log(`[ImpresionDirecta] Pre-cuenta impresa exitosamente en ${targetIpOrName}.`);
            resolve(true);
          } catch (innerErr: any) {
            console.error(`[ImpresionDirecta] Excepción formateando pre-cuenta:`, innerErr.message);
            resolve(false);
          }
        });
      } catch (err: any) {
        console.error(`[ImpresionDirecta] Excepción al conectar para pre-cuenta:`, err.message);
        resolve(false);
      }
    });
  }

  public async probarImpresoraDirecto(
    tipo: 'Caja' | 'Parrilla' | 'Pizzas',
    customIp?: string
  ): Promise<{ success: boolean; message: string; ip: string }> {
    const ip = (customIp || this.getIpForTipo(tipo)).trim();
    const port = 9100;

    if (!ip) {
      return { success: false, message: 'Impresora o dirección IP no especificada.', ip: '' };
    }

    const sampleText = `=================================\n      PRUEBA DE IMPRESIÓN\n---------------------------------\nImpresora: ${tipo.toUpperCase()}\nDestino: ${ip}\nFecha: ${this.formatDate(new Date())}\n---------------------------------\nPrueba de Impresión Exitosa\nSistema Yiyo Burger POS OK\n=================================\n\n\n`;

    const isIpAddress = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip);
    if (!isIpAddress && ip.toLowerCase() !== '127.0.0.1' && ip.toLowerCase() !== 'localhost') {
      const spoolRes = await this.printWindowsSpooler(sampleText, ip);
      if (spoolRes.success) {
        return {
          success: true,
          message: `✅ Ticket de prueba enviado exitosamente a la impresora "${spoolRes.printerName}".`,
          ip,
        };
      } else {
        return {
          success: false,
          message: `❌ Error imprimiendo en "${ip}": ${spoolRes.message}`,
          ip,
        };
      }
    }

    return new Promise<{ success: boolean; message: string; ip: string }>((resolve) => {
      try {
        console.log(`[ImpresionDirecta] Probando conexión con impresora ${tipo} en ${ip}:${port}...`);
        const device = new escpos.Network(ip, port, { timeout: 5000 });
        const printer = new escpos.Printer(device);

        device.open(async (error: any) => {
          try {
            if (error) {
              console.error(`[ImpresionDirecta] Error abriendo impresora ${tipo} en ${ip}:`, error.message);
              const esLocalhost = ip.includes('127.0.0.1') || ip.includes('localhost');
              const msgUsb = esLocalhost
                ? `\n\n💡 No se detectó escucha en puerto 9100. Revisa que tu impresora esté encendida.`
                : ` Revisa que la impresora esté encendida y conectada a la misma red local (${ip}:9100).`;
              return resolve({
                success: false,
                message: `No se pudo conectar a la IP ${ip}:${port}. Error: ${error.message || 'Timeout'}.${msgUsb}`,
                ip,
              });
            }

            this.triggerBuzzer(printer, 1);

            printer
              .font('a')
              .align('ct')
              .style('b')
              .size(1, 1)
              .text('PRUEBA DE IMPRESIÓN')
              .size(0, 0)
              .text('--------------------------------')
              .text(`Impresora: ${tipo.toUpperCase()}`)
              .text(`IP: ${ip}:${port}`)
              .text(`Fecha: ${this.formatDate(new Date())}`)
              .text('--------------------------------')
              .text('Conexión TCP/IP exitosa')
              .text('Sistema Yiyo Burger POS OK')
              .feed(1)
              .cut()
              .close();

            console.log(`[ImpresionDirecta] Ticket de prueba enviado exitosamente a ${tipo} (${ip}).`);
            resolve({
              success: true,
              message: `✅ Conexión exitosa con la impresora de ${tipo} en ${ip}:${port}. Ticket de prueba impreso.`,
              ip,
            });
          } catch (innerErr: any) {
            console.error(`[ImpresionDirecta] Excepción durante prueba ${tipo}:`, innerErr.message);
            resolve({
              success: false,
              message: `Excepción durante impresión de prueba en ${ip}:${port}: ${innerErr.message}`,
              ip,
            });
          }
        });
      } catch (err: any) {
        console.error(`[ImpresionDirecta] Excepción al probar impresora ${tipo}:`, err.message);
        resolve({
          success: false,
          message: `Excepción al conectar con ${ip}:${port}: ${err.message}`,
          ip,
        });
      }
    });
  }

  public async probarImpresora(
    tipo: 'Caja' | 'Parrilla' | 'Pizzas',
    customIp?: string
  ): Promise<{ success: boolean; message: string; ip: string }> {
    return this.probarImpresoraDirecto(tipo, customIp);
  }

  public async getSystemPrinters(): Promise<string[]> {
    const { exec } = require('child_process');
    return new Promise((resolve) => {
      exec('powershell -Command "Get-Printer | Select-Object -ExpandProperty Name"', (err: any, stdout: string) => {
        if (err || !stdout) {
          console.error('[Impresion] Error listando impresoras de Windows:', err);
          return resolve([]);
        }
        let printerList = stdout.split('\r\n').map((p: string) => p.trim()).filter(Boolean);
        printerList = printerList.filter((p) => !/onenote|xps|fax|pdf/i.test(p));
        printerList.sort((a, b) => {
          const aCopy = a.includes('(copy');
          const bCopy = b.includes('(copy');
          if (!aCopy && bCopy) return -1;
          if (aCopy && !bCopy) return 1;
          return a.localeCompare(b);
        });
        resolve(printerList);
      });
    });
  }

  private async printWindowsSpooler(
    text: string | Buffer,
    preferredPrinterName?: string
  ): Promise<{ success: boolean; printerName?: string; message?: string }> {
    const { exec } = require('child_process');
    const fs = require('fs');
    const path = require('path');
    const os = require('os');

    const printerList = await this.getWindowsPrinters();
    if (!printerList || printerList.length === 0) {
      return { success: false, message: 'No se encontraron impresoras de Windows.' };
    }

    let targetPrinter = '';
    const isIp = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(preferredPrinterName?.trim() || '');
    const searchName = isIp ? '' : preferredPrinterName?.trim() || '';

    const exactMatch = searchName ? printerList.find((p) => p.trim().toLowerCase() === searchName.toLowerCase()) : null;

    if (exactMatch) {
      targetPrinter = exactMatch;
    } else if (searchName && searchName.toLowerCase().includes('pos-58')) {
      targetPrinter =
        printerList.find((p) => p.toLowerCase() === 'pos-58') ||
        printerList.find((p) => !p.includes('(copy') && p.toLowerCase().includes('pos-58')) ||
        printerList.find((p) => p.toLowerCase().includes('pos-58')) ||
        searchName;
    } else if (searchName && searchName.toLowerCase().includes('pos-80')) {
      targetPrinter =
        printerList.find((p) => p.toLowerCase() === 'pos-80c' || p.toLowerCase() === 'pos-80') ||
        printerList.find((p) => !p.includes('(copy') && p.toLowerCase().includes('pos-80')) ||
        printerList.find((p) => p.toLowerCase().includes('pos-80')) ||
        searchName;
    } else {
      targetPrinter =
        printerList.find((p) => p.toLowerCase() === 'pos-58') ||
        printerList.find((p) => p.toLowerCase() === 'pos-80c' || p.toLowerCase() === 'pos-80') ||
        printerList.find((p) => !p.includes('(copy') && /pos|thermal|receipt|80|58/i.test(p)) ||
        printerList.find((p: string) => /pos|thermal|receipt|80|58/i.test(p)) ||
        printerList[0];
    }

    if (!targetPrinter) {
      return { success: false, message: 'No se encontró ninguna impresora de Windows instalada.' };
    }

    console.log(`[Impresion] Imprimiendo vía Win32 Raw Spooler en: "${targetPrinter}"...`);
    const randomSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const tempFile = path.join(os.tmpdir(), `ticket_${randomSuffix}.bin`);
    const psScript = path.join(__dirname, '..', 'utils', 'print-raw.ps1');

    return new Promise((resolve) => {
      try {
        if (Buffer.isBuffer(text)) {
          fs.writeFileSync(tempFile, text);
        } else {
          const buf = Buffer.from(text, 'latin1');
          fs.writeFileSync(tempFile, buf);
        }

        const command = `powershell -ExecutionPolicy Bypass -File "${psScript}" -PrinterName "${targetPrinter}" -FilePath "${tempFile}"`;

        exec(command, (psErr: any, psStdout: string) => {
          try {
            fs.unlinkSync(tempFile);
          } catch (_) {}
          if (psErr || (psStdout && !psStdout.includes('True'))) {
            console.error(`[Impresion] Error en print-raw.ps1 (${targetPrinter}):`, psErr?.message || psStdout);
            return resolve({
              success: false,
              message: `Error imprimiendo en ${targetPrinter}: ${psErr?.message || psStdout}`,
            });
          }
          console.log(`[Impresion] Ticket impreso con éxito en Win32 Raw Spooler (${targetPrinter}).`);
          return resolve({ success: true, printerName: targetPrinter });
        });
      } catch (e: any) {
        console.error('[Impresion] Error en archivo temporal de impresión:', e.message);
        return resolve({ success: false, message: e.message });
      }
    });
  }
}
