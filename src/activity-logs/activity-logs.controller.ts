import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ActivityLogsService } from './activity-logs.service';
import { GetActivityLogsDto } from './activity-logs.dto';

@ApiTags('activity-logs')
@Controller('activity-logs')
export class ActivityLogsController {
  constructor(private readonly activityLogsService: ActivityLogsService) {}

  @Get()
  @ApiOperation({ summary: 'Get list of activity logs with pagination' })
  @ApiOkResponse({
    description: 'Paginated list of activity logs',
    schema: {
      properties: {
        results: { type: 'array', items: { type: 'object' } },
        totalItems: { type: 'number' },
        totalPages: { type: 'number' },
        offset: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  getLogs(@Query() dto: GetActivityLogsDto) {
    return this.activityLogsService.getLogs(dto);
  }
}
