import {
  Entity,
  PrimaryColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

@Entity('daily_sequences')
export class DailySequenceEntity {
  @PrimaryColumn({ type: 'varchar', length: 20 })
  date!: string; // Formato YYYY-MM-DD

  @Column({ type: 'integer', default: 0 })
  global_count!: number;

  @Column({ type: 'integer', default: 0 })
  domicilio_count!: number;

  @UpdateDateColumn()
  updated_at!: Date;
}
