import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Alert } from 'src/entity/alerts.entity';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { ActivityLogsModule } from 'src/activity-logs/activity-logs.module';

@Module({
  imports: [TypeOrmModule.forFeature([Alert]), ActivityLogsModule],
  controllers: [AlertsController],
  providers: [AlertsService],
  // Export AlertsService so ThresholdModule can inject it to call createAlert()
  exports: [AlertsService],
})
export class AlertsModule {}
