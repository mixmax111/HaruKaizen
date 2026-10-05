import { IsEmail, IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Email non valida' })
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
