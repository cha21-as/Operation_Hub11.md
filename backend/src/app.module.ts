import { Module } from '@nestjs/common';
import { RequestsModule } from './requests/requests.module';
import { TicketsModule } from './tickets/tickets.module';

@Module({
  imports: [RequestsModule, TicketsModule],
})
export class AppModule {}