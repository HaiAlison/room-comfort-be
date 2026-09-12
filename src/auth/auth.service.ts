import {
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from 'src/entity/user.entity';
import { LoginDto } from './dto/login.dto';

export interface AuthSession {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Seed a default caregiver account so the team can log in immediately.
   * Controlled by env DEFAULT_USER_EMAIL / DEFAULT_USER_PASSWORD;
   * skipped when the user already exists.
   */
  async onModuleInit() {
    const email =
      this.configService.get<string>('DEFAULT_USER_EMAIL') ??
      'caregiver@smartroom.io';
    const password =
      this.configService.get<string>('DEFAULT_USER_PASSWORD') ?? 'smartroom';

    const existed = await this.userRepo.findOne({ where: { email } });
    if (existed) return;

    await this.userRepo.save(
      this.userRepo.create({
        email,
        name: 'Caregiver',
        role: 'Caregiver',
        passwordHash: await bcrypt.hash(password, 10),
      }),
    );
  }

  async login(dto: LoginDto): Promise<AuthSession> {
    const user = await this.userRepo.findOne({
      where: { email: dto.email.trim().toLowerCase() },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const token = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') ?? '1d',
      },
    );

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async me(userId: string): Promise<AuthSession['user']> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }
}
