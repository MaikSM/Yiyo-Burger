import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('pedidos')
export class PedidoEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50 })
  tipo!: 'Mesa' | 'Domicilio' | 'Llevar' | 'Barra';

  @Column({ type: 'varchar', length: 50, default: 'Recibido' })
  estado!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, nullable: true })
  costo_domicilio!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  impuesto_valor!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  propina_valor!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total!: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  metodo_pago!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, nullable: true })
  monto_entregado!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, nullable: true })
  vuelto!: number;

  @Column('simple-json')
  items!: any[];

  @Column('simple-json', { nullable: true })
  pagos_mixtos?: { metodo: string; monto: number }[];

  @Column({ type: 'varchar', length: 150, nullable: true })
  cliente_nombre!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  cliente_telefono!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  cliente_direccion!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  cliente_barrio!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  domiciliario!: string;

  @Column({ type: 'text', nullable: true })
  notas!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  mesa!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  cierre_id!: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  mesero?: string;

  @Column({ type: 'integer', nullable: true })
  usuario_id?: number;

  @Column({ type: 'integer', nullable: true })
  orderNumber?: number;

  @Column({ type: 'integer', nullable: true })
  domicilioNumber?: number;

  @CreateDateColumn()
  fecha!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
