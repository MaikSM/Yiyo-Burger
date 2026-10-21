import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity
} from 'typeorm';

@Entity('asistencias')
export class AsistenciaEntity extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: false })
  user_id: number;

  @Column({ type: 'varchar', length: 10, nullable: false }) // YYYY-MM-DD
  fecha: string;

  @Column({ type: 'varchar', length: 10, nullable: true, default: '08:00' })
  hora_entrada?: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  hora_salida?: string;

  @Column({ type: 'varchar', length: 50, default: 'presente' })
  estado: string;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;
}
