import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Threshold } from 'src/entity/threshold.entity';
import { UpdateThresholdDto } from './dto/update-threshold.dto';

import { AlertsService } from 'src/alerts/alerts.service';
import {
  EAlertSeverity,
  EAlertStatus,
} from 'src/utils/common/type';

export type FanCommand =
  'ON' | 'OFF';

@Injectable()
export class ThresholdService {
  constructor(
    @InjectRepository(Threshold)
    private readonly thresholdRepository:
      Repository<Threshold>,
    private readonly alertsService:
      AlertsService,
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

  private temperatureAlertState:
  'normal' | 'high' | 'low' =
  'normal';

  async checkTemperatureAlert(
  temperature: number,
) {
  const threshold =
    await this.getThreshold();

  if (!threshold) {
    return;
  }

  let nextState:
    'normal' | 'high' | 'low' =
    'normal';

  if (
    temperature >
    threshold.maximumTemperature
  ) {
    nextState = 'high';
  } else if (
    temperature <
    threshold.minimumTemperature
  ) {
    nextState = 'low';
  }

  if (
    nextState ===
    this.temperatureAlertState
  ) {
    return;
  }

  this.temperatureAlertState =
    nextState;

  if (nextState === 'normal') {
    return;
  }

  const message =
    nextState === 'high'
      ? `Temperature ${temperature}°C exceeded maximum threshold ${threshold.maximumTemperature}°C`
      : `Temperature ${temperature}°C dropped below minimum threshold ${threshold.minimumTemperature}°C`;

  await this.alertsService.createAlert({
    message,
    threshold: {
      minimumTemperature:
        threshold.minimumTemperature,

      maximumTemperature:
        threshold.maximumTemperature,

      actualTemperature:
        temperature,
    },
  });
}
}