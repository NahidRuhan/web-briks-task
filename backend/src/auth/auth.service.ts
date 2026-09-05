import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { UsersService } from '../users/users.service.js';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    try {
      const existingUser = await this.usersService.findByEmail(dto.email);
      if (existingUser) {
        throw new ConflictException('Email already in use');
      }

      const hashedPassword = await bcrypt.hash(dto.password, 10);
      const user = await this.usersService.create({
        email: dto.email,
        name: dto.name,
        passwordHash: hashedPassword,
      });

      const tokens = this.generateTokens(user.id, user.email);
      return {
        user: { id: user.id, email: user.email, name: user.name },
        ...tokens,
      };
    } catch (error) {
      console.error('REGISTER DB ERROR:', error);
      throw error;
    }
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = this.generateTokens(user.id, user.email);
    return {
      user: { id: user.id, email: user.email, name: user.name },
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
      const user = await this.usersService.findById(payload.sub);
      if (!user) throw new UnauthorizedException('User not found');

      return this.generateTokens(user.id, user.email);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getUserById(id: string) {
    const user = await this.usersService.findById(id);
    if (!user) throw new UnauthorizedException('User not found');
    return user;
  }

  private generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };
    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '15m',
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });

    return { accessToken, refreshToken };
  }
}
