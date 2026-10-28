import { IsEmail, IsString, Length, MaxLength } from 'class-validator';

export class CredentialsDto {
  @IsEmail() @MaxLength(254) email!: string;
  @IsString() @Length(12, 128) password!: string;
}
