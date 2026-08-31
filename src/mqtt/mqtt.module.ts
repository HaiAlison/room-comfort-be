import { Module } from '@nestjs/common';
import { MonitoringModule } from 'src/monitoring/monitoring.module';
import { ThresholdModule } from 'src/threshold/threshold.module';
import { MqttService } from './mqtt.service';
import {
  DeviceController,
} from './device.controller';
@Module({
  imports: [
    MonitoringModule,
    ThresholdModule,
  ],
  controllers: [
    DeviceController,
  ],
  providers: [
    MqttService,
  ],
})
export class MqttModule {}