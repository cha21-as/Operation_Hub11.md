# Week 2 Agentic Workflow — Understand → Direct → Prove

## Understand

**Week 1 sources used:**
- `docs/product-spec.md` — the Service Request concept, ownership, and status requirements.
- `docs/data-model.md` — the Lifecycle + Rules section, specifically the invariant: *"A Request cannot move to Resolved directly from Submitted — it must pass through either Awaiting approval or In progress."*
- `docs/decisions/ADR-001.md` — the decision to model status as an append-only event history, not a single overwritable field.

**States, rules, and invariant in scope for this slice:**
- States: `SUBMITTED → IN_PROGRESS → RESOLVED` (a 3-state bounded subset of the full lifecycle in `data-model.md`, which also includes `Awaiting approval` and `Rejected`).
- Rule: a request may only move to the next state in that sequence.
- Invariant enforced (from Week 1): a request cannot skip `IN_PROGRESS` and go straight from `SUBMITTED` to `RESOLVED`; and once `RESOLVED`, a request is terminal and cannot be reopened.

**Implementation area:** `backend/src/requests/` — a single NestJS module (`RequestsModule`, `RequestsController`, `RequestsService`) with an in-memory store.

**Explicit non-goals for this milestone:**
- No approval workflow (`Awaiting approval`, `Rejected`) — deferred to a later slice.
- No department routing, no authentication/authorization, no persistent database.
- No frontend.
- No full automated test suite — verification here is manual, evidenced HTTP calls (see Prove).

## Direct

**Bounded task + relevant context:** implement create + transition endpoints for a `ServiceRequest`, enforcing only the transitions and invariant described above. Relevant context = the enum, entity shape, and invariant already defined in `docs/data-model.md`, transferred directly into code rather than re-derived.

**Inspect before modifying:** the existing repository was reviewed (`docs/product-spec.md`, `architecture.md`, `data-model.md`, `ADR-001.md`) before writing any code, so the implementation matches decisions already made rather than inventing new ones.

**Plan before execution:**
1. Scaffold a NestJS backend (`package.json`, `tsconfig.json`, `nest-cli.json`) matching the structure already used in the ShopLite lab.
2. Add a `requests` module with an enum, entity, two DTOs, a service enforcing the transition table + invariant, and a controller exposing simple HTTP endpoints.
3. Build and run it, then exercise it with real HTTP calls to collect evidence.

**Approve / Redirect / Stop checkpoints:** the transition table (`ALLOWED_TRANSITIONS`) was reviewed against the Week 1 invariant before being treated as final — it directly encodes "Submitted can only go to In progress" and "Resolved has no valid next state," so the rule in code and the rule in `data-model.md` say the same thing.

## Prove

**Run + verify valid/invalid cases** (full transcript also in this repo's build log):

| # | Action | Expected | Actual |
|---|---|---|---|
| 1 | Create request → status `submitted` | 201, status `submitted` | ✅ `submitted` |
| 2 | Transition `submitted → in_progress` (valid) | 201, status `in_progress` | ✅ `201`, `in_progress` |
| 3 | Transition `in_progress → resolved` (valid) | 201, status `resolved` | ✅ `201`, `resolved` |
| 4 | Transition `resolved → in_progress` (invalid — terminal state) | 400, rejected | ✅ `400 Bad Request` |
| 5 | Create a second request → status `submitted` | 201, status `submitted` | ✅ `submitted` |
| 6 | Transition `submitted → resolved` (invalid — skips in_progress, violates the invariant) | 400, rejected | ✅ `400 Bad Request` |

**Expected vs. actual evidence:** all six cases matched expectation — 2 valid transitions succeeded (cases 2–3), 2 invalid transitions were rejected (cases 4 and 6), and the enforced invariant (no skipping `in_progress`, no reopening `resolved`) held in both invalid cases.

**Defect check:** no defect appeared during verification — actual output matched expected output on the first run, so no reproduce → root cause → fix → re-verify cycle was needed.

**Regression check:** re-running the full sequence (`npm run build && node dist/main.js`, then the same six requests) reproduces the same results, since the store is in-memory and deterministic per process.

**Final commit:** `docs: add week2 service request lifecycle slice` — see repository history.

---

## How to Reproduce This Evidence

```bash
cd backend
npm install
npm run build
node dist/main.js
```

In a second terminal:

```bash
# 1. Create a request
curl -X POST http://localhost:3000/requests \
  -H "Content-Type: application/json" \
  -d '{"title":"Laptop wont turn on"}'
# copy the returned "id" into $ID below

# 2. VALID: submitted -> in_progress
curl -X POST http://localhost:3000/requests/$ID/transition \
  -H "Content-Type: application/json" -d '{"status":"in_progress"}'

# 3. VALID: in_progress -> resolved
curl -X POST http://localhost:3000/requests/$ID/transition \
  -H "Content-Type: application/json" -d '{"status":"resolved"}'

# 4. INVALID: resolved -> in_progress (terminal state)
curl -X POST http://localhost:3000/requests/$ID/transition \
  -H "Content-Type: application/json" -d '{"status":"in_progress"}'

# 5. Create a second request, then try to skip straight to resolved
curl -X POST http://localhost:3000/requests \
  -H "Content-Type: application/json" -d '{"title":"Need employment letter"}'
# copy the returned "id" into $ID2 below

# 6. INVALID: submitted -> resolved (skips in_progress)
curl -X POST http://localhost:3000/requests/$ID2/transition \
  -H "Content-Type: application/json" -d '{"status":"resolved"}'
```