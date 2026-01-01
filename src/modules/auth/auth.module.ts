import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { BiometricService } from './biometric.service';
import { MfaService } from './mfa.service';
import { JwtStrategy } from './strategies';
import { JwtAuthGuard, BiometricRequiredGuard } from './guards';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: (configService.get<string>('jwt.expiresIn') || '15m') as `${number}${'s' | 'm' | 'h' | 'd'}`,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [MfaService, AuthService, BiometricService, JwtStrategy, JwtAuthGuard, BiometricRequiredGuard],
  exports: [AuthService, BiometricService, MfaService, JwtAuthGuard, BiometricRequiredGuard],
})
export class AuthModule {}
