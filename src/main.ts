import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // Enable raw body parsing for Stripe webhook signature verification
    rawBody: true,
  });

  // Ensure uploads directory exists
  const uploadsPath = join(process.cwd(), 'uploads');
  if (!existsSync(uploadsPath)) {
    mkdirSync(uploadsPath, { recursive: true });
  }

  // Serve static files from uploads directory
  app.useStaticAssets(uploadsPath, {
    prefix: '/uploads',
  });

  // Global prefix for all routes
  app.setGlobalPrefix('api');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS configuration - allow localhost for development and production origins
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      // Allow any localhost origin in development
      if (origin.startsWith('http://localhost:')) {
        return callback(null, true);
      }
      // Allow production VPS origins (any port on the VPS IP)
      if (origin.startsWith('http://172.104.245.236:')) {
        return callback(null, true);
      }
      // Allow production domain
      if (origin === 'https://12done.com' || origin === 'https://www.12done.com') {
        return callback(null, true);
      }
      // Also check CORS_ORIGINS env var for additional allowed origins
      const corsOrigins = process.env.CORS_ORIGINS?.split(',') || [];
      if (corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  });

  // Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('12done.com API')
    .setDescription('Comprehensive Real Estate & Services Platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management endpoints')
    .addTag('invitations', 'Invitation system endpoints')
    .addTag('properties', 'Property listing endpoints')
    .addTag('search', 'Search and discovery endpoints')
    .addTag('health', 'Health check endpoints')
    .addTag('payments', 'Payment processing endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.APP_PORT || 3000;
  await app.listen(port);

  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
