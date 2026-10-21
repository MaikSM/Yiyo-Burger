import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity,
} from 'typeorm';

@Entity('gastos')
export class GastoEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'integer', nullable: true })
  cierre_id!: number;

  @Column({ type: 'varchar', length: 20 })
  fecha!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  monto!: number;

  @Column({ type: 'varchar', length: 50, default: 'Efectivo' })
  metodo_pago!: string;

  @Column({ type: 'text' })
  motivo!: string;

  @Column({ type: 'varchar', length: 100, default: 'Otros' })
  categoria!: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  usuario_nombre!: string;

  @CreateDateColumn({ type: 'datetime' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at!: Date;
}
