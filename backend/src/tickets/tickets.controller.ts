import { Controller, Get, Patch, Param, Body, ParseUUIDPipe } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { UpdateStatusDto } from './dto/update-status.dto';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get(':id')
  async getTicket(@Param('id', ParseUUIDPipe) id: string) {
    return await this.ticketsService.getTicket(id);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStatusDto: UpdateStatusDto,
  ) {
    return await this.ticketsService.updateStatus(id, updateStatusDto.status);
  }
}