# Problem

Employees today ask for help through messy, informal channels — a Slack message, a hallway conversation, a vague email. Typical requests look like:

- "My laptop has a problem."
- "I need access to a software system."
- "I need an employment letter."
- "I need approval for a work expense."

These requests span multiple departments (IT, HR, Finance) and have no consistent format or single place to go. This causes real pain:

- Requests get forgotten.
- Requests get sent to the wrong person.
- Ownership of a request is unclear.
- Status of a request is unclear.
- Approval of a request is unclear.

The company wants one system where employees can submit these requests, departments can handle them, and everyone can follow their progress.

# Known Facts

- Requests today come from employees informally, with no standard channel or format.
- Requests are handled by multiple different departments: IT, HR, and Finance (at minimum).
- Some requests need approval before they can be completed (e.g. expense approval); others do not (e.g. reporting a broken laptop).
- Some requests are informational/document requests (e.g. an employment letter); others are actionable tasks (e.g. fix a laptop, grant access).
- There is currently no shared visibility into request ownership or status — this is the core pain point, not the lack of a way to ask for help.

# Actors / Stakeholders

- **Employee (Requester)** — submits a request for help and wants to track its progress.
- **IT Department** — handles technical requests (e.g. hardware issues, software/system access).
- **HR Department** — handles people-related requests (e.g. employment letters, HR documents).
- **Finance Department** — handles money-related requests (e.g. expense approvals).
- **Approver** — a person (may overlap with department staff or a manager) who must approve certain requests before they proceed.
- **System/Hub itself** — the shared internal service that all of the above rely on for submission, routing, and tracking.

# Functional Requirements

- Allow an employee to submit a request for help in a structured way (not just free-text messaging).
- Route or categorize each request to the correct department (IT, HR, or Finance).
- Assign clear ownership of each request once submitted.
- Track and expose the status of a request (e.g. submitted, in progress, awaiting approval, completed) so both the employee and the handling department can see it.
- Support requests that require approval (e.g. expense requests) as a distinct step in the request lifecycle.
- Support requests that do not require approval and can go straight to handling (e.g. a broken laptop).
- Allow department staff to pick up, act on, and resolve requests assigned to them.
- Allow an employee to check on the status of a request they've submitted without having to ask a person directly.

# Non-Functional Requirements

- The system must clearly show, at a glance, who owns a request and what its current status is — this directly addresses the core pain (ownership unclear, status unclear).
- The system must make it easy to determine whether a request has been sent to the correct department, reducing the "sent to the wrong person" problem.
- The system should be simple enough for any employee to use without training, since requesters are not expected to be technical.
- The system should not lose or silently drop requests — every submitted request must remain visible until resolved.

# Assumptions / Constraints / Unknowns

**Assumptions:**
- IT, HR, and Finance are the initial departments in scope; other departments may be added later.
- Each request belongs to exactly one department at a time.
- Employees have a way to identify themselves when submitting a request (e.g. they are already logged into a company system).

**Constraints:**
- No frontend, backend, database, or API design work exists yet — this document defines the problem and requirements only.
- No architecture diagrams, AI features, or system design decisions are being made at this stage.
- No Git repository has been created yet.

**Unknowns:**
- Can a request move between departments if it turns out to be misrouted?
- What happens if a request needs input from more than one department (e.g. IT and Finance)?
- Who approves a request when the designated approver is unavailable?
- What is the expected timeframe for handling a request, and does the system need to flag overdue requests?
- Does an employee need to be notified proactively (e.g. email/alert) or is checking status on-demand sufficient?

# Non-Goals

- This spec does not define the frontend, backend, database schema, or APIs for the hub.
- This spec does not include AI-assisted request classification or routing — routing logic beyond "assign to a department" is undefined at this stage.
- This spec does not define architecture diagrams or technical system design.
- This spec does not cover departments beyond IT, HR, and Finance unless added later.
- This spec does not define detailed approval workflows (e.g. multi-step approval chains) beyond noting that some requests require approval.

# Acceptance Criteria

A draft of this spec is ready when another student, with no prior context, can read it and correctly answer:

1. **What problem are you solving?** Employees ask for help through inconsistent, untracked channels, causing requests to be forgotten, misrouted, or stuck with unclear ownership, status, or approval.
2. **Who is involved?** Employees (requesters), IT, HR, and Finance departments, approvers, and the hub system itself.
3. **What must the product do?** Let employees submit requests, route them to the correct department, assign ownership, track status, and support an approval step where needed.
4. **What is definitely known?** Requests come from three departments today (IT, HR, Finance); some requests need approval and some don't; the core pain is lack of shared visibility into ownership and status.
5. **What is still unknown?** Cross-department requests, backup approvers, overdue-request handling, and whether notifications are required.
6. **What assumptions did you make?** IT/HR/Finance are the initial department scope; each request has one owning department; employees are already identifiable in the system.
7. **What are you deliberately not solving?** Frontend/backend implementation, database/API design, AI-based routing, architecture, and multi-step approval workflows.
8. **What are a few examples of correct behavior?**
   - An employee submits "My laptop has a problem" → it is routed to IT, given an owner, and shows status "in progress" until resolved.
   - An employee submits "I need approval for a work expense" → it goes to Finance and sits in an "awaiting approval" state until an approver acts on it.
   - An employee submits "I need an employment letter" → it is routed to HR and tracked to completion without requiring approval.