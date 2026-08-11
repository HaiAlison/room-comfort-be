import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { FromToCommonDto } from 'src/utils/common/dto';

export class GetAlertsDto extends FromToCommonDto {
  @ApiPropertyOptional({ description: 'Filter by room ID' })
  @IsString()
  @IsOptional()
  roomId?: string;

  @ApiPropertyOptional({ description: 'Filter by alert type (e.g. temperature, humidity)' })
  @IsString()
  @IsOptional()
  alertType?: string;

  @ApiPropertyOptional({ description: 'Filter by alert status' })
  @IsString()
  @IsOptional()
  alertStatus?: string;

  @ApiPropertyOptional({ description: 'Filter resolved / unresolved alerts' })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isResolved?: boolean;

  @ApiPropertyOptional({ description: 'Filter read / unread alerts' })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isRead?: boolean;

  @ApiPropertyOptional({ description: 'Filter muted / unmuted alerts' })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isMuted?: boolean;
}
