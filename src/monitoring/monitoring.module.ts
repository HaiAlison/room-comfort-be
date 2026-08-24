import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SensorReading } from 'src/entity/sensor-reading.entity';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';
import { ThresholdModule } from 'src/threshold/threshold.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SensorReading,
    ]),
    ThresholdModule,
  ],
  controllers: [
    MonitoringController,
  ],
  providers: [
    MonitoringService,
  ],
})
export class MonitoringModule {}