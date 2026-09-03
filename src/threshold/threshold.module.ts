import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Threshold } from 'src/entity/threshold.entity';
import { ThresholdService } from './threshold.service';
import { AlertsModule } from 'src/alerts/alerts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Threshold,
    ]),
    AlertsModule,
  ],
  providers: [
    ThresholdService,
  ],
  exports: [
    ThresholdService,
  ],
})
export class ThresholdModule {}