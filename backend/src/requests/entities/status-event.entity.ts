import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { RequestStatus } from '../request-status.enum';
import { Department } from '../department.enum';
import { ServiceRequest } from './service-request.entity';

// Per ADR-001: status is a history of events, not a single overwritable
// field. Each row also records who made the change (actor) — the audit
// requirement identified while hunting contradictions in Week 1.
@Entity()
export class StatusEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  status: RequestStatus;

  @Column()
  actorRole: string;

  @Column({ type: 'varchar', nullable: true })
  actorDepartment: Department | null;

  @CreateDateColumn()
  changedAt: Date;

  @ManyToOne(() => ServiceRequest, (request) => request.history, {
    onDelete: 'CASCADE',
  })
  request: ServiceRequest;
}
