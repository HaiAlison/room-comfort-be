import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
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
}
