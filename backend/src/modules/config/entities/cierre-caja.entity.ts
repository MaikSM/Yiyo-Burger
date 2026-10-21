import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity,
} from 'typeorm';

@Entity('cierres_caja')
export class CierreCajaEntity extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'integer' })
  usuario_id!: number;

  @Column({ type: 'varchar', length: 150 })
  usuario_nombre!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  monto_inicial!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  ventas_efectivo!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  ventas_tarjeta!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  ventas_transferencia!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_ventas!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_esperado_efectivo!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  monto_real_contado!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  diferencia!: number;

  @Column({ type: 'varchar', length: 50, default: 'Abierto' })
  estado!: 'Abierto' | 'Cerrado';

  @Column({ type: 'text', nullable: true })
  notas!: string;

  @CreateDateColumn({ type: 'datetime' })
  fecha_apertura!: Date;

  @Column({ type: 'datetime', nullable: true })
  fecha_cierre!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at!: Date;
}
