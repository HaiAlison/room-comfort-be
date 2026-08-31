import {
  Column,
  Entity,
} from 'typeorm';
import { BaseTimeStampEntity } from 'src/utils/config/database/base-entity';

@Entity('fan_states')
export class FanState extends BaseTimeStampEntity {
  @Column({
    name: 'room_id',
    nullable: true,
  })
  roomId?: string;

  @Column({
    name: 'is_on',
    type: 'boolean',
    default: false,
  })
  isOn: boolean;

  @Column({
    type: 'varchar',
    default: 'auto',
  })
  mode: 'auto' | 'manual';

  @Column({
    type: 'varchar',
    nullable: true,
  })
  reason?: string;
}