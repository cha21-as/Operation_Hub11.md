const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3000';

export type Department = 'IT' | 'HR' | 'FINANCE';
export type RequestStatus = 'submitted' | 'in_progress' | 'resolved';

export interface StatusEvent {
  id: string;
  status: RequestStatus;
  actorRole: string;
  actorDepartment: Department | null;
  changedAt: string;
}

export interface ServiceRequest {
  id: string;
  title: string;
  department: Department;
  status: RequestStatus;
  createdAt: string;
  history: StatusEvent[];
}

export interface IntakeCandidate {
  title: string;
  department: Department | null;
  requiresApproval: boolean;
  confidence: 'high' | 'medium' | 'low';
  rationale: string;
}

export interface Actor {
  role: 'employee' | 'staff';
  department: Department | null;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function actorHeaders(actor: Actor): HeadersInit {
  const headers: Record<string, string> = { 'x-actor-role': actor.role };
  if (actor.role === 'staff' && actor.department) {
    headers['x-actor-department'] = actor.department;
  }
  return headers;
}

async function handle(res: Response) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, body.message ?? `Request failed (${res.status})`);
  }
  return body;
}

export async function listRequests(): Promise<ServiceRequest[]> {
  const res = await fetch(`${API_BASE}/requests`);
  return handle(res);
}

export async function createRequest(title: string, department: Department): Promise<ServiceRequest> {
  const res = await fetch(`${API_BASE}/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, department }),
  });
  return handle(res);
}

export async function suggestRequest(freeText: string): Promise<IntakeCandidate> {
  const res = await fetch(`${API_BASE}/requests/intake`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ freeText }),
  });
  return handle(res);
}

export async function startRequest(id: string, actor: Actor): Promise<ServiceRequest> {
  const res = await fetch(`${API_BASE}/requests/${id}/start`, {
    method: 'POST',
    headers: actorHeaders(actor),
  });
  return handle(res);
}

export async function resolveRequest(id: string, actor: Actor): Promise<ServiceRequest> {
  const res = await fetch(`${API_BASE}/requests/${id}/resolve`, {
    method: 'POST',
    headers: actorHeaders(actor),
  });
  return handle(res);
}

export async function deleteRequest(id: string): Promise<ServiceRequest> {
  const res = await fetch(`${API_BASE}/requests/${id}`, { method: 'DELETE' });
  return handle(res);
}

export async function deleteRequests(ids: string[]): Promise<ServiceRequest[]> {
  const res = await fetch(`${API_BASE}/requests/bulk`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  return handle(res);
}

export async function restoreRequests(ids: string[]): Promise<ServiceRequest[]> {
  const res = await fetch(`${API_BASE}/requests/undo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  return handle(res);
}
