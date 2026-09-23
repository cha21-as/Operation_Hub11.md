import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { IntakeRequestDto } from './dto/intake-request.dto';
import { RequestStatus } from './request-status.enum';
import { CurrentActor, Actor } from './current-actor.decorator';
import { BulkRequestIdsDto } from './dto/bulk-request-ids.dto';

@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Post('intake')
  intake(@Body() dto: IntakeRequestDto) {
    return this.requestsService.suggestFromFreeText(dto.freeText);
  }

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

  @Delete('bulk')
  deleteMany(@Body() dto: BulkRequestIdsDto) {
    return this.requestsService.deleteMany(dto.ids);
  }

  @Post('undo')
  restoreMany(@Body() dto: BulkRequestIdsDto) {
    return this.requestsService.restoreMany(dto.ids);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.requestsService.delete(id);
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