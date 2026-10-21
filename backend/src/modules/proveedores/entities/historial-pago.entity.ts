import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('historial_pagos')
export class HistorialPagoEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'int' })
  factura_id!: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  fecha_pago!: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  monto_pagado!: number;

  @Column({ type: 'varchar', length: 50 })
  metodo_pago!: 'Efectivo' | 'Transferencia' | 'Caja Menor';

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
