import {
  Body,
  Controller,
  Get,
  MessageEvent,
  Put,
  Query,
  Sse,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Observable, map } from 'rxjs';
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

  /**
   * SSE — FE connects once, server pushes each new sensor reading
   * as soon as it arrives from MQTT (~15s cycle from the device).
   *
   * Usage (FE):
   *   const es = new EventSource('/monitoring/events');
   *   es.onmessage = (e) => console.log(JSON.parse(e.data));
   */
  @Sse('events')
  @ApiOperation({
    summary:
      'SSE stream — nhận sensor reading real-time',
    description:
      'FE mở kết nối 1 lần. Mỗi khi backend lưu reading mới từ MQTT, server push event ngay.',
  })
  readingEvents(): Observable<MessageEvent> {
    return this.monitoringService
      .getReadingStream()
      .pipe(
        map(
          (reading) =>
            ({ data: reading }) as MessageEvent,
        ),
      );
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