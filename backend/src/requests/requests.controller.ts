import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { RequestStatus } from './request-status.enum';
import { CurrentActor, Actor } from './current-actor.decorator';

@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Post()
  create(@Body() dto: CreateRequestDto) {
    return this.requestsService.create(dto.title, dto.department);
  }

  @Get()
  findAll() {
    return this.requestsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.requestsService.findOne(id);
  }

  @Post(':id/start')
  start(@Param('id') id: string, @CurrentActor() actor: Actor) {
    return this.requestsService.transition(id, RequestStatus.IN_PROGRESS, actor);
  }

  @Post(':id/resolve')
  resolve(@Param('id') id: string, @CurrentActor() actor: Actor) {
    return this.requestsService.transition(id, RequestStatus.RESOLVED, actor);
  }
}