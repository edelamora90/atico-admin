import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as express from 'express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      'http://localhost:4200',
      'http://127.0.0.1:4200'
    ],
    credentials: true,
  });

  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Atico Admin API')
    .setDescription('Sistema de administración para Ático')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3004);

  console.log(
    `🚀 API running on http://localhost:${process.env.PORT ?? 3004}/api`,
  );

  console.log(
    `📚 Swagger running on http://localhost:${process.env.PORT ?? 3004}/api/docs`,
  );
}

bootstrap();
