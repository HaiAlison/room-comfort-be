import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class FanControlDto {
  @ApiProperty({ example: 'esp32-room-01-fan' })
  @IsString()
  deviceId: string;

  @ApiProperty({ example: true, description: 'true = ON, false = OFF' })
  @IsBoolean()
  isOn: boolean;

  @ApiPropertyOptional({ example: 'manual', description: 'manual | auto-threshold' })
  @IsOptional()
  @IsString()
  reason?: string;
}
