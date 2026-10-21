import { IsString, IsOptional, IsNumber, IsBoolean, Min, IsNumberString } from 'class-validator';

export class UpdateIngredienteDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  categoria?: string;

  @IsOptional()
  @IsString()
  unidad_medida?: string;

  @IsOptional()
  @IsNumberString()
  stock_actual?: string;

  @IsOptional()
  @IsNumberString()
  stock_minimo?: string;

  @IsOptional()
  @IsNumberString()
  stock_maximo?: string;

  @IsOptional()
  @IsNumberString()
  costo_unitario?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsString()
  estado?: string;

  @IsOptional()
  @IsNumberString()
  stock?: string;
}
