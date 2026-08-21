import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EAlertStatus, EAlertSeverity } from 'src/utils/common/type';

export class AlertItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ name: 'room_id' })
  roomId: string;

  @ApiProperty({ enum: EAlertSeverity, default: EAlertSeverity.INFO })
  severity: EAlertSeverity;

  @ApiProperty()
  message: string;

  @ApiProperty({ enum: EAlertStatus, default: EAlertStatus.ACTIVE })
  status: EAlertStatus;

  @ApiPropertyOptional({ type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;

  @ApiPropertyOptional({ nullable: true })
  resolvedBy: string | null;

  @ApiPropertyOptional({
    description: 'Threshold config that triggered this alert (jsonb)',
    nullable: true,
    type: 'object',
    additionalProperties: true,
  })
  threshold: Record<string, any> | null;

  @ApiProperty()
  isRead: boolean;

}
