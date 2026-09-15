import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { RequestsModule } from './requests/requests.module';
import { TicketsModule } from './tickets/tickets.module';
import { ServiceRequest } from './requests/entities/service-request.entity';
import { StatusEvent } from './requests/entities/status-event.entity';

const dataDir = join(process.cwd(), 'data');
mkdirSync(dataDir, { recursive: true });

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: process.env.DB_PATH ?? join(dataDir, 'db.sqlite'),
      entities: [ServiceRequest, StatusEvent],
      synchronize: true,
      logging: false,
    }),
    RequestsModule,
    TicketsModule,
  ],
})
export class AppModule {}