import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { FromToCommonDto } from 'src/utils/common/dto';

export class GetActionLogsDto extends FromToCommonDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  deviceId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  roomId?: string;

  @ApiPropertyOptional({ description: 'MANUAL | AUTO | SYSTEM' })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  action?: string;
}
