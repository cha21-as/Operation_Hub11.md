import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RequestsService } from './requests.service';
import { RequestsModule } from './requests.module';
import { ServiceRequest } from './entities/service-request.entity';
import { StatusEvent } from './entities/status-event.entity';
import { RequestStatus } from './request-status.enum';
import { Department } from './department.enum';

/**
 * This test talks to a real database engine (SQLite, in-memory for
 * speed/isolation) through real TypeORM repositories — unlike the unit
 * test, nothing here is faked. It proves the service and the schema
 * actually agree with each other and that data round-trips correctly.
 */
describe('RequestsService — database integration', () => {
  let moduleRef: TestingModule;
  let service: RequestsService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: [ServiceRequest, StatusEvent],
          synchronize: true,
          dropSchema: true,
        }),
        RequestsModule,
      ],
    }).compile();

    service = moduleRef.get(RequestsService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('persists a created request and reads it back from the database', async () => {
    const created = await service.create('Need employment letter', Department.HR);

    const fetched = await service.findOne(created.id);
    expect(fetched.id).toBe(created.id);
    expect(fetched.title).toBe('Need employment letter');
    expect(fetched.department).toBe(Department.HR);
    expect(fetched.status).toBe(RequestStatus.SUBMITTED);
  });

  it('persists the status event history across a transition, surviving a fresh read', async () => {
    const created = await service.create('Expense approval', Department.FINANCE);

    await service.transition(created.id, RequestStatus.IN_PROGRESS, {
      role: 'staff',
      department: Department.FINANCE,
    });

    // Re-fetch from the database rather than reusing the in-memory object,
    // to prove the history was actually written and read back, not just
    // held in a JS variable.
    const fetched = await service.findOne(created.id);
    expect(fetched.status).toBe(RequestStatus.IN_PROGRESS);
    expect(fetched.history.map((e) => e.status)).toEqual([
      RequestStatus.SUBMITTED,
      RequestStatus.IN_PROGRESS,
    ]);
    expect(fetched.history[1].actorDepartment).toBe(Department.FINANCE);
  });

  it('findAll reads every persisted request from the database', async () => {
    const all = await service.findAll();
    expect(all.length).toBeGreaterThanOrEqual(2);
  });
});