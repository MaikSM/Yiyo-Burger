import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type PrintJobType =
  | 'cocina_pizzas'
  | 'cocina_parrilla'
  | 'factura'
  | 'precuenta'
  | 'domicilio'
  | 'prueba'
  | 'cajon';

export type PrintJobStatus =
  | 'pendiente'
  | 'imprimiendo'
  | 'impreso'
  | 'fallido';

@Entity('print_jobs')
export class PrintJobEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar', length: 100, nullable: true })
  pedido_id?: string;

  @Column({ type: 'varchar', length: 50 })
  tipo_ticket!: PrintJobType;

  @Index()
  @Column({ type: 'varchar', length: 150 })
  destino!: string; // IP de red (ej. 192.168.0.9) o nombre de impresora Windows

  @Column('simple-json')
  payload!: any; // Datos del pedido, items, opciones de impresión

  @Index()
  @Column({ type: 'varchar', length: 20, default: 'pendiente' })
  estado!: PrintJobStatus;

  @Column({ type: 'integer', default: 0 })
  intentos!: number;

  @Column({ type: 'integer', default: 3 })
  max_intentos!: number;

  @Column({ type: 'text', nullable: true })
  ultimo_error?: string;

  @Column({ type: 'datetime', nullable: true })
  printed_at?: Date;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
