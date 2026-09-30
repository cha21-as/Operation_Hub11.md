import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.PORT ?? 3000);
  const allowedOrigins = new Set([
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://operation-hub11-md-2.onrender.com',
    ...(process.env.CORS_ORIGINS ?? '').split(',').map((origin) => origin.trim()).filter(Boolean),
  ]);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin) || origin.includes('.railway.app')) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin not allowed by CORS: ${origin}`), false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-actor-role', 'x-actor-department'],
    credentials: true,
  });

  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();