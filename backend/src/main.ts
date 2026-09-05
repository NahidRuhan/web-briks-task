import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.enableCors({
    origin: [
      process.env.FRONTEND_URL ?? 'http://localhost:3000',
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ],
    credentials: true,
  });
  const port = process.env.PORT || process.env.BACKEND_PORT || 5000;
  await app.listen(port, '0.0.0.0');
  console.log(`Backend running on port ${port}`);
}
await bootstrap();
