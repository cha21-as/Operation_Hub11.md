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
      <h1>Internal Operations Service Hub</h1>

      <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 24 }}>
        <h2>Acting as</h2>
        <p style={{ fontSize: 13, color: '#666' }}>
          No login system yet (out of scope this milestone) — this switches the identity headers sent with each
          action, so you can see the authorization rule allow and deny in real time.
        </p>
        <label>
          Role:{' '}
          <select value={actorRole} onChange={(e) => setActorRole(e.target.value as 'employee' | 'staff')}>
            <option value="employee">Employee</option>
            <option value="staff">Department staff</option>
          </select>
        </label>{' '}
        {actorRole === 'staff' && (
          <label>
            Department:{' '}
            <select value={actorDepartment} onChange={(e) => setActorDepartment(e.target.value as Department)}>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
        )}
      </section>

      <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 24 }}>
        <h2>Submit a request</h2>
        <form onSubmit={onCreate} style={{ display: 'flex', gap: 8 }}>
          <input
            style={{ flex: 1 }}
            placeholder="e.g. Laptop wont turn on"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <select value={department} onChange={(e) => setDepartment(e.target.value as Department)}>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <button type="submit">Submit</button>
        </form>
      </section>

      {error && <p style={{ color: '#b00020' }}>Error: {error}</p>}
      {notice && <p style={{ color: '#1a7a1a' }}>{notice}</p>}

      <section>
        <h2>Requests</h2>
        {requests.length === 0 && <p>No requests yet.</p>}
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {requests.map((r) => (
            <li key={r.id} style={{ border: '1px solid #eee', borderRadius: 8, padding: 12, marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>{r.title}</strong>
                <span>
                  {r.department} · <em>{r.status}</em>
                </span>
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <button disabled={r.status !== 'submitted'} onClick={() => onStart(r.id)}>
                  Start
                </button>
                <button disabled={r.status !== 'in_progress'} onClick={() => onResolve(r.id)}>
                  Resolve
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
