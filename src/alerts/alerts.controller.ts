import { Controller, Get, Query, Sse, MessageEvent } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Observable, map } from 'rxjs';
import { AlertsService } from './alerts.service';
import { GetAlertsDto } from './dto/get-alerts.dto';
import { AlertItemResponseDto } from './dto/alert-item.response.dto';

// TODO: Add @ApiBearerAuth() + JwtAuthGuard when JWT module is ready

@ApiTags('Alerts')
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách Alert (có phân trang và filter)' })
  @ApiOkResponse({
    description: 'Danh sách AlertItem[] với pagination metadata',
    schema: {
      properties: {
        results: {
          type: 'array',
          items: { $ref: '#/components/schemas/AlertItemResponseDto' },
        },
        totalItems: { type: 'number' },
        totalPages: { type: 'number' },
        offset: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  getAlerts(@Query() dto: GetAlertsDto) {
    return this.alertsService.getAlerts(dto);
  }

  /**
   * SSE endpoint — FE connects once, server pushes new alerts in real-time.
   *
   * Usage (FE):
   *   const es = new EventSource('/alerts/events');
   *   es.onmessage = (e) => console.log(JSON.parse(e.data));
   *
   * Each event:  { data: AlertItem }
   */
  @Sse('events')
  @ApiOperation({
    summary: 'SSE stream — nhận thông báo real-time khi có Alert mới',
    description:
      'FE mở kết nối 1 lần. Mỗi khi ThresholdService tạo Alert mới, server tự động push event xuống.',
  })
  alertEvents(): Observable<MessageEvent> {
    return this.alertsService.getAlertStream().pipe(
      map((alert) => ({ data: alert } as MessageEvent)),
    );
  }
}
