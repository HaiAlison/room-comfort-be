import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { FromToCommonDto } from 'src/utils/common/dto';

export class GetDevicesDto extends FromToCommonDto {
  @ApiPropertyOptional({ description: 'Filter by room ID' })
  @IsString()
  @IsOptional()
  roomId?: string;

  @ApiPropertyOptional({ description: 'Filter by device type: FAN | SENSOR | BUZZER' })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ description: 'Filter by status: ONLINE | OFFLINE | ERROR' })
  @IsString()
  @IsOptional()
  status?: string;
}
