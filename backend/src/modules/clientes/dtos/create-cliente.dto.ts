import { IsString, IsOptional, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateClienteDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(100)
  nombre: string;

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
