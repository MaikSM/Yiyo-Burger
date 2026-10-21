import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  DeleteDateColumn,
  BaseEntity,
  UpdateDateColumn,
} from 'typeorm';

@Entity('mesas')
export class MesaEntity extends BaseEntity {
  @PrimaryGeneratedColumn()
  mesa_id: number;

  @Column({
    nullable: false,
    unique: true,
  })
  numero: number;

  @Column({
    nullable: false,
  })
  capacidad: number;

  @Column({
    type: 'simple-enum',
    enum: ['libre', 'reservada', 'ocupada', 'mantenimiento'],
    default: 'libre',
    nullable: false,
  })
  estado: 'libre' | 'reservada' | 'ocupada' | 'mantenimiento';

  @Column({
    length: 100,
    nullable: true,
  })
  ubicacion?: string;

  @CreateDateColumn({
    type: 'datetime',
    nullable: false,
  })
  created_at: Date;

  @UpdateDateColumn({
    type: 'datetime',
    nullable: false,
  })
  updated_at: Date;

  @DeleteDateColumn({
    type: 'datetime',
    nullable: true,
  })
  deleted_at: Date;
}
