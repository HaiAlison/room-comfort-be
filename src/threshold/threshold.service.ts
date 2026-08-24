import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Threshold } from 'src/entity/threshold.entity';
import { UpdateThresholdDto } from './dto/update-threshold.dto';

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
}