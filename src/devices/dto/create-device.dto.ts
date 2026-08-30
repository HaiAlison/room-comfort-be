import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EDeviceType } from 'src/utils/common/type';

export class CreateDeviceDto {
  @ApiProperty({ example: 'esp32-room-01-fan' })
  @IsString()
  deviceId: string;

  @ApiProperty({ example: 'room-01' })
  @IsString()
  roomId: string;

  @ApiProperty({ example: 'Quạt phòng 01' })
  @IsString()
  name: string;

  @ApiProperty({ enum: EDeviceType, example: EDeviceType.FAN })
  @IsEnum(EDeviceType)
  type: EDeviceType;

  @ApiPropertyOptional({ example: '1.0.0' })
  @IsOptional()
  @IsString()
  firmwareVersion?: string;
}
