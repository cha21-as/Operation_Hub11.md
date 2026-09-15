import { RequestsService } from './requests.service';
import { RequestStatus } from './request-status.enum';
import { Department } from './department.enum';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

/**
 * Fakes the two repositories with plain in-memory arrays so this test
 * exercises only RequestsService's own logic — the invariant and the
 * authorization rule — without touching a real database. The database
 * itself is covered separately by requests.integration.spec.ts.
 */
function makeFakeRepo<T extends { id?: string }>() {
  const rows: T[] = [];
  return {
    rows,
    create: jest.fn((data: Partial<T>) => ({ ...data }) as T),
    save: jest.fn(async (entity: T) => {
      if (!entity.id) {
        (entity as any).id = `id-${rows.length + 1}`;
      }
      const existingIndex = rows.findIndex((r) => r.id === entity.id);
      if (existingIndex >= 0) rows[existingIndex] = entity;
      else rows.push(entity);
      return entity;
    }),
    find: jest.fn(async () => rows),
    findOne: jest.fn(async ({ where: { id } }: any) => rows.find((r) => r.id === id) ?? null),
  };
}

describe('RequestsService — business rules', () => {
  let service: RequestsService;
  let requestsRepo: ReturnType<typeof makeFakeRepo>;
  let eventsRepo: ReturnType<typeof makeFakeRepo>;

  beforeEach(() => {
    requestsRepo = makeFakeRepo();
    eventsRepo = makeFakeRepo();
    service = new RequestsService(requestsRepo as any, eventsRepo as any);
  });

  it('creates a request in SUBMITTED status', async () => {
    const request = await service.create('Laptop wont turn on', Department.IT);
    expect(request.status).toBe(RequestStatus.SUBMITTED);
    expect(request.department).toBe(Department.IT);
  });

  it('ALLOWS the owning department staff to start a submitted request (authorization: allowed case)', async () => {
    const request = await service.create('Laptop wont turn on', Department.IT);
    const updated = await service.transition(request.id, RequestStatus.IN_PROGRESS, {
      role: 'staff',
      department: Department.IT,
    });
    expect(updated.status).toBe(RequestStatus.IN_PROGRESS);
  });

  it('DENIES a different department\'s staff from starting the request (authorization: denied case)', async () => {
    const request = await service.create('Laptop wont turn on', Department.IT);
    await expect(
      service.transition(request.id, RequestStatus.IN_PROGRESS, {
        role: 'staff',
        department: Department.HR,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('DENIES the requesting employee from starting their own request', async () => {
    const request = await service.create('Laptop wont turn on', Department.IT);
    await expect(
      service.transition(request.id, RequestStatus.IN_PROGRESS, {
        role: 'employee',
        department: null,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('INVARIANT (regression from Week 1/2): rejects skipping straight from submitted to resolved', async () => {
    const request = await service.create('Need employment letter', Department.HR);
    await expect(
      service.transition(request.id, RequestStatus.RESOLVED, {
        role: 'staff',
        department: Department.HR,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('INVARIANT (regression): a resolved request is terminal and cannot be reopened', async () => {
    const request = await service.create('Expense approval', Department.FINANCE);
    await service.transition(request.id, RequestStatus.IN_PROGRESS, {
      role: 'staff',
      department: Department.FINANCE,
    });
    await service.transition(request.id, RequestStatus.RESOLVED, {
      role: 'staff',
      department: Department.FINANCE,
    });

    await expect(
      service.transition(request.id, RequestStatus.IN_PROGRESS, {
        role: 'staff',
        department: Department.FINANCE,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('EXPECTED FAILURE, handled on purpose: transitioning an unknown id returns a clean 404, not a crash', async () => {
    await expect(
      service.transition('does-not-exist', RequestStatus.IN_PROGRESS, {
        role: 'staff',
        department: Department.IT,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});