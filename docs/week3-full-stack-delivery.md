# Week 3 — Integrated Product Slice

**Flow:** an employee submits a Service Request; department staff belonging to that request's own department can start it; the requester cannot, and staff from a different department cannot.

This builds directly on Week 1 (`product-spec.md`, `architecture.md`, `data-model.md`) and Week 2 (the 3-state lifecycle and its invariant). Nothing about the lifecycle or the invariant changed — this milestone gives it a real frontend, a real database, and an explicit API contract.

---

## A note on this session's evidence

In earlier milestones I ran `npm install`, the build, and every HTTP call live in this environment and pasted the real output. In this session, the sandbox's network egress to npm's registry was blocked for the entire session (`x-deny-reason: host_not_allowed` on every registry host tried, including ones normally allowed) — the same command that worked in Week 2 failed here. I could not install dependencies or run the build/tests live this time.

Everything below — the code, the tests, the API contract — is written and structured exactly the way the Week 2 code was (which I did verify live), and the commands under **How to Reproduce** are the actual commands to run. Please run them once when you pull the repo; if anything doesn't match what's described here, that's the thing to fix first, and I'd want to know.

---

## The Flow

```
Employee                          Department staff (same department)
   |                                        |
   | POST /requests                         |
   |  {title, department}                   |
   v                                        |
[Submitted] ---------------------------> POST /requests/:id/start
                                             |
                                             v
                                        [In progress] --> POST /requests/:id/resolve --> [Resolved]
```

## API Contract

### `POST /requests` — submit a request

Request:
```json
{ "title": "Laptop wont turn on", "department": "IT" }
```

Success — `201`:
```json
{
  "id": "b3f1...-uuid",
  "title": "Laptop wont turn on",
  "department": "IT",
  "status": "submitted",
  "createdAt": "2026-09-15T09:00:00.000Z",
  "history": [
    { "id": "...", "status": "submitted", "actorRole": "employee", "actorDepartment": null, "changedAt": "..." }
  ]
}
```

Rejected — `400` (invalid request, on purpose):
```json
{ "statusCode": 400, "message": ["title should not be empty"], "error": "Bad Request" }
```
Triggered by a missing/empty `title`, a `title` over 200 characters, or a `department` outside `IT | HR | FINANCE`.

### `GET /requests` / `GET /requests/:id`

Returns the request(s) in the same shape as above. `GET /requests/:id` with an unknown id returns:

Expected failure, handled on purpose — `404`:
```json
{ "statusCode": 404, "message": "Request <id> not found", "error": "Not Found" }
```

### `POST /requests/:id/start` and `POST /requests/:id/resolve`

No body. Identity is sent via headers (see below).

Success — `201`, same shape as create, with `status` advanced and a new `history` entry.

Denied — `403` (authorization rule):
```json
{ "statusCode": 403, "message": "Only IT staff may act on this request", "error": "Forbidden" }
```

Rejected — `400` (invariant violation — e.g. skipping `in_progress`, or acting on a `resolved` request):
```json
{ "statusCode": 400, "message": "Invalid transition: cannot move request from \"submitted\" to \"resolved\"", "error": "Bad Request" }
```

### Identity headers (simulated for this milestone)

There is no login system yet — this is explicitly out of scope until a later milestone. Every action that needs to know "who is doing this" reads two headers:

| Header | Values | Required when |
|---|---|---|
| `x-actor-role` | `employee` \| `staff` | always, for `start`/`resolve` |
| `x-actor-department` | `IT` \| `HR` \| `FINANCE` | when `x-actor-role: staff` |

---

## The Required Guarantees

### 1. One authorization rule — allowed and denied

**Rule:** only staff belonging to a request's own department may start or resolve it.

- **Allowed:** staff with `x-actor-department: IT` starting an `IT` request → `201`.
- **Denied (case A):** the requesting employee trying to start their own request → `403`.
- **Denied (case B):** staff with `x-actor-department: HR` trying to start an `IT` request → `403`.

Enforced in `backend/src/requests/requests.service.ts` (`transition()`), not left to the frontend — the frontend's disabled buttons are a convenience, not the actual boundary.

### 2. One invalid request rejected on purpose

`POST /requests` with a missing `title` or an unrecognized `department` is rejected with `400` by `class-validator` DTO rules (`CreateRequestDto`) before it ever reaches the service or the database.

### 3. One expected failure handled on purpose

`GET /requests/:id` or `POST /requests/:id/start` with an id that doesn't exist is a normal, expected outcome (bad link, typo, stale page) — handled as a clean `404` (`NotFoundException` in `RequestsService.findOne`), not an unhandled database error or a crash.

### 4. One automated test for a business rule

`backend/src/requests/requests.service.spec.ts` — unit tests the transition invariant and the authorization rule directly against `RequestsService`, with the repositories faked (no real database), so it's fast and isolated. Covers: allowed transition, both denied-authorization cases, both invariant violations, and the 404 case.

### 5. One integration test between the backend and the database

`backend/src/requests/requests.integration.spec.ts` — runs `RequestsService` against a **real** SQLite database (in-memory, via TypeORM, `synchronize: true`), proving the entity schema and the service logic actually agree: a created request round-trips correctly, and the status-event history is truly persisted and re-readable, not just held in a JS object.

### 6. One meaningful E2E test

`backend/test/app.e2e-spec.ts` — boots the real Nest application and drives it purely over HTTP with `supertest`, covering the whole contract in one flow: reject invalid input → create → deny wrong actor (twice) → handle unknown id → allow correct actor → invariant still holds → resolve → reopening rejected → full history visible on a final `GET`. This is the same contract a real client (including the React frontend) relies on.

### 7. Regression protection

The Week 1/2 invariant — "cannot skip straight from `submitted` to `resolved`," and "`resolved` is terminal" — is re-verified in *all three* test layers (unit, integration implicitly via the same service, and explicitly in the E2E test, labeled `REGRESSION`). If a future change to the DB schema, the controller, or the transition table breaks that promise, one of these three tests fails immediately.

---

## How to Reproduce

```bash
cd backend
npm install
npm run build
npm test            # unit + integration tests (requests.service.spec.ts, requests.integration.spec.ts)
npm run test:e2e    # full HTTP flow (test/app.e2e-spec.ts)
npm run start        # or: npm run dev
```

Then, with the backend running:

```bash
cd frontend
npm install
npm run dev
# open http://localhost:5173
```

In the UI: submit a request as "Employee," then switch the role switcher to "Department staff" with a *different* department than the request and try Start (denied), then switch to the *matching* department and Start (allowed) — the same two authorization cases the automated tests cover.
