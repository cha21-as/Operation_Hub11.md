# Purpose + Scope

## Requirements Driving the Design

This architecture exists to satisfy the requirements from `product-spec.md`:

- An employee must be able to submit a request in a structured way (not free text messaging).
- Every request must be routed to the correct department (IT, HR, or Finance) and given a clear owner.
- The status of a request must be visible to both the employee and the handling department.
- Some requests require an approval step (e.g. expense requests); others go straight to handling (e.g. a broken laptop).
- Department staff must be able to pick up, act on, and resolve requests assigned to them.
- An employee must be able to check status without asking a person directly.
- The system must not silently lose a request, and must not falsely claim ownership/status is clear when it isn't.

Each box in this document exists because one of these requirements forced it to exist — not because it "sounds professional."

## Actors

| Actor | Role |
|---|---|
| **Employee (Requester)** | Submits a request, checks its status. |
| **Department Staff** (IT / HR / Finance) | Picks up, works, and resolves requests owned by their department. |
| **Approver** | Approves or rejects a request that requires approval (e.g. an expense). May or may not be the same person as department staff. |
| **Hub System** | The system of record for requests: submission, routing, ownership, status, approval state. |

## System Boundary

**Inside the Hub Service Boundary (we own):**
- App / Web (employee- and staff-facing client)
- Hub Backend
- Request Data (the request records, ownership, status, approval state)

**Outside the boundary (people, not owned):**
- Employee
- Department Staff
- Approver

**Outside the boundary (external systems we depend on but do not own):**
- IT ticketing/handling system (if one already exists) — or the IT team acting directly on requests
- HR document/records system
- Finance/expense system
- Notification provider (email/SMS)
- Identity provider (confirms who the employee/staff member is)

This mirrors the ShopLite pattern: `Customer / Support` are people, `App/Web / Backend / Order Info` are what we own, and `Courier Provider` is external. Here, `Employee / Department Staff / Approver` are people, `App/Web / Hub Backend / Request Data` are what we own, and the department-specific systems + notification provider are external.

---

# Structure + Flow

## Components & Responsibilities

| Requirement | Responsibility it forces | Component |
|---|---|---|
| Employee must submit structured requests | Collect and validate request input | **App / Web** |
| Employee may start from free text without surrendering authority | Produce and validate a bounded advisory candidate | **Hub Backend — AI Intake** |
| Request must reach the correct department | Classify/route request to IT, HR, or Finance | **Hub Backend — Router** |
| Every request needs a clear owner | Assign and record ownership | **Hub Backend — Ownership** |
| Status must be visible to employee & department | Store and serve current request status | **Request Data** + **Hub Backend — Status Service** |
| Some requests require approval | Hold a request in an "awaiting approval" state, record approver decision | **Hub Backend — Approval Workflow** |
| Requests may need department-specific action (e.g. IT hardware fix) | Translate a generic request into whatever a specific department's process expects, without leaking that department's quirks into the app | **Department Adapter** (one per department, or a shared adapter interface) |
| Department system may be slow/unavailable | Provide safe fallback / last-known state | **Hub Backend — Status Service** (fallback logic) |
| Employee/staff must be authenticated and only see requests they're allowed to see | Enforce identity and permission | **Hub Backend — Auth Layer** |

"Why does this box exist?" — every component above is traceable to a specific requirement. If a future box can't be traced back to a requirement or a constraint, it should be challenged and removed.

## Important Data Flows

1. **Suggest and submit a request:** Employee → App/Web → Hub Backend (AI Intake) → bounded candidate → employee review → Hub Backend (Router) → assigns department + owner → Request Data (status: `submitted`).
2. **Approval path:** Hub Backend (Approval Workflow) sets status to `awaiting approval` → Approver acts → status updates to `approved`/`rejected` → if approved, continues to department handling.
3. **Non-approval path:** Request goes directly from `submitted` to the owning department's queue (status: `in progress`).
4. **Department handling:** Department Staff (via App/Web or their own tools) update the request through the Department Adapter → Hub Backend updates Request Data → status becomes `resolved`.
5. **Status check:** Employee → App/Web → Hub Backend (Status Service) → reads Request Data → returns current status (with "last updated" info).

---

# Trust + Resilience

## Trust / Authorization Boundaries

Authentication asks *who are you*; authorization asks *what may you do*. Being a logged-in employee does not mean you may view or act on someone else's request — this is the same distinction as "logged in ≠ allowed to view every order" in the ShopLite example.

- **Client → Hub Backend (trust boundary):** the App/Web sends identity + request ID. The Hub Backend is the trusted rule-enforcer — it does not assume the client's claims about permission are correct; it re-checks.
- **Hub Backend → Department system (ownership/trust boundary):** external department data (e.g. an IT ticket status) is treated as *input, not automatic truth*. It is validated and translated before being reflected back to the employee.

| Question | Rule |
|---|---|
| Can an employee view another employee's request? | No — authorization restricts visibility to the requester, the owning department, and the approver. |
| Can any department staff act on any request? | No — only staff in the owning department (or an explicitly reassigned department) may act on a request. |
| Does being authenticated grant approval rights? | No — approval rights are a separate authorization check from identity. |

## Dependencies: What Do We Rely On?

| # | Question | Answer |
|---|---|---|
| 1 | What do we rely on? | Identity provider (login), Notification provider (email/SMS), Department-specific systems/processes (IT, HR, Finance) |
| 2 | What do we control? | Our routing rules, our status model, our approval workflow, our fallback behavior |
| 3 | What if it's slow / wrong / unavailable? | Design the behavior before it happens (see below) — external does not mean optional, it means something we depend on but do not fully control. |

## Reliability When a Dependency Fails

A department system being unavailable should not make the whole Hub appear down, in the same way a courier outage should not make ShopLite look down.

**Courier unavailable → Department system unavailable (mapped):**

Department system unavailable → Show last-known status → Mark it "last updated ..." → Tell the employee the info may be stale.

This keeps the Hub useful (employees can still see *something*) even when a dependency cannot respond.

## Realistic Scalability Notes

Start with the actual pressure, not "millions of users":

| What breaks first | Cause |
|---|---|
| Sale-spike equivalent: many employees submit/check requests at once (e.g. Monday morning, or after a company-wide announcement) | Many users hitting status/submission endpoints simultaneously |
| Department rate limit | A department only allows so many requests to be created/updated at once (e.g. a small HR team) |
| Slow department response | External department process takes too long to confirm status, so the Status Service must not block on it |

The design response should be the smallest one that fixes the actual pressure (e.g. caching last-known status, queuing submissions) — not introducing infrastructure the requirements don't call for.

## Failure Scenarios (Architecture Input)

Designed before production forces the lesson, mirroring "Failure Is an Architecture Input":

- **Department system timeout** — who notices? Status Service; what can we trust? last confirmed state; what does the user see? "last updated ..." with a stale flag; what keeps working? submission and viewing history.
- **Duplicate update** from a department system — the Hub must not create duplicate status changes; it applies idempotent updates keyed by request ID.
- **Out-of-order update** — an older status arriving after a newer one must not overwrite the newer one; updates are ordered by timestamp, not arrival order.
- **Unknown status** — if a department hasn't reported anything yet, the Hub shows `submitted` / `awaiting department`, never a blank or misleading state.
- **Unauthorized request ID access** — a user requesting a request ID they don't own/aren't authorized for is rejected at the Auth Layer, not silently served.
- **Data unavailable** (Request Data store itself briefly unreachable) — the Hub should fail safely (clear error), not show incorrect ownership/status.

---

# Decisions

## How Do Components Communicate?

An agreed way for parts to talk: what can be asked, what is sent, what comes back. At this stage we define **communication boundaries**, not endpoint syntax:

- App/Web ↔ Hub Backend: submit request, ask status, ask approval state.
- Hub Backend ↔ Department Adapter: send a translated request, ask for department-specific status.
- Hub Backend ↔ Notification Provider: send a status-change notification.

## Ask, Notify, or Stay Connected?

Which requirement actually needs which behavior?

| Behavior | Mechanism | Why it fits (or doesn't) here |
|---|---|---|
| Employee checks status on demand | **Polling** (ask repeatedly, on-demand) | Matches the confirmed requirement: "employee can check status without asking a person." No confirmed requirement yet for live/instant updates. |
| Department system has a status change | **Webhook-style update** (provider tells us), if the department system supports it | Reduces unnecessary polling load on department systems. |
| Live two-way connection (WebSocket) | **Not used** | No requirement currently demands live, continuously-open updates — this would be architecture theatre without a forcing requirement. |

## Should the App Call Department Systems Directly?

A design decision, following the same reasoning as "Should the App Call the Courier Directly?"

| | Option A — Direct | Option B — Backend Owns Integration (chosen) |
|---|---|---|
| Description | App/Web calls each department's system directly | App/Web only talks to Hub Backend; Hub Backend owns all department integrations |
| Consequences | Each client must handle credentials + each department's specific format; authorization consistency is hard to guarantee | Credentials are protected in one place; rules are centralized; department-specific changes are isolated behind an adapter |

**Decision: Option B.** The Hub Backend owns all department integration through Department Adapters. Optional vocabulary: *adapter = a small translation boundary around a department-specific process.*

## Architecture Decision Record (ADR)

| Problem | Options | Decision | Consequence |
|---|---|---|---|
| Department-specific behavior (IT ticket formats, HR document processes, Finance approval rules) should not leak into the client app | (A) App calls each department system directly, vs (B) Hub Backend owns all department integration | **Backend owns department integration boundary** | Credentials and department-specific logic stay server-side; the app stays simple; department changes only affect one adapter, not the client. |

## Avoiding Architecture Theatre

Technology names are not justified because they sound professional. Every component in this document was included only because a specific requirement forced it to exist (see the Components & Responsibilities table). No message queue, cache layer, microservice split, or real-time infrastructure is introduced here, because no confirmed requirement in `product-spec.md` currently demands it.

---

# What This Document Deliberately Leaves Out (Not Yet)

Per the assignment's scope for Thursday's architecture draft:

- No code — no frontend or backend implementation.
- No database tables, collections, or indexes.
- No detailed endpoint schemas; no CI/CD or production infrastructure.
- No model-specific vendor integration, autonomous submission, or unnecessary microservices.

# Done = Explainable

This document is complete when a classmate can answer, without reading your mind:

1. **What are the major parts, and why does each exist?** — see Components & Responsibilities.
2. **What is inside vs outside, and which externals are dependencies?** — see System Boundary and Dependencies.
3. **How does information move, and where do trust/authorization checks matter?** — see Important Data Flows and Trust/Authorization Boundaries.
4. **What happens when a dependency fails, and which spec requirement caused each decision?** — see Reliability When a Dependency Fails and the ADR.
