import { Column, Entity } from 'typeorm';
import { BaseTimeStampEntity } from 'src/utils/config/database/base-entity';

@Entity('sensor_readings')
export class SensorReading extends BaseTimeStampEntity {
  @Column({ name: 'room_id', nullable: true })
  roomId: string;

  @Column({ type: 'float' })
  temperature: number;
}