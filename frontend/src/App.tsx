import { useEffect, useState } from 'react';
import {
  Actor,
  ApiError,
  Department,
  ServiceRequest,
  createRequest,
  listRequests,
  resolveRequest,
  startRequest,
} from './api';

const DEPARTMENTS: Department[] = ['IT', 'HR', 'FINANCE'];

export default function App() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState<Department>('IT');

  // Identity is simulated for this milestone — see docs/week3-full-stack-delivery.md.
  const [actorRole, setActorRole] = useState<'employee' | 'staff'>('employee');
  const [actorDepartment, setActorDepartment] = useState<Department>('IT');

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const actor: Actor =
    actorRole === 'staff' ? { role: 'staff', department: actorDepartment } : { role: 'employee', department: null };
  const departmentMismatch = actorRole === 'staff' && actorDepartment !== department;
  const departmentMismatchMessage = `${actorDepartment} staff cannot submit a request for ${department}. Select ${actorDepartment} or change the staff department.`;
  const formatDateTime = (value: string) => new Date(value).toLocaleString();

  async function refresh() {
    try {
      setRequests(await listRequests());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load requests');
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (departmentMismatch) {
      setError(departmentMismatchMessage);
      return;
    }
    try {
      await createRequest(title, department);
      setTitle('');
      setNotice('Request submitted.');
      await refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not submit request');
    }
  }

  async function onStart(id: string) {
    setError(null);
    setNotice(null);
    try {
      await startRequest(id, actor);
      setNotice('Request started.');
      await refresh();
    } catch (e) {
      setError(e instanceof ApiError ? `${e.status}: ${e.message}` : 'Could not start request');
    }
  }

  async function onResolve(id: string) {
    setError(null);
    setNotice(null);
    try {
      await resolveRequest(id, actor);
      setNotice('Request resolved.');
      await refresh();
    } catch (e) {
      setError(e instanceof ApiError ? `${e.status}: ${e.message}` : 'Could not resolve request');
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: '2rem auto', fontFamily: 'sans-serif', padding: '0 1rem' }}>
      <h1 style={{ fontSize: '2.25rem', lineHeight: 1.2, fontWeight: 800, margin: '0 0 1rem' }}>Internal Operations Service Hub</h1>

      <section style={{ border: '1px solid #d0d0d0', borderRadius: 10, padding: '1rem 1.1rem', marginBottom: 26, background: '#f8f8f8' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginBottom: 18 }}>
          <label style={{ fontSize: 15, fontWeight: 600 }}>
            Role:{' '}
            <select
              value={actorRole}
              onChange={(e) => setActorRole(e.target.value as 'employee' | 'staff')}
              style={{
                fontSize: 15,
                padding: '6px 10px',
                border: '1px solid #b9b9b9',
                borderRadius: 4,
                background: '#fff',
              }}
            >
              <option value="employee">Employee</option>
              <option value="staff">Department staff</option>
            </select>
          </label>
          {actorRole === 'staff' && (
            <label style={{ fontSize: 15, fontWeight: 600 }}>
              Department:{' '}
              <select
                value={actorDepartment}
                onChange={(e) => setActorDepartment(e.target.value as Department)}
                style={{
                  fontSize: 15,
                  padding: '6px 10px',
                  border: '1px solid #b9b9b9',
                  borderRadius: 4,
                  background: '#fff',
                }}
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <h2 style={{ fontSize: '1.7rem', margin: '0 0 0.75rem', fontWeight: 700 }}>Submit a request</h2>
        <form onSubmit={onCreate} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            style={{ flex: 1, fontSize: 15, padding: '10px 12px', border: '1px solid #b9b9b9', borderRadius: 4 }}
            placeholder="e.g. Laptop wont turn on"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value as Department)}
            style={{
              fontSize: 15,
              padding: '10px 12px',
              border: '1px solid #b9b9b9',
              borderRadius: 4,
              background: '#fff',
            }}
          >
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={departmentMismatch}
            style={{
              fontSize: 15,
              padding: '10px 18px',
              border: '1px solid #b9b9b9',
              borderRadius: 4,
              background: '#f3f3f3',
              opacity: departmentMismatch ? 0.55 : 1,
              cursor: departmentMismatch ? 'not-allowed' : 'pointer',
            }}
          >
            Submit
          </button>
        </form>
      </section>

      {(departmentMismatch || error) && (
        <p style={{ color: '#b00020', fontSize: '1.1rem', fontWeight: 700, margin: '0 0 1rem' }}>
          Error: {departmentMismatch ? departmentMismatchMessage : error}
        </p>
      )}
      {notice && !departmentMismatch && <p style={{ color: '#1a7a1a', fontSize: '1.2rem', margin: '0 0 1rem' }}>{notice}</p>}

      <section>
        <h2 style={{ fontSize: '1.7rem', margin: '0 0 0.5rem', fontWeight: 700 }}>Requests</h2>
        {requests.length === 0 && <p style={{ fontSize: '1rem', margin: 0 }}>No requests yet.</p>}
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {requests.map((r) => (
            (() => {
              const resolvedEvent = r.history.find((event) => event.status === 'resolved');

              return (
                <li key={r.id} style={{ border: '1px solid #eee', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>{r.title}</strong>
                    <span>
                      {r.department} · <em>{r.status}</em>
                    </span>
                  </div>
                  <div style={{ marginTop: 6, color: '#666', fontSize: 14 }}>
                    Created: {formatDateTime(r.createdAt)}
                  </div>
                  {resolvedEvent && (
                    <div style={{ marginTop: 4, color: '#1a7a1a', fontSize: 14 }}>
                      Resolved: {formatDateTime(resolvedEvent.changedAt)}
                    </div>
                  )}
                  <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                    <button disabled={r.status !== 'submitted'} onClick={() => onStart(r.id)}>
                      Start
                    </button>
                    <button disabled={r.status !== 'in_progress'} onClick={() => onResolve(r.id)}>
                      Resolve
                    </button>
                  </div>
                </li>
              );
            })()
          ))}
        </ul>
      </section>
    </div>
  );
}
