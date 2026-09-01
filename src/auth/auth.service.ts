import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { User } from '../entity/user.entity';
import type { RegisterDto } from './dto/register.dto';

export type AppTokens = {
  access_token: string;
  refresh_token: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  // ─── Local Auth ───────────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    const user = await this.usersService.register(dto);
    const tokens = this.signTokens(user);
    return { user: this.usersService.toPublicUser(user), tokens };
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmailWithPassword(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = this.signTokens(user);
    return { user: this.usersService.toPublicUser(user), tokens };
  }

  getPublicUser(user: User) {
    return this.usersService.toPublicUser(user);
  }

  // ─── JWT ─────────────────────────────────────────────────────────────

  /** Issue access + refresh JWT pair for a user */
  signTokens(user: Pick<User, 'id' | 'email'>): AppTokens {
    const accessExpires =
      this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m';
    const refreshExpires =
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';

    const access_token = this.jwtService.sign(
      { sub: user.id, email: user.email },
      { expiresIn: accessExpires as `${number}m` | `${number}d` | `${number}h` },
    );
    const refresh_token = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      { expiresIn: refreshExpires as `${number}m` | `${number}d` | `${number}h` },
    );
    return { access_token, refresh_token };
  }

  /** Rotate app JWT refresh token → new access + refresh pair */
  async refreshAppTokens(refreshToken: string): Promise<AppTokens> {
    try {
      const payload = this.jwtService.verify<{ sub: string; type?: string }>(
        refreshToken,
      );
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }
      const user = await this.usersService.findById(payload.sub);
      return this.signTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}
