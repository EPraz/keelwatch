import {
  HttpStatus,
  type INestApplication,
  type ValidationError,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { ApiExceptionFilter } from './common/http/api-exception.filter';
import { ApiException, type FieldErrors } from './common/http/api-exception';

function collectFieldErrors(errors: readonly ValidationError[]): FieldErrors {
  const fieldErrors: Record<string, string[]> = {};
  const visit = (error: ValidationError, path: string): void => {
    const field = path ? `${path}.${error.property}` : error.property;
    if (error.constraints) fieldErrors[field] = Object.values(error.constraints);
    for (const child of error.children ?? []) visit(child, field);
  };
  for (const error of errors) visit(error, '');
  return fieldErrors;
}

export function configureApplication(app: INestApplication): void {
  const config = app.get(ConfigService);
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.enableCors({
    origin: [config.getOrThrow<string>('WEB_ORIGIN')],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Correlation-Id'],
    exposedHeaders: ['X-Correlation-Id'],
  });
  app.use(helmet());
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new ApiException(
          HttpStatus.BAD_REQUEST,
          'VALIDATION_FAILED',
          'Review the highlighted fields and try again.',
          collectFieldErrors(errors),
        ),
    }),
  );
  app.enableShutdownHooks();

  if (config.get<string>('NODE_ENV') !== 'production') {
    const openApi = new DocumentBuilder()
      .setTitle('Keelwatch API')
      .setDescription('REST contract for the Keelwatch walking skeleton.')
      .setVersion('1')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, openApi));
  }
}
