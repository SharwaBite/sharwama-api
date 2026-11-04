import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule, ObserveInstrument } from './app.module';
import { AllExceptionsFilter } from './common';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
    instrument: ObserveInstrument,
  });

  app.use(helmet());

  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
    : true;

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  app.setGlobalPrefix('api', {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Sharwama API')
    .setDescription('Sharwama ordering, payments, and admin dashboard API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Health')
    .addTag('Auth')
    .addTag('Cart')
    .addTag('Delivery Zones')
    .addTag('Delivery Zones (Admin)')
    .addTag('Menu')
    .addTag('Menu Categories (Admin)')
    .addTag('Menu Items (Admin)')
    .addTag('Menu Option Groups (Admin)')
    .addTag('Menu Options (Admin)')
    .addTag('Orders')
    .addTag('Payments')
    .addTag('Promo Codes')
    .addTag('Promo Codes (Admin)')
    .addTag('Store Settings')
    .addTag('Store Settings (Admin)')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig, {
    autoTagControllers: false,
  });
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
