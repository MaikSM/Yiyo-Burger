// Importa los decoradores de validación de la librería "class-validator".
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator';

// Define una clase DTO (Data Transfer Object) para la actualización de usuarios.
export class UpdateUserDto {
  // Valida que el campo "name" no esté vacío.
  @IsNotEmpty()
  // Valida que el campo "name" sea una cadena de texto.
  @IsString()
  // Restringe la longitud del nombre entre 2 y 100 caracteres.
  @Length(2, 200)
  name: string;

  // Valida que el campo "surname" no esté vacío.
  @IsNotEmpty()
  // Valida que el campo "surname" sea una cadena de texto.
  @IsString()
  // Restringe la longitud del apellido entre 2 y 100 caracteres.
  @Length(2, 200)
  surname: string;

  // Valida que el campo "email" no esté vacío.
  @IsNotEmpty()
  // Valida que el campo "email" sea una cadena de texto.
  @IsString()
  // Restringe la longitud del correo electrónico entre 4 y 100 caracteres.
  @Length(4, 100)
  // Valida que el campo "email" tenga formato de correo electrónico.
  @IsEmail()
  email: string;

  // El campo "password" es opcional para actualizaciones.
  @IsOptional()
  // Valida que el campo "password" sea una cadena de texto.
  @IsString()
  // Restringe la longitud de la contraseña entre 8 y 100 caracteres.
  @Length(8, 100)
  password?: string;

  // El campo "photo" es opcional - puede ser una URL o base64.
  @IsOptional()
  // Valida que el campo "photo" sea una cadena de texto.
  @IsString()
  // Permite hasta 2MB de datos en base64 (aproximadamente 2.7M caracteres)
  @MaxLength(3000000)
  photo?: string;

  // Indica que el campo "role_id" es opcional en la solicitud.
  @IsOptional()
  @IsInt() // Asegura que sea un número entero
  @Min(1) // Evita valores menores que 1
  role_id?: number;
}
