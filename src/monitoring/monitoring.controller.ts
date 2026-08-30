import {
  Body,
  Controller,
  Get,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { MonitoringService } from './monitoring.service';
import { GetMonitoringHistoryDto } from './dto/get-monitoring-history.dto';
import { ThresholdService } from 'src/threshold/threshold.service';
import { UpdateThresholdDto } from 'src/threshold/dto/update-threshold.dto';

@ApiTags('Monitoring')
@Controller('monitoring')
export class MonitoringController {
  constructor(
    private readonly monitoringService:
      MonitoringService,

    private readonly thresholdService:
      ThresholdService,
  ) {}

  @Get('current')
  @ApiOperation({
    summary: 'Lấy nhiệt độ hiện tại',
  })
  getCurrentTemperature() {
    return this.monitoringService
      .getCurrentTemperature();
  }

  @Get('history')
  @ApiOperation({
    summary: 'Lấy lịch sử nhiệt độ',
  })
  getTemperatureHistory(
    @Query() dto: GetMonitoringHistoryDto,
  ) {
    return this.monitoringService.getTemperatureHistory(dto);
  }

  @Get('threshold')
    @ApiOperation({
    summary: 'Lấy ngưỡng nhiệt độ hiện tại',
    })
    getThreshold() {
    return this.thresholdService
        .getThreshold();
    }

    @Put('threshold')
    @ApiOperation({
    summary: 'Cập nhật ngưỡng nhiệt độ',
    })
    updateThreshold(
    @Body() dto: UpdateThresholdDto,
    ) {
    return this.thresholdService
        .updateThreshold(dto);
    }
}