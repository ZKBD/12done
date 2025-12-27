import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Optional JWT Auth Guard
 *
 * This guard allows unauthenticated requests to pass through,
 * but will still extract user information from the JWT token if one is provided.
 *
 * Use this for endpoints that have different behavior for authenticated
 * vs unauthenticated users (e.g., property listings showing owner-specific data).
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = unknown>(
    err: Error | null,
    user: TUser | false,
  ): TUser | null {
    // Don't throw error if user is not authenticated
    // Just return null for unauthenticated users
    if (err || !user) {
      return null as unknown as TUser;
    }
    return user;
  }
}
