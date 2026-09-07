# Data Model — Internal Operations Service Hub

This model is derived from `product-spec.md` (what the product must do) and `architecture.md` (who owns what). It includes only what the product actually needs — reasoning first, storage/access decisions second.

## Domain

*Important entities, relationships, cardinality, ownership.*

| Entity | Represents | Owned by (per architecture.md) |
|---|---|---|
| **Employee** | The person submitting requests. | Identity provider (external); referenced, not owned, by the Hub. |
| **Department** | IT, HR, or Finance. | Hub backend (a small, fixed reference set). |
| **Request** | One instance of "help I need," submitted by an employee. | Hub backend / Request data. |
| **StatusEvent** | One recorded change in a request's lifecycle (e.g. submitted → in progress). | Hub backend / Request data. |
| **Approval** | A record of an approver's decision on a request that required one. | Hub backend / Request data. |

**Relationships:**

- One **Employee** submits many **Requests** (1 → many).
- One **Request** belongs to exactly one **Department** (many → 1), per the architecture assumption that each request has a single owning department.
- One **Request** has many **StatusEvents** (1 → many) — this is a direct consequence of "spec needs history" (see *Hunt the Contradictions* below).
- One **Request** has zero or one **Approval** — zero if the request type never requires approval, one if it does (a request is never approved/rejected twice under the same approval step; see Lifecycle rules).
- One **Approver** (an Employee acting in that capacity) can decide many **Approvals** (1 → many).

## Lifecycle + Rules

*State transitions, invariants, authorization-sensitive rules.*

**Request status transitions** (matches the lifecycle flowchart already agreed on):

```
Submitted → (needs approval?)
  → Awaiting approval → Approved → In progress → Resolved
  → Awaiting approval → Rejected → Resolved (closed)
  → In progress → Resolved   (no approval required)
```

**Invariants:**

- A `Request` always has exactly one current `Department` owner at any point in time.
- A `Request` cannot move to `Resolved` directly from `Submitted` — it must pass through either `Awaiting approval` or `In progress`.
- A `Request` that requires approval cannot reach `In progress` without a recorded `Approval` decision of `approved`.
- Once an `Approval` is recorded as `approved` or `rejected`, it is immutable — a new approval requires a new `Approval` record (not an edit to the old one), so the history stays truthful.

**Authorization-sensitive rules** (identity ≠ permission, per architecture.md):

- An `Employee` may read only `Requests` where they are the requester, the assigned department staff, or the named approver.
- Only staff belonging to a `Request`'s current owning `Department` may change its status or reassign it.
- Only a named `Approver` on a `Request` may write its `Approval` decision — no other role, including the requester, may do so.

## Storage

*Relational/document reasoning — what is durable vs. derived.*

This is a decision, not a default (per *Relational vs Document Is a Decision, Not a Religion*):

| Signal from the domain | Points toward |
|---|---|
| Relationships are central (Request → Department, Request → Approval, Request → Employee) | **Relational** |
| Consistency matters (a request cannot be "resolved" and "awaiting approval" at once) | **Relational** |
| Queries commonly combine related data (e.g. "show me all of IT's open requests with their latest status") | **Relational** |

**Decision: relational storage** for the core `Request`, `StatusEvent`, `Approval`, `Employee`, and `Department` records. Nothing here is aggregate-shaped or benefits from flexible/nested structure — the opposite is true: consistency and cross-entity queries are the dominant need.

**Durable vs. derived:**

- **Durable (stored):** every `StatusEvent` (the full history), every `Approval` decision, core `Request` fields (id, requester, department, request type, created time).
- **Derived (not separately stored):** "current status" is the most recent `StatusEvent` for a request — computed, not duplicated as a second source of truth, to avoid the two disagreeing.

## Access

*Important queries/access patterns — indexes only when justified.*

Modeling the queries the product actually needs (not hypothetical reporting):

| Access pattern | Looked up by |
|---|---|
| Latest status for a request | `request_id` → current/latest `StatusEvent` |
| Full history for a request | `request_id` → `StatusEvents` ordered by time |
| Open requests owned by a department | `department_id` + status ≠ resolved |
| Requests submitted by an employee | `employee_id` (as requester) |
| Requests awaiting a specific approver | `approver_id` + status = awaiting approval |

Indexes are only justified for the patterns above — no speculative indexes for reporting queries the spec doesn't require yet.

## Hunt the Contradictions

Checked against the four contradiction patterns called out in the slides, applied to this product:

| Contradiction | Where it would bite | Resolution in this model |
|---|---|---|
| Spec needs history, but model stores only current state | `product-spec.md` requires status visibility over time; a single "status" field can't show progression | `StatusEvent` is a full append-only history; current status is derived, not the only record. |
| "Two approvals required" modeled as `approved: true/false` | Not currently a requirement — flagged as an open unknown in `product-spec.md`, not modeled as a boolean, so it isn't silently wrong if multi-step approval is added later | `Approval` is its own entity (one row per decision), so adding a second required approval later is an additive change, not a rewrite. |
| Sensitive request, but architecture gives generic admin access | `product-spec.md` requires that only the owning department can act on a request | Authorization rules scope access to requester / owning department staff / named approver — no blanket "admin" role. |
| Audit required, but no actor + time history exists | Approval and status changes must be explainable later | Every `StatusEvent` and `Approval` record includes who made the change and when, not just what the new value is. |