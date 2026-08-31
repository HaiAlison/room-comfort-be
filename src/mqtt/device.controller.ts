import {
  Body,
  Controller,
  Get,
  Put,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
} from 'class-validator';

import { MqttService } from './mqtt.service';

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
    private readonly mqttService:
      MqttService,
  ) {}

  @Get('fan')
  @ApiOperation({
    summary:
      'Lấy trạng thái quạt hiện tại',
  })
  getFanState() {
    return this.mqttService
      .getFanState();
  }

  @Put('fan')
  @ApiOperation({
    summary:
      'Điều khiển quạt thủ công',
  })
  setFan(
    @Body() dto: UpdateFanDto,
  ) {
    return this.mqttService
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
    return this.mqttService
      .setFanMode(dto.mode);
  }
}