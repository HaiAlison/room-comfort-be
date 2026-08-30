import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Threshold } from 'src/entity/threshold.entity';
import { ThresholdService } from './threshold.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Threshold,
    ]),
  ],
  providers: [
    ThresholdService,
  ],
  exports: [
    ThresholdService,
  ],
})
export class ThresholdModule {}