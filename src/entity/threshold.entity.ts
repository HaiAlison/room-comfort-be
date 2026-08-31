import { Column, Entity } from 'typeorm';
import { BaseTimeStampEntity } from 'src/utils/config/database/base-entity';

@Entity('thresholds')
export class Threshold extends BaseTimeStampEntity {
  @Column({
    type: 'float',
    name: 'minimum_temperature',
  })
  minimumTemperature: number;

  @Column({
    type: 'float',
    name: 'maximum_temperature',
  })
  maximumTemperature: number;
}