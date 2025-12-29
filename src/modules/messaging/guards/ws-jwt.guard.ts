import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { PrismaService } from '@/database';

export interface WsJwtPayload {
  sub: string;
  email: string;
  role: string;
  status: string;
}

export interface AuthenticatedSocket extends Socket {
  user: {
    id: string;
    email: string;
    role: string;
    status: string;
  };
}

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();
    const token = this.extractToken(client);

    if (!token) {
      throw new WsException('Unauthorized: No token provided');
    }

    try {
      const payload = this.jwtService.verify<WsJwtPayload>(token, {
        secret: this.configService.get<string>('jwt.secret'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
        },
      });

      if (!user) {
        throw new WsException('Unauthorized: User not found');
      }

      if (user.status === 'DELETED' || user.status === 'SUSPENDED') {
        throw new WsException('Unauthorized: Account is not active');
      }

      // Attach user to socket for use in handlers
      (client as AuthenticatedSocket).user = {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
      };

      return true;
    } catch (error) {
      if (error instanceof WsException) {
        throw error;
      }
      throw new WsException('Unauthorized: Invalid token');
    }
  }

  private extractToken(client: Socket): string | null {
    // Try to get token from auth object (socket.io auth)
    const authToken = client.handshake?.auth?.token;
    if (authToken) {
      return authToken;
    }

    // Try to get token from query params
    const queryToken = client.handshake?.query?.token;
    if (queryToken && typeof queryToken === 'string') {
      return queryToken;
    }

    // Try to get token from Authorization header
    const authHeader = client.handshake?.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }
}
