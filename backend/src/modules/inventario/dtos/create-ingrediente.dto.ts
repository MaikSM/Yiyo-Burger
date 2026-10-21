import { IsString, IsOptional, IsNumber, IsBoolean, Min, IsEnum } from 'class-validator';

export class CreateIngredienteDto {
  @IsString()
  nombre: string;

  @IsOptional()
  @IsString()
  categoria?: string;

  @IsOptional()
  @IsString()
  unidad_medida?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock_actual?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock_minimo?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock_maximo?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costo_unitario?: number;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsString()
  estado?: string;
}