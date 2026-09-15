import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';
import { Department } from './department.enum';

// Week 3 scope note: there is no login system yet. An "actor" is
// simulated via two headers so the authorization rule can be exercised
// for real, without building a full identity system this milestone:
//   x-actor-role:       "employee" | "staff"
//   x-actor-department: "IT" | "HR" | "FINANCE"   (required when role=staff)
export interface Actor {
  role: 'employee' | 'staff';
  department: Department | null;
}

export const CurrentActor = createParamDecorator((_data: unknown, ctx: ExecutionContext): Actor => {
  const req = ctx.switchToHttp().getRequest();
  const role = req.headers['x-actor-role'];
  const department = req.headers['x-actor-department'];

  if (role !== 'employee' && role !== 'staff') {
    throw new BadRequestException(
      'Missing or invalid x-actor-role header (expected "employee" or "staff")',
    );
  }

  if (role === 'staff') {
    if (!department || !Object.values(Department).includes(department)) {
      throw new BadRequestException(
        'staff actors must send a valid x-actor-department header (IT, HR, or FINANCE)',
      );
    }
    return { role, department: department as Department };
  }

  return { role, department: null };
});
