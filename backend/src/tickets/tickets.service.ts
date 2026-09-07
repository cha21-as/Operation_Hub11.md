import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
}

export enum Department {
  IT = 'IT',
  HR = 'HR',
  FACILITIES = 'FACILITIES',
}

export interface InternalTicket {
  id: string;
  department: Department;
  requester_id: string;
  assigned_agent_id?: string;
  status: TicketStatus;
  updatedAt: Date;
}

@Injectable()
export class TicketsService {
  private readonly ALLOWED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
    [TicketStatus.OPEN]: [TicketStatus.IN_PROGRESS],
    [TicketStatus.IN_PROGRESS]: [TicketStatus.RESOLVED],
    [TicketStatus.RESOLVED]: [], // Terminal state
  };

  private tickets = new Map<string, InternalTicket>([
    [
      'TCK-101',
      {
        id: 'TCK-101',
        department: Department.IT,
        requester_id: 'USER-001',
        assigned_agent_id: 'AGENT-007',
        status: TicketStatus.OPEN,
        updatedAt: new Date(),
      },
    ],
  ]);

  getTicket(id: string): InternalTicket {
    const ticket = this.tickets.get(id);
    if (!ticket) {
      throw new NotFoundException(`Ticket ID ${id} not found.`);
    }
    return { ...ticket }; // Return immutable copy
  }

  updateStatus(id: string, newStatus: TicketStatus): InternalTicket {
    const ticket = this.getTicket(id);

    if (ticket.status === TicketStatus.RESOLVED) {
      throw new BadRequestException('Invariant Violation: Resolved tickets cannot change status or be reopened.');
    }

    const allowedNextStates = this.ALLOWED_TRANSITIONS[ticket.status];
    if (!allowedNextStates.includes(newStatus)) {
      throw new BadRequestException(`Invalid state transition from ${ticket.status} to ${newStatus}.`);
    }

    const updatedTicket: InternalTicket = {
      ...ticket,
      status: newStatus,
      updatedAt: new Date(),
    };

    this.tickets.set(id, updatedTicket);
    return updatedTicket;
  }
}