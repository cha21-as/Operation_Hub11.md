import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { RequestStatus } from '../request-status.enum';
import { Department } from '../department.enum';
import { StatusEvent } from './status-event.entity';

@Entity()
export class ServiceRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'varchar' })
  department: Department;

  @Column({ type: 'varchar', default: RequestStatus.SUBMITTED })
  status: RequestStatus;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => StatusEvent, (event) => event.request, {
    cascade: true,
    eager: true,
  })
  history: StatusEvent[];
}
