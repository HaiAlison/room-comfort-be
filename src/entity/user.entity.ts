import { BaseTimeStampEntity } from 'src/utils/config/database/base-entity';
import { Column, Entity } from 'typeorm';

@Entity('users')
export class User extends BaseTimeStampEntity {
  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ default: 'Caregiver' })
  role: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;
}
