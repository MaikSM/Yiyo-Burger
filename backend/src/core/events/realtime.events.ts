import { EventEmitter } from 'events';

export interface RealTimeEvent {
  type: 'pedido_created' | 'pedido_updated' | 'pedido_deleted' | 'mesa_changed' | 'platos_changed';
  data?: any;
  timestamp: string;
}

class RealTimeEmitter extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(200);
  }

  public broadcast(type: RealTimeEvent['type'], data?: any): void {
    const event: RealTimeEvent = {
      type,
      data,
      timestamp: new Date().toISOString(),
    };
    this.emit('realtime', event);
  }
}

export const realTimeEmitter = new RealTimeEmitter();
