# Internal Operations Service Hub

A company-internal system for requesting and tracking help from departments such as IT, HR, and Finance.

## Repository structure

```
docs/
  product-spec.md                 what problem we're solving and what the product must do
  architecture.md                  major parts, boundaries, dependencies, and key decisions
  data-model.md                    domain, lifecycle, storage, and access reasoning
  decisions/
    ADR-001.md                     why request status is modeled as an event history
  week2-agentic-workflow.md        Understand -> Direct -> Prove evidence for v0.2
  week3-full-stack-delivery.md     the v0.3 slice: contract, authz, tests, regression proof
backend/
  src/
    requests/                      Service Request entities, service, controller, tests
    app.module.ts
    main.ts
  test/
    app.e2e-spec.ts                end-to-end test over real HTTP
  package.json
frontend/
  src/
    App.tsx                        submit + start/resolve UI, with a role switcher
    api.ts                         typed client for the backend contract
  package.json
```

## Milestones so far

- **v0.1 — Product Foundation** (`docs/product-spec.md`, `architecture.md`, `data-model.md`, `ADR-001.md`): reasoning before code.
- **v0.2 — First Verified Implementation** (`docs/week2-agentic-workflow.md`): an in-memory NestJS slice of the Service Request lifecycle.
- **v0.3 — Integrated Product Slice** (`docs/week3-full-stack-delivery.md`): the same lifecycle, now with a React frontend, real SQLite persistence, an explicit API contract, one authorization rule (allowed + denied), rejected invalid input, a handled 404, and three layers of automated tests (unit, integration, E2E) with regression coverage.

**Read `docs/week3-full-stack-delivery.md` first** — it documents the current flow, the API contract, and exactly how each required guarantee is proven.

## Install & Run

### Backend (API + database)

```bash
cd backend
npm install
npm run build
npm run start        # or: npm run dev   (watch mode)
```

The API listens on `http://localhost:3000`. It uses a SQLite file at `backend/data/db.sqlite` (created automatically; override with the `DB_PATH` environment variable).

### Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The frontend talks to the backend at `http://localhost:3000` by default (override with the `VITE_API_BASE` environment variable if the backend runs elsewhere).

## Exercise the Flow

In the browser UI:

1. Leave the role switcher on **Employee** and submit a request (e.g. title "Laptop wont turn on," department IT).
2. Switch the role switcher to **Department staff**, department **HR** (a different department), and click **Start** — this is denied (403), shown as an error in the UI.
3. Switch department to **IT** (the matching department) and click **Start** — this succeeds; the request moves to `in_progress`.
4. Click **Resolve** to complete the request.

Or exercise the same flow directly against the API — see the `curl` examples in `docs/week3-full-stack-delivery.md`.

## Run the Automated Tests

```bash
cd backend
npm test            # unit test (business rule/authorization) + integration test (real SQLite database)
npm run test:e2e    # end-to-end test over real HTTP, covering the whole contract
```

What each proves is documented in `docs/week3-full-stack-delivery.md` under "The Required Guarantees."

## Not yet in scope

No login/identity system (a lightweight header-based actor stands in for it this milestone — see `docs/week3-full-stack-delivery.md`), no external integrations, no runtime AI/RAG/MCP, no CI/CD, no deployment, and no production monitoring infrastructure.