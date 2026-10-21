import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  BaseEntity
} from 'typeorm';

@Entity('pagos_nomina')
export class PagoNominaEntity extends BaseEntity {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  id: string;

  @Column({ type: 'int', nullable: false })
  user_id: number;

  @Column({ type: 'varchar', length: 200, nullable: false })
  empleado_nombre: string;

  @Column({ type: 'varchar', length: 10, nullable: false }) // YYYY-MM-DD
  fecha: string;

  @Column({ type: 'int', default: 1 })
  dias_pagados: number;

  @Column({ type: 'float', nullable: false })
  monto: number;

  @Column({ type: 'varchar', length: 50, default: 'Efectivo' })
  metodo_pago: string;

  @Column({ type: 'text', nullable: true })
  observaciones?: string;

  @Column({ type: 'boolean', default: true })
  registrado_como_gasto: boolean;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
