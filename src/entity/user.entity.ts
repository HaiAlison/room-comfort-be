import { Entity, Column, Index } from 'typeorm';
import { BaseTimeStampEntity } from 'src/utils/config/database/base-entity';

@Entity('users')
export class User extends BaseTimeStampEntity {
  @Index({ unique: true })
  @Column({ length: 255 })
  email: string;

  @Column({ name: 'first_name', length: 255, nullable: true })
  firstName: string | null;

  @Column({ name: 'last_name', length: 255, nullable: true })
  lastName: string | null;

  @Column({ type: 'text', nullable: true })
  picture: string | null;

  @Column({ type: 'text', select: false })
  password: string;

  @Column({ type: 'text', select: false, nullable: true })
  salt: string | null;
}
