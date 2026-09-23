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
  week4-production-ai.md           the v0.4 AI-assisted intake capability and evals
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
    App.tsx                        AI/manual intake, queue filters, ticket view, and request actions
    api.ts                         typed client for the backend contract
  package.json
```

## Milestones so far

- **v0.1 — Product Foundation** (`docs/product-spec.md`, `architecture.md`, `data-model.md`, `ADR-001.md`): reasoning before code.
- **v0.2 — First Verified Implementation** (`docs/week2-agentic-workflow.md`): an in-memory NestJS slice of the Service Request lifecycle.
- **v0.3 — Integrated Product Slice** (`docs/week3-full-stack-delivery.md`): the same lifecycle, now with a React frontend, real SQLite persistence, an explicit API contract, one authorization rule (allowed + denied), rejected invalid input, a handled 404, and three layers of automated tests (unit, integration, E2E) with regression coverage.
- **v0.4 — Production AI Request Intake** (`docs/week4-production-ai.md`): deterministic free-text classification into bounded IT/HR/Finance context, backend validation of AI output, employee review before submission, provider failure handling, and representative repeatable evals.

**Read `docs/week4-production-ai.md` first** — it documents the current AI-assisted intake capability, its bounded contract, evals, and repeatable commands. The Week 3 document contains the underlying lifecycle and authorization contract.

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

1. Describe a need in free text and click **Generate suggestion**. The review panel opens automatically with the suggested title, team, and **Submit request** action.
2. Review or edit the suggested title and team before submitting.
3. Or click **Skip AI and submit manually**, enter a title, choose a department, and submit directly.
4. Use the department filter beside **Recent requests** to show only IT, HR, or Finance requests.
5. Use **View** to open a request ticket with its status history. Use **Start** and **Resolve** as matching department staff.
6. Select requests for bulk deletion, delete a single row, or use **Undo** to restore the most recent deletion.

Or exercise the same flow directly against the API — see the `curl` examples in `docs/week3-full-stack-delivery.md`.

## Run the Automated Tests

```bash
cd backend
npm test            # unit test (business rule/authorization) + integration test (real SQLite database)
npm run test:ai     # representative AI intake evals and provider guard tests
npm run test:e2e    # end-to-end test over real HTTP, covering the whole contract
```

What each proves is documented in `docs/week3-full-stack-delivery.md` under "The Required Guarantees."