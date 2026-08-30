import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EActionResult, EActionSource } from 'src/utils/common/type';

export class DeviceActionLogResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  deviceId: string;

  @ApiProperty()
  roomId: string;

  @ApiProperty()
  action: string;

  @ApiProperty({ enum: EActionSource })
  source: EActionSource;

  @ApiProperty({ enum: EActionResult })
  result: EActionResult;

  @ApiPropertyOptional({ nullable: true })
  triggeredBy: string | null;

  @ApiPropertyOptional({ nullable: true, type: 'object', additionalProperties: true })
  payload: Record<string, any> | null;

  @ApiPropertyOptional({ nullable: true })
  errorMessage: string | null;
}
