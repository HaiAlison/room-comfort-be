import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
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
    if (
      dto.minimumTemperature >=
      dto.maximumTemperature
    ) {
      throw new BadRequestException(
        'Minimum temperature must be lower than maximum temperature',
      );
    }

    let threshold =
      await this.getThreshold();

    if (!threshold) {
      threshold =
        this.thresholdRepository.create({
          minimumTemperature:
            dto.minimumTemperature,

          maximumTemperature:
            dto.maximumTemperature,
        });
    } else {
      threshold.minimumTemperature =
        dto.minimumTemperature;

      threshold.maximumTemperature =
        dto.maximumTemperature;
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
      threshold.maximumTemperature
    ) {
      return 'ON';
    }

    return 'OFF';
  }
}