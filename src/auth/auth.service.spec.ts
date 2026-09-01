import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<Pick<UsersService, 'findByEmailWithPassword' | 'findById' | 'register' | 'toPublicUser'>>;
  let jwtService: jest.Mocked<Pick<JwtService, 'sign' | 'verify'>>;

  beforeEach(async () => {
    usersService = {
      findByEmailWithPassword: jest.fn(),
      findById: jest.fn(),
      register: jest.fn(),
      toPublicUser: jest.fn((u) => u as any),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('signed-token'),
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn((_key: string, def?: string) => def ?? '15m') },
        },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('throws UnauthorizedException when user not found', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue(null);
      await expect(service.login('a@b.com', 'pass')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when password is wrong', async () => {
      // bcrypt.compare will return false for 'wrong-hash'
      usersService.findByEmailWithPassword.mockResolvedValue({
        id: '1',
        email: 'a@b.com',
        password: 'not-a-real-hash',
      } as any);
      await expect(service.login('a@b.com', 'anypassword')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('signTokens', () => {
    it('returns access_token and refresh_token', () => {
      const result = service.signTokens({ id: '1', email: 'a@b.com' });
      expect(result).toHaveProperty('access_token', 'signed-token');
      expect(result).toHaveProperty('refresh_token', 'signed-token');
    });
  });

  describe('refreshAppTokens', () => {
    it('throws when token type is not refresh', async () => {
      jwtService.verify.mockReturnValue({ sub: '1', type: 'access' } as any);
      await expect(service.refreshAppTokens('bad-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws when jwtService.verify throws', async () => {
      jwtService.verify.mockImplementation(() => { throw new Error('expired'); });
      await expect(service.refreshAppTokens('bad-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('returns new tokens when refresh token is valid', async () => {
      jwtService.verify.mockReturnValue({ sub: '1', type: 'refresh' } as any);
      usersService.findById.mockResolvedValue({ id: '1', email: 'a@b.com' } as any);
      const result = await service.refreshAppTokens('valid-refresh-token');
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
    });
  });
});
