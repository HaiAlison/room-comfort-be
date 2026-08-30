import { Module } from '@nestjs/common';
import { MonitoringModule } from 'src/monitoring/monitoring.module';
import { ThresholdModule } from 'src/threshold/threshold.module';
import { MqttService } from './mqtt.service';

@Module({
  imports: [
    MonitoringModule,
    ThresholdModule,
  ],
  providers: [
    MqttService,
  ],
})
export class MqttModule {}