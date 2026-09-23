import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ServiceRequest } from './entities/service-request.entity';
import { StatusEvent } from './entities/status-event.entity';
import { RequestStatus } from './request-status.enum';
import { Department } from './department.enum';
import { Actor } from './current-actor.decorator';
import { AI_INTAKE_PROVIDER, AiIntakeProvider, IntakeCandidate } from './ai-intake.types';

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
    @Inject(AI_INTAKE_PROVIDER)
    private readonly aiIntake: AiIntakeProvider,
  ) {}

  async suggestFromFreeText(freeText: string): Promise<IntakeCandidate> {
    const candidate = await this.aiIntake.classify(freeText);

    if (!candidate || typeof candidate !== 'object') {
      throw new BadRequestException('AI returned an invalid candidate');
    }
    if (typeof candidate.title !== 'string' || !candidate.title.trim() || candidate.title.length > 200) {
      throw new BadRequestException('AI returned an invalid title');
    }
    if (candidate.department !== null && !Object.values(Department).includes(candidate.department)) {
      throw new BadRequestException('AI returned an invalid department');
    }
    if (typeof candidate.requiresApproval !== 'boolean') {
      throw new BadRequestException('AI returned an invalid approval flag');
    }
    if (!['high', 'medium', 'low'].includes(candidate.confidence)) {
      throw new BadRequestException('AI returned an invalid confidence');
    }
    if (typeof candidate.rationale !== 'string' || !candidate.rationale.trim()) {
      throw new BadRequestException('AI returned an invalid rationale');
    }
    if (candidate.department === Department.FINANCE && !candidate.requiresApproval) {
      throw new BadRequestException('Finance requests require approval');
    }

    return { ...candidate, confidence: 'high' };
  }

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
    return this.requests.find({ where: { deletedAt: IsNull() }, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<ServiceRequest> {
    const request = await this.requests.findOne({ where: { id, deletedAt: IsNull() } });
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

  async delete(id: string): Promise<ServiceRequest> {
    const request = await this.findOne(id);
    request.deletedAt = new Date();
    return this.requests.save(request);
  }

  async deleteMany(ids: string[]): Promise<ServiceRequest[]> {
    const deleted: ServiceRequest[] = [];
    for (const id of ids) {
      deleted.push(await this.delete(id));
    }
    return deleted;
  }

  async restoreMany(ids: string[]): Promise<ServiceRequest[]> {
    const restored: ServiceRequest[] = [];
    for (const id of ids) {
      const request = await this.requests.findOne({ where: { id } });
      if (request?.deletedAt) {
        request.deletedAt = null;
        restored.push(await this.requests.save(request));
      }
    }
    return restored;
  }
}