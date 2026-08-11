import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AlertItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  roomId: string;

  @ApiProperty()
  alertType: string;

  @ApiProperty()
  alertMessage: string;

  @ApiProperty()
  alertStatus: string;

  @ApiProperty()
  isResolved: boolean;

  @ApiPropertyOptional({ type: Date, nullable: true })
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

  @ApiProperty()
  isMuted: boolean;
}
