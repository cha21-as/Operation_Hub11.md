import { useEffect, useState } from 'react';
import {
  Actor,
  ApiError,
  Department,
  IntakeCandidate,
  ServiceRequest,
  createRequest,
  deleteRequest,
  deleteRequests,
  listRequests,
  resolveRequest,
  restoreRequests,
  startRequest,
  suggestRequest,
} from './api';
import './styles.css';

const DEPARTMENTS: Department[] = ['IT', 'HR', 'FINANCE'];

function StatusPill({ status }: { status: ServiceRequest['status'] }) {
  const labels = { submitted: 'Submitted', in_progress: 'In progress', resolved: 'Resolved' };
  return <span className={`status-pill status-${status}`}>{labels[status]}</span>;
}

function DepartmentMark({ department }: { department: Department }) {
  return <span className={`department-mark department-${department.toLowerCase()}`}>{department.slice(0, 1)}</span>;
}

export default function App() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [title, setTitle] = useState('');
  const [freeText, setFreeText] = useState('');
  const [candidate, setCandidate] = useState<IntakeCandidate | null>(null);
  const [department, setDepartment] = useState<Department>('IT');
  const [actorRole, setActorRole] = useState<'employee' | 'staff'>('employee');
  const [actorDepartment, setActorDepartment] = useState<Department>('IT');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [undoIds, setUndoIds] = useState<string[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState<Department | 'ALL'>('ALL');
  const [viewedRequest, setViewedRequest] = useState<ServiceRequest | null>(null);

  const actor: Actor = actorRole === 'staff'
    ? { role: 'staff', department: actorDepartment }
    : { role: 'employee', department: null };
  const departmentMismatch = actorRole === 'staff' && actorDepartment !== department;
  const departmentMismatchMessage = `${actorDepartment} staff cannot submit a request for ${department}.`;

  async function refresh() {
    try {
      setRequests(await listRequests());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load requests');
    }
  }

  useEffect(() => { refresh(); }, []);

  async function onSuggest(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const result = await suggestRequest(freeText);
      setCandidate(result);
      setManualMode(false);
      if (result.department) setDepartment(result.department);
      setTitle(result.title);
      setNotice(result.department ? 'Suggestion ready for review.' : 'More detail is needed before routing.');
    } catch (e) {
      setError(e instanceof ApiError ? `${e.status}: ${e.message}` : 'Could not classify request');
    } finally { setBusy(false); }
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (departmentMismatch) { setError(departmentMismatchMessage); return; }
    setBusy(true);
    try {
      await createRequest(title, department);
      setTitle('');
      setFreeText('');
      setCandidate(null);
      setNotice('Request submitted to the operations queue.');
      await refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not submit request');
    } finally { setBusy(false); }
  }

  async function transition(id: string, action: 'start' | 'resolve') {
    setError(null);
    setNotice(null);
    try {
      if (action === 'start') await startRequest(id, actor);
      else await resolveRequest(id, actor);
      setNotice(action === 'start' ? 'Request moved to in progress.' : 'Request marked as resolved.');
      await refresh();
    } catch (e) {
      setError(e instanceof ApiError ? `${e.status}: ${e.message}` : `Could not ${action} request`);
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id]);
  }

  function toggleAll() {
    const visibleIds = filteredRequests.map((request) => request.id);
    setSelectedIds((current) => visibleIds.every((id) => current.includes(id)) ? current.filter((id) => !visibleIds.includes(id)) : [...new Set([...current, ...visibleIds])]);
  }

  async function removeSelected(idsOrEvent: string[] | React.MouseEvent<HTMLButtonElement> = selectedIds) {
    const ids = Array.isArray(idsOrEvent) ? idsOrEvent : selectedIds;
    if (!ids.length) return;
    setError(null);
    setNotice(null);
    try {
      const deleted = ids.length === 1
        ? [await deleteRequest(ids[0])]
        : await deleteRequests(ids);
      setUndoIds(deleted.map((request) => request.id));
      setSelectedIds([]);
      setNotice(`${deleted.length} request${deleted.length === 1 ? '' : 's'} deleted. You can undo this action.`);
      await refresh();
    } catch (e) {
      setError(e instanceof ApiError ? `${e.status}: ${e.message}` : 'Could not delete requests');
    }
  }

  async function undoDelete() {
    if (!undoIds.length) return;
    try {
      const restored = await restoreRequests(undoIds);
      setUndoIds([]);
      setNotice(`${restored.length} request${restored.length === 1 ? '' : 's'} restored.`);
      await refresh();
    } catch (e) {
      setError(e instanceof ApiError ? `${e.status}: ${e.message}` : 'Could not undo deletion');
    }
  }

  const openCount = requests.filter((r) => r.status !== 'resolved').length;
  const activeCount = requests.filter((r) => r.status === 'in_progress').length;
  const resolvedCount = requests.filter((r) => r.status === 'resolved').length;
  const filteredRequests = departmentFilter === 'ALL'
    ? requests
    : requests.filter((request) => request.department === departmentFilter);

  return (
    <div className="app-shell">
      <main className="main-content">
        <header className="topbar">
          <div className="page-heading"><div><h1>Request desk</h1></div></div>
          <div className="topbar-actions"><span className="date-label">Thursday, 24 September 2026</span><span className="topbar-product-brand"><span className="brand-mark">O</span><span>OPERATION HUB<span className="brand-dot">.</span></span></span></div>
        </header>

        <section className="metrics" aria-label="Request overview">
          <div className="metric"><span className="metric-label">OPEN REQUESTS</span><strong>{openCount.toString().padStart(2, '0')}</strong><span className="metric-note">Across all departments</span></div>
          <div className="metric"><span className="metric-label">IN PROGRESS</span><strong>{activeCount.toString().padStart(2, '0')}</strong><span className="metric-note metric-green">● Being handled now</span></div>
          <div className="metric"><span className="metric-label">RESOLVED</span><strong>{resolvedCount.toString().padStart(2, '0')}</strong><span className="metric-note">All time</span></div>
          <div className="metric metric-context"><span className="metric-label">CURRENT VIEW</span><strong>{actorRole === 'staff' ? actorDepartment : 'Employee'}</strong></div>
        </section>

        <div className="content-grid">
          <section className="intake-panel panel">
            <div className="panel-heading"><div><p className="eyebrow">NEW REQUEST</p><h2>What can we help with?</h2></div><span className="ai-badge"><span>✦</span> AI assisted</span></div>
            <p className="panel-intro">Describe your need in plain language. Operation Hub will suggest a team and request details for you to review.</p>
            <form onSubmit={onSuggest}>
              <label className="field-label" htmlFor="request-description">Request description</label>
              <textarea id="request-description" className="description-input" placeholder="Tell us what you need help with..." value={freeText} onChange={(e) => setFreeText(e.target.value)} required />
              <div className="form-footer"><button className="text-button" type="button" onClick={() => setManualMode((current) => !current)}>{manualMode ? 'Use AI suggestion instead' : 'Skip AI and submit manually'}</button><button className="primary-button" type="submit" disabled={busy || manualMode}>{busy ? 'Working...' : 'Generate suggestion  →'}</button></div>
            </form>
            {manualMode && <form className="manual-box" onSubmit={onCreate}><div className="suggestion-heading"><strong>Manual request</strong><span className="confidence">No AI used</span></div><p>Enter the request details directly and choose the responsible team.</p><div className="suggestion-fields"><label>Title<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Laptop will not turn on" required /></label><label>Assigned team<select value={department} onChange={(e) => setDepartment(e.target.value as Department)}>{DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}</select></label></div>{departmentMismatch && <div className="approval-note">{departmentMismatchMessage}</div>}<button className="submit-button" type="submit" disabled={busy || departmentMismatch}>Submit request</button></form>}
            {candidate && <div className="suggestion-box"><div className="suggestion-heading"><span className="sparkle">✦</span><strong>Suggested request details</strong><span className="confidence">{candidate.confidence} confidence</span></div><p>{candidate.rationale}</p><div className="suggestion-fields"><label>Title<input value={title} onChange={(e) => setTitle(e.target.value)} /></label><label>Assigned team<select value={department} onChange={(e) => setDepartment(e.target.value as Department)}>{DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}</select></label></div>{candidate.requiresApproval && <div className="approval-note">Approval required · this request will be reviewed by Finance.</div>}<div className="review-note">Review the suggestion before submitting. AI is advisory; you remain in control.</div><button className="submit-button" type="button" onClick={() => void onCreate({ preventDefault: () => {} } as React.FormEvent)} disabled={busy || !candidate.department || departmentMismatch}>Submit request</button></div>}
          </section>

          <aside className="settings-panel panel">
            <div className="panel-heading"><div><p className="eyebrow">SESSION</p><h2>Acting as</h2></div></div>
            <label className="field-label" htmlFor="role">Role</label><select id="role" className="select-control" value={actorRole} onChange={(e) => setActorRole(e.target.value as 'employee' | 'staff')}><option value="employee">Employee</option><option value="staff">Department staff</option></select>
            {actorRole === 'staff' && <><label className="field-label" htmlFor="actor-department">Department</label><select id="actor-department" className="select-control" value={actorDepartment} onChange={(e) => setActorDepartment(e.target.value as Department)}>{DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}</select></>}
          </aside>
        </div>

        {(error || notice || departmentMismatch) && <div className={error || departmentMismatch ? 'alert alert-error' : 'alert alert-success'}>{error || (departmentMismatch ? departmentMismatchMessage : notice)}</div>}

        <section className="queue-section"><div className="queue-heading"><div><p className="eyebrow">LIVE QUEUE</p><h2>Recent requests</h2></div><div className="queue-actions"><select className="queue-filter" aria-label="Filter requests by department" value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value as Department | 'ALL')}><option value="ALL">All departments</option>{DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}</select><button className="filter-button" onClick={toggleAll}>{filteredRequests.length > 0 && filteredRequests.every((request) => selectedIds.includes(request.id)) ? 'Clear selection' : 'Select all'}</button><button className="delete-button" disabled={!selectedIds.length} onClick={removeSelected}>Delete selected</button>{undoIds.length > 0 && <button className="undo-button" onClick={undoDelete}>↶ Undo</button>}</div></div>
          {filteredRequests.length === 0 ? <div className="empty-state"><span>◌</span><strong>No requests yet</strong><p>{departmentFilter === 'ALL' ? 'New requests will appear here.' : `No ${departmentFilter} requests found.`}</p>{undoIds.length > 0 && <button className="undo-button" onClick={undoDelete}>↶ Undo deletion</button>}</div> : <div className="request-table"><div className="table-head"><span><input type="checkbox" aria-label="Select all requests" checked={filteredRequests.length > 0 && filteredRequests.every((request) => selectedIds.includes(request.id))} onChange={toggleAll} /></span><span>REQUEST</span><span>TEAM</span><span>STATUS</span><span>CREATED</span><span>ACTION</span></div>{filteredRequests.map((request) => { const resolvedEvent = request.history.find((event) => event.status === 'resolved'); return <div className="request-row" key={request.id}><div><input type="checkbox" aria-label={`Select ${request.title}`} checked={selectedIds.includes(request.id)} onChange={() => toggleSelected(request.id)} /></div><div className="request-name"><strong>{request.title}</strong><small>#{request.id.slice(0, 8)}</small></div><div className="team-cell"><DepartmentMark department={request.department} />{request.department}</div><StatusPill status={request.status} /><span className="created-cell">{new Date(resolvedEvent?.changedAt ?? request.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span><div className="row-actions"><button className="view-button" onClick={() => setViewedRequest(request)}>View</button><button disabled={request.status !== 'submitted'} onClick={() => transition(request.id, 'start')}>Start</button><button disabled={request.status !== 'in_progress'} onClick={() => transition(request.id, 'resolve')}>Resolve</button><button className="row-delete" aria-label={`Delete ${request.title}`} onClick={() => void removeSelected([request.id])}>Delete</button></div></div>})}</div>}
        </section>
        {viewedRequest && <div className="ticket-overlay" role="presentation" onClick={() => setViewedRequest(null)}><section className="ticket-modal" role="dialog" aria-modal="true" aria-labelledby="ticket-title" onClick={(e) => e.stopPropagation()}><div className="ticket-modal-header"><div><p className="eyebrow">REQUEST TICKET</p><h2 id="ticket-title">{viewedRequest.title}</h2></div><button className="modal-close" aria-label="Close ticket" onClick={() => setViewedRequest(null)}>×</button></div><div className="ticket-meta"><span><strong>Team</strong><DepartmentMark department={viewedRequest.department} />{viewedRequest.department}</span><span><strong>Status</strong><StatusPill status={viewedRequest.status} /></span><span><strong>Created</strong>{new Date(viewedRequest.createdAt).toLocaleString()}</span></div><div className="ticket-history"><strong>Status history</strong>{viewedRequest.history.map((event) => <div className="history-row" key={event.id}><StatusPill status={event.status} /><span>{new Date(event.changedAt).toLocaleString()}</span></div>)}</div></section></div>}
        <footer className="footer"><span>Operation Hub · Internal use only</span><span>System status <b className="online-dot">● Operational</b></span></footer>
      </main>
    </div>
  );
}
