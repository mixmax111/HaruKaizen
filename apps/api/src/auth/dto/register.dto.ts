import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Email non valida' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'La password deve essere di almeno 8 caratteri' })
  @MaxLength(128)
  password: string;
}
