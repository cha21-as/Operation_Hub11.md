import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';
import { ServiceRequest } from './entities/service-request.entity';
import { StatusEvent } from './entities/status-event.entity';
import { AI_INTAKE_PROVIDER } from './ai-intake.types';
import { LocalAiIntakeProvider } from './ai-intake.provider';
import { OpenAiIntakeProvider } from './openai-intake.provider';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceRequest, StatusEvent])],
  controllers: [RequestsController],
  providers: [
    RequestsService,
    {
      provide: AI_INTAKE_PROVIDER,
      useFactory: () => {
        if (!process.env.AI_API_KEY) {
          return new LocalAiIntakeProvider();
        }

        return new OpenAiIntakeProvider({
          apiKey: process.env.AI_API_KEY,
          model: process.env.AI_MODEL ?? 'gpt-4o-mini',
          baseUrl: (process.env.AI_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/$/, ''),
        });
      },
    },
  ],
  exports: [RequestsService],
})
export class RequestsModule {}
