import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { Threshold } from 'src/entity/threshold.entity';
import { UpdateThresholdDto } from './dto/update-threshold.dto';

export type FanCommand = 'ON' | 'OFF';

@Injectable()
export class ThresholdService implements OnModuleInit {
  private readonly logger = new Logger(ThresholdService.name);

  constructor(
    @InjectRepository(Threshold)
    private readonly thresholdRepository: Repository<Threshold>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.initDefaultThreshold();
  }

  async initDefaultThreshold(): Promise<Threshold> {
    const existing = await this.getThreshold();
    if (existing) {
      return existing;
    }

    const defaultMin = Number(
      this.configService.get<number>('DEFAULT_MIN_TEMPERATURE') ?? 20,
    );
    const defaultMax = Number(
      this.configService.get<number>('DEFAULT_MAX_TEMPERATURE') ?? 30,
    );

    const threshold = this.thresholdRepository.create({
      minimumTemperature: defaultMin,
      maximumTemperature: defaultMax,
    });

    const saved = await this.thresholdRepository.save(threshold);
    this.logger.log(
      `Initialized default threshold: min=${saved.minimumTemperature}°C, max=${saved.maximumTemperature}°C`,
    );
    return saved;
  }

  async getThreshold() {
    return this.thresholdRepository
      .createQueryBuilder('threshold')
      .orderBy('threshold.created_at', 'DESC')
      .getOne();
  }

  async updateThreshold(dto: UpdateThresholdDto) {
    if (dto.minimumTemperature >= dto.maximumTemperature) {
      throw new BadRequestException(
        'Minimum temperature must be lower than maximum temperature',
      );
    }

    let threshold = await this.getThreshold();

    if (!threshold) {
      threshold = this.thresholdRepository.create({
        minimumTemperature: dto.minimumTemperature,
        maximumTemperature: dto.maximumTemperature,
      });
    } else {
      threshold.minimumTemperature = dto.minimumTemperature;
      threshold.maximumTemperature = dto.maximumTemperature;
    }

    return this.thresholdRepository.save(threshold);
  }

  async evaluateTemperature(
    temperature: number,
  ): Promise<FanCommand | null> {
    const threshold = await this.getThreshold();

    if (!threshold) {
      return null;
    }

    // Quạt bật khi vượt ngưỡng trên.
    if (temperature > threshold.maximumTemperature) {
      return 'ON';
    }

    // Quạt tắt ngay khi nhiệt độ về LẠI TRONG ngưỡng.
    //
    // Trước đây chỗ này chỉ trả 'OFF' khi temperature <
    // minimumTemperature, nên khoảng giữa min..max trả null =>
    // không có lệnh nào được phát ra và quạt cứ chạy mãi sau khi
    // đã bật (vd ngưỡng 25..30: bật ở 31, về 27 vẫn không tắt,
    // phải xuống dưới 25 mới tắt).
    return 'OFF';
  }
}