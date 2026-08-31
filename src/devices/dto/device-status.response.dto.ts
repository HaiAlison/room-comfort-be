import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EDeviceStatus, EDeviceType } from 'src/utils/common/type';

export class DeviceStatusResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  deviceId: string;

  @ApiProperty()
  roomId: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: EDeviceType })
  type: EDeviceType;

  @ApiProperty({ enum: EDeviceStatus })
  status: EDeviceStatus;

  @ApiProperty()
  isOn: boolean;

  @ApiPropertyOptional({ nullable: true })
  lastSeen: Date | null;

  @ApiPropertyOptional({ nullable: true })
  firmwareVersion: string | null;
}
