import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('facturas_proveedor')
export class FacturaProveedorEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'int' })
  proveedor_id!: number;

  @Column({ type: 'varchar', length: 100 })
  num_factura!: string;

  @Column({ type: 'int', nullable: true })
  orden_compra_id!: number;

  @Column({ type: 'datetime' })
  fecha_emision!: Date;

  @Column({ type: 'datetime' })
  fecha_vencimiento!: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  impuestos!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  saldo_pendiente!: number;

  @Column({ type: 'varchar', length: 50, default: 'Pendiente' })
  estado_pago!: 'Pagado' | 'Pendiente' | 'Vencido';

  @Column({ type: 'text', nullable: true })
  foto_factura?: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
