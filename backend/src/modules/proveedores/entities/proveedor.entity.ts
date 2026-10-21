import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('proveedores')
export class ProveedorEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  razon_social!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  nit!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  contacto!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  telefono!: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  correo!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  direccion!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  categoria!: string; // Carnes, Salsas, Bebidas, etc.

  @Column({ type: 'varchar', length: 100, nullable: true })
  datos_bancarios_banco!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  datos_bancarios_tipo!: string; // Ahorros, Corriente

  @Column({ type: 'varchar', length: 50, nullable: true })
  datos_bancarios_numero!: string;

  @Column({ type: 'int', default: 0 })
  dias_plazo!: number;

  @Column({ type: 'boolean', default: true })
  activo!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
