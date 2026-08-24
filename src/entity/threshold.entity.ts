import { Column, Entity } from 'typeorm';
import { BaseTimeStampEntity } from 'src/utils/config/database/base-entity';

@Entity('thresholds')
export class Threshold extends BaseTimeStampEntity {
  @Column({ type: 'float' })
  temperature: number;
}