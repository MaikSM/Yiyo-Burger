import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('ordenes_compra')
export class OrdenCompraEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'int' })
  proveedor_id!: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  fecha_pedido!: Date;

  @Column({ type: 'datetime', nullable: true })
  fecha_entrega_estimada!: Date;

  @Column({ type: 'varchar', length: 50, default: 'Borrador' })
  estado!: 'Borrador' | 'Solicitado' | 'Recibido' | 'Cancelado';

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_estimado!: number;

  @Column('simple-json', { nullable: true })
  items!: Array<{
    ingrediente_id: number;
    nombre: string;
    cantidad_compra: number; // Cantidad solicitada en empaque de compra (ej: 5 cajas)
    unidad_compra: string;    // Unidad de compra (ej: caja, saco, bandeja)
    costo_compra: number;     // Costo por empaque de compra
    factor_conversion: number; // Cuántas unidades de stock contiene cada unidad de compra (ej: 10 si la caja trae 10kg)
    unidad_stock: string;     // Unidad en la que se descuenta/mide en inventario (ej: kg)
  }>;

  @Column({ type: 'text', nullable: true })
  foto_factura?: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
