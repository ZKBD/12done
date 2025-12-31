import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BiometricService } from '../biometric.service';

// Metadata key for biometric required decorator
export const BIOMETRIC_ACTION_KEY = 'biometric_action';

/**
 * Decorator to mark an endpoint as requiring biometric verification
 * for users who have biometric enabled (PROD-011.5)
 */
export const RequiresBiometric = (action: string) => {
  return (target: object, key?: string | symbol, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata(BIOMETRIC_ACTION_KEY, action, descriptor.value);
    }
    return descriptor;
  };
};

/**
 * Guard that checks if biometric verification is required for the current action
 *
 * For users with biometricEnabled=true, this guard will require the request
 * to include a valid biometricVerification object in the request body or headers.
 *
 * Usage:
 * @UseGuards(JwtAuthGuard, BiometricRequiredGuard)
 * @RequiresBiometric('payment')
 * async makePayment() { ... }
 */
@Injectable()
export class BiometricRequiredGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private biometricService: BiometricService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get the action from the decorator
    const action = this.reflector.get<string>(
      BIOMETRIC_ACTION_KEY,
      context.getHandler(),
    );

    // If no action is specified, allow the request
    if (!action) {
      return true;
    }

    // Check if this action requires biometric
    if (!this.biometricService.isBiometricRequired(action)) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If no user, let the JWT guard handle it
    if (!user) {
      return true;
    }

    // Check if user has biometric enabled
    const isBiometricEnabled = await this.biometricService.isUserBiometricEnabled(
      user.sub || user.id,
    );

    // If biometric is not enabled, allow the request (PROD-011.4 fallback)
    if (!isBiometricEnabled) {
      return true;
    }

    // Check for biometric verification in the request
    const biometricVerification = request.body?.biometricVerification ||
      request.headers['x-biometric-verification'];

    if (!biometricVerification) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Biometric verification required for this action',
        error: 'BiometricRequired',
        action,
        biometricRequired: true,
      });
    }

    // Parse verification if it's a string (from header)
    let verification = biometricVerification;
    if (typeof biometricVerification === 'string') {
      try {
        verification = JSON.parse(biometricVerification);
      } catch {
        throw new ForbiddenException('Invalid biometric verification format');
      }
    }

    // Verify the biometric signature
    try {
      await this.biometricService.verifyForSensitiveAction(
        user.sub || user.id,
        {
          deviceId: verification.deviceId,
          credentialId: verification.credentialId,
          signature: verification.signature,
          challenge: verification.challenge,
          action,
        },
      );

      // Biometric verified successfully
      return true;
    } catch (error) {
      throw new ForbiddenException({
        statusCode: 403,
        message: error.message || 'Biometric verification failed',
        error: 'BiometricVerificationFailed',
        action,
        biometricRequired: true,
      });
    }
  }
}
