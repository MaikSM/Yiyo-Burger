import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateClienteDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  nombre?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  telefono?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  direccion?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  barrio?: string;
}
