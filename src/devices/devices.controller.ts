import {
  Body,
  Controller,
  Get,
  MessageEvent,
  Param,
  Post,
  Query,
  Sse,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Observable, map } from 'rxjs';
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { FanControlDto } from './dto/fan-control.dto';
import { GetDevicesDto } from './dto/get-devices.dto';
import { GetActionLogsDto } from './dto/get-action-logs.dto';
import { DeviceStatusResponseDto } from './dto/device-status.response.dto';
import { EActionSource } from 'src/utils/common/type';

// TODO: Add @ApiBearerAuth() + JwtAuthGuard when JWT module is ready

@ApiTags('Devices')
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách thiết bị + trạng thái' })
  @ApiOkResponse({
    description: 'Danh sách Device[] với pagination metadata',
    schema: {
      properties: {
        results: {
          type: 'array',
          items: { $ref: '#/components/schemas/DeviceStatusResponseDto' },
        },
        totalItems: { type: 'number' },
        totalPages: { type: 'number' },
        offset: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  getDevices(@Query() dto: GetDevicesDto) {
    return this.devicesService.getDevices(dto);
  }

  @Post()
  @ApiOperation({ summary: 'Đăng ký thiết bị mới (fan / sensor / buzzer)' })
  @ApiCreatedResponse({ type: DeviceStatusResponseDto })
  createDevice(@Body() dto: CreateDeviceDto) {
    return this.devicesService.createDevice(dto);
  }

  @Get('logs')
  @ApiOperation({ summary: 'Lịch sử điều khiển thiết bị (UC4.3 / UC4.4)' })
  getActionLogs(@Query() dto: GetActionLogsDto) {
    return this.devicesService.getActionLogs(dto);
  }

  /**
   * SSE — FE connects once, server pushes device status after each command.
   *
   * Usage (FE):
   *   const es = new EventSource('/devices/events');
   *   es.onmessage = (e) => console.log(JSON.parse(e.data));
   */
  @Sse('events')
  @ApiOperation({
    summary: 'SSE stream — nhận trạng thái thiết bị real-time',
    description:
      'FE mở kết nối 1 lần. Mỗi khi quạt được bật/tắt (manual hoặc auto), server push event.',
  })
  deviceEvents(): Observable<MessageEvent> {
    return this.devicesService.getDeviceStream().pipe(
      map((device) => ({ data: device } as MessageEvent)),
    );
  }

  @Get(':deviceId')
  @ApiOperation({ summary: 'Lấy trạng thái 1 thiết bị' })
  @ApiOkResponse({ type: DeviceStatusResponseDto })
  getDeviceStatus(@Param('deviceId') deviceId: string) {
    return this.devicesService.getDeviceStatus(deviceId);
  }

  @Post('fan/control')
  @ApiOperation({ summary: 'Điều khiển quạt thủ công (UC3.4 Manual Fan Control)' })
  controlFan(@Body() dto: FanControlDto) {
    // TODO: replace null with current user id when JWT module is ready
    return this.devicesService.controlFan(dto, null, EActionSource.MANUAL);
  }
}
