import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';
import { ServiceRequest } from './entities/service-request.entity';
import { StatusEvent } from './entities/status-event.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceRequest, StatusEvent])],
  controllers: [RequestsController],
  providers: [RequestsService],
  exports: [RequestsService],
})
export class RequestsModule {}
