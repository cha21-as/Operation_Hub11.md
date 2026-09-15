import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';
import { RequestsModule } from '../src/requests/requests.module';
import { ServiceRequest } from '../src/requests/entities/service-request.entity';
import { StatusEvent } from '../src/requests/entities/status-event.entity';

/**
 * One meaningful E2E test: exercises the real HTTP surface (not the
 * service directly) end to end — request in, real validation, real
 * authorization check, real database, real response out. This is the
 * same contract a real frontend or client would rely on.
 */
describe('Service Request flow (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
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

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  let requestId: string;

  it('rejects an invalid request on purpose (missing title) with 400', async () => {
    await request(app.getHttpServer())
      .post('/requests')
      .send({ department: 'IT' })
      .expect(400);
  });

  it('rejects an invalid request on purpose (unknown department) with 400', async () => {
    await request(app.getHttpServer())
      .post('/requests')
      .send({ title: 'Laptop wont turn on', department: 'MARKETING' })
      .expect(400);
  });

  it('creates a valid request and returns the API contract shape', async () => {
    const res = await request(app.getHttpServer())
      .post('/requests')
      .send({ title: 'Laptop wont turn on', department: 'IT' })
      .expect(201);

    expect(res.body).toMatchObject({
      title: 'Laptop wont turn on',
      department: 'IT',
      status: 'submitted',
    });
    expect(res.body.id).toEqual(expect.any(String));
    requestId = res.body.id;
  });

  it('AUTHORIZATION — denies an employee from starting their own request (403)', async () => {
    await request(app.getHttpServer())
      .post(`/requests/${requestId}/start`)
      .set('x-actor-role', 'employee')
      .expect(403);
  });

  it('AUTHORIZATION — denies staff from a different department (403)', async () => {
    await request(app.getHttpServer())
      .post(`/requests/${requestId}/start`)
      .set('x-actor-role', 'staff')
      .set('x-actor-department', 'HR')
      .expect(403);
  });

  it('EXPECTED FAILURE, handled on purpose — starting an unknown request returns 404, not a crash', async () => {
    await request(app.getHttpServer())
      .post('/requests/00000000-0000-0000-0000-000000000000/start')
      .set('x-actor-role', 'staff')
      .set('x-actor-department', 'IT')
      .expect(404);
  });

  it('AUTHORIZATION — allows the owning department staff to start the request (200)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/requests/${requestId}/start`)
      .set('x-actor-role', 'staff')
      .set('x-actor-department', 'IT')
      .expect(201);

    expect(res.body.status).toBe('in_progress');
  });

  it('REGRESSION — the Week 1/2 invariant still holds: cannot skip in_progress and resolve directly from submitted', async () => {
    const second = await request(app.getHttpServer())
      .post('/requests')
      .send({ title: 'Need employment letter', department: 'HR' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/requests/${second.body.id}/resolve`)
      .set('x-actor-role', 'staff')
      .set('x-actor-department', 'HR')
      .expect(400);
  });

  it('REGRESSION — a resolved request stays terminal and cannot be reopened', async () => {
    await request(app.getHttpServer())
      .post(`/requests/${requestId}/resolve`)
      .set('x-actor-role', 'staff')
      .set('x-actor-department', 'IT')
      .expect(201);

    await request(app.getHttpServer())
      .post(`/requests/${requestId}/start`)
      .set('x-actor-role', 'staff')
      .set('x-actor-department', 'IT')
      .expect(400);
  });

  it('the full history is visible on GET, proving persistence across the whole flow', async () => {
    const res = await request(app.getHttpServer()).get(`/requests/${requestId}`).expect(200);
    expect(res.body.history.map((e: any) => e.status)).toEqual([
      'submitted',
      'in_progress',
      'resolved',
    ]);
  });
});