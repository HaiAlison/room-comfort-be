import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Threshold } from 'src/entity/threshold.entity';
import { UpdateThresholdDto } from './dto/update-threshold.dto';
export type FanCommand =
  'ON' | 'OFF';
@Injectable()
export class ThresholdService {
  constructor(
    @InjectRepository(Threshold)
    private readonly thresholdRepository:
      Repository<Threshold>,
  ) {}

  async getThreshold() {
    return this.thresholdRepository
      .createQueryBuilder('threshold')
      .getOne();
  }

  async updateThreshold(
    dto: UpdateThresholdDto,
  ) {
    let threshold =
      await this.thresholdRepository
        .createQueryBuilder('threshold')
        .getOne();

    if (!threshold) {
      threshold =
        this.thresholdRepository.create({
          temperature: dto.temperature,
        });
    } else {
      threshold.temperature =
        dto.temperature;
    }

    return this.thresholdRepository.save(
      threshold,
    );
  }

  async evaluateTemperature(
    temperature: number,
    ): Promise<FanCommand | null> {
    const threshold =
        await this.getThreshold();

    if (!threshold) {
        return null;
    }

    if (
        temperature >
        threshold.temperature
    ) {
        return 'OFF';
    }

    return 'ON';
    }
}