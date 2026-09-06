import {
  Body,
  Controller,
  Get,
  MessageEvent,
  Put,
  Sse,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Observable, map } from 'rxjs';
import {
  IsBoolean,
  IsIn,
} from 'class-validator';

import { FanService } from './fan.service';

class UpdateFanDto {
  @IsBoolean()
  on: boolean;
}

class UpdateFanModeDto {
  @IsIn([
    'auto',
    'manual',
  ])
  mode: 'auto' | 'manual';
}

@ApiTags('Devices')
@Controller('devices')
export class DeviceController {
  constructor(
    private readonly fanService:
      FanService,
  ) {}

  @Get('fan')
  @ApiOperation({
    summary:
      'Lấy trạng thái quạt hiện tại',
  })
  getFanState() {
    return this.fanService
      .getFanState();
  }

  /**
   * SSE — FE connects once, server pushes fan state on every change
   * (manual command, mode switch, or auto threshold flip).
   */
  @Sse('fan/events')
  @ApiOperation({
    summary:
      'SSE stream — nhận trạng thái quạt real-time',
    description:
      'FE mở kết nối 1 lần. Mỗi khi quạt đổi trạng thái/chế độ (tay hoặc auto), server push event ngay.',
  })
  fanEvents(): Observable<MessageEvent> {
    return this.fanService
      .getFanStream()
      .pipe(
        map(
          (state) =>
            ({ data: state }) as MessageEvent,
        ),
      );
  }

  @Put('fan')
  @ApiOperation({
    summary:
      'Điều khiển quạt thủ công',
  })
  setFan(
    @Body() dto: UpdateFanDto,
  ) {
    return this.fanService
      .setManualFan(dto.on);
  }

  @Put('fan/mode')
  @ApiOperation({
    summary:
      'Đổi chế độ điều khiển quạt',
  })
  setFanMode(
    @Body() dto: UpdateFanModeDto,
  ) {
    return this.fanService
      .setFanMode(dto.mode);
  }
}