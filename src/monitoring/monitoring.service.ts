import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SensorReading } from 'src/entity/sensor-reading.entity';
import { GetMonitoringHistoryDto } from './dto/get-monitoring-history.dto';
@Injectable()
export class MonitoringService {
  constructor(
    @InjectRepository(SensorReading)
    private readonly sensorReadingRepository:
      Repository<SensorReading>,
  ) {}

  async getCurrentTemperature() {
    const reading =
      await this.sensorReadingRepository
        .createQueryBuilder('reading')
        .addSelect('reading.created_at')
        .orderBy(
          'reading.created_at',
          'DESC',
        )
        .getOne();

    return reading;
  }
  async getTemperatureHistory(
    dto: GetMonitoringHistoryDto,
    ) {
    const {
        roomId,
        from,
        to,
        limit = 1000,
        offset = 0,
    } = dto;

    const qb =
        this.sensorReadingRepository
        .createQueryBuilder('reading')
        .addSelect('reading.created_at');

    if (roomId) {
        qb.andWhere(
        'reading.roomId = :roomId',
        { roomId },
        );
    }

    if (from) {
        qb.andWhere(
        'reading.created_at >= :from',
        { from },
        );
    }

    if (to) {
        qb.andWhere(
        'reading.created_at <= :to',
        { to },
        );
    }

    qb.orderBy(
        'reading.created_at',
        'DESC',
    );

    qb.skip(offset);
    qb.take(limit);

    const [
        results,
        totalItems,
    ] = await qb.getManyAndCount();

    return {
        results,
        totalItems,
        totalPages: Math.ceil(
            totalItems / limit,
        ),
        offset,
        limit,
    };
  }

  async saveSensorReading(
    temperature: number,
    humidity: number,
    roomId?: string,
    ) {
    const reading =
        this.sensorReadingRepository.create({
        roomId,
        temperature,
        humidity,
        });

    return this.sensorReadingRepository.save(
        reading,
    );
    }
}