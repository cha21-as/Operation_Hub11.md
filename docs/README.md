# Internal Operations Service Hub

A company-internal system for requesting and tracking help from departments such as IT, HR, and Finance.

## Repository structure

```
docs/
  product-spec.md              what problem we're solving and what the product must do
  architecture.md               major parts, boundaries, dependencies, and key decisions
  data-model.md                 domain, lifecycle, storage, and access reasoning
  decisions/
    ADR-001.md                  why request status is modeled as an event history
  week2-agentic-workflow.md     Understand -> Direct -> Prove evidence for v0.2
backend/
  src/
    requests/                   the Service Request lifecycle slice (v0.2)
    app.module.ts
    main.ts
  package.json
  tsconfig.json
  nest-cli.json
```

## v0.1 — Product Foundation

Reasoning before code. Read in this order:

1. `docs/product-spec.md` — the problem, the actors, and what "done" means.
2. `docs/architecture.md` — how the system is structured to satisfy the spec.
3. `docs/data-model.md` — what the system remembers and how it's organized.
4. `docs/decisions/ADR-001.md` — the one architecture-shaping decision recorded so far.

## v0.2 — First Verified Implementation

One bounded backend behavior, not the whole app: a NestJS slice of the Service Request lifecycle (`Submitted → In progress → Resolved`), enforcing the Week 1 invariant that a request cannot skip `In progress` and cannot be reopened once `Resolved`. In-memory data only — no database, no auth, no frontend yet. See `docs/week2-agentic-workflow.md` for full Understand → Direct → Prove evidence.

### Run it

```bash
cd backend
npm install
npm run build
node dist/main.js
# Operations Hub backend listening on http://localhost:3000
```

### Verify it

```bash
# 1. Create a request
curl -X POST http://localhost:3000/requests \
  -H "Content-Type: application/json" \
  -d '{"title":"Laptop wont turn on"}'
# -> {"id": "...", "status": "submitted", ...}  copy the id into $ID

# 2. VALID: submitted -> in_progress
curl -X POST http://localhost:3000/requests/$ID/transition \
  -H "Content-Type: application/json" -d '{"status":"in_progress"}'
# -> 201, status "in_progress"

# 3. VALID: in_progress -> resolved
curl -X POST http://localhost:3000/requests/$ID/transition \
  -H "Content-Type: application/json" -d '{"status":"resolved"}'
# -> 201, status "resolved"

# 4. INVALID: resolved -> in_progress (terminal state, rejected)
curl -X POST http://localhost:3000/requests/$ID/transition \
  -H "Content-Type: application/json" -d '{"status":"in_progress"}'
# -> 400 Bad Request

# 5. Create a second request, then try to skip straight to resolved
curl -X POST http://localhost:3000/requests \
  -H "Content-Type: application/json" -d '{"title":"Need employment letter"}'
# copy the id into $ID2

# 6. INVALID: submitted -> resolved (skips in_progress, rejected)
curl -X POST http://localhost:3000/requests/$ID2/transition \
  -H "Content-Type: application/json" -d '{"status":"resolved"}'
# -> 400 Bad Request
```