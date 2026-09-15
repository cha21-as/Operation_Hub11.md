import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceRequest } from './entities/service-request.entity';
import { StatusEvent } from './entities/status-event.entity';
import { RequestStatus } from './request-status.enum';
import { Department } from './department.enum';
import { Actor } from './current-actor.decorator';

// Only these transitions are allowed. Anything not listed here is invalid.
//
// This is the Week 1/2 invariant, unchanged, now enforced against a real
// database: a request cannot skip In progress and jump straight from
// Submitted to Resolved, and Resolved is terminal.
const ALLOWED_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  [RequestStatus.SUBMITTED]: [RequestStatus.IN_PROGRESS],
  [RequestStatus.IN_PROGRESS]: [RequestStatus.RESOLVED],
  [RequestStatus.RESOLVED]: [],
};

@Injectable()
export class RequestsService {
  constructor(
    @InjectRepository(ServiceRequest)
    private readonly requests: Repository<ServiceRequest>,
    @InjectRepository(StatusEvent)
    private readonly events: Repository<StatusEvent>,
  ) {}

  async create(title: string, department: Department): Promise<ServiceRequest> {
    const request = this.requests.create({
      title,
      department,
      status: RequestStatus.SUBMITTED,
    });
    const saved = await this.requests.save(request);

    await this.events.save(
      this.events.create({
        request: saved,
        status: RequestStatus.SUBMITTED,
        actorRole: 'employee',
        actorDepartment: null,
      }),
    );

    return this.findOne(saved.id);
  }

  findAll(): Promise<ServiceRequest[]> {
    return this.requests.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<ServiceRequest> {
    const request = await this.requests.findOne({ where: { id } });
    // Expected failure, handled on purpose: a missing request is a normal
    // outcome (bad id, deleted, typo) — not a crash. It is surfaced as a
    // clean 404, not an unhandled database/undefined error.
    if (!request) {
      throw new NotFoundException(`Request ${id} not found`);
    }
    return request;
  }

  /**
   * Move a request forward in its lifecycle.
   *
   * Authorization rule: only staff belonging to the request's own
   * department may transition it. An employee, or staff from a
   * different department, is denied — this is enforced here, not left
   * to the frontend to respect.
   */
  async transition(id: string, nextStatus: RequestStatus, actor: Actor): Promise<ServiceRequest> {
    const request = await this.findOne(id);

    if (actor.role !== 'staff' || actor.department !== request.department) {
      throw new ForbiddenException(
        `Only ${request.department} staff may act on this request`,
      );
    }

    const allowedNext = ALLOWED_TRANSITIONS[request.status];
    if (!allowedNext.includes(nextStatus)) {
      throw new BadRequestException(
        `Invalid transition: cannot move request from "${request.status}" to "${nextStatus}"`,
      );
    }

    request.status = nextStatus;
    await this.requests.save(request);
    await this.events.save(
      this.events.create({
        request,
        status: nextStatus,
        actorRole: actor.role,
        actorDepartment: actor.department,
      }),
    );

    return this.findOne(id);
  }
}