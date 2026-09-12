import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'caregiver@smartroom.io' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'smartroom' })
  @IsString()
  @MinLength(6)
  password: string;
}
