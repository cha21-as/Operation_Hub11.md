# Week 4 — Production AI Request Intake

This milestone adds one AI-assisted capability to the existing Operations Hub: an employee can describe a need in free text and receive a bounded routing candidate for review. The candidate is advisory. The employee and the backend remain authoritative, and the existing request lifecycle and authorization rules are unchanged.

## Capability

`POST /requests/intake` accepts:

```json
{ "freeText": "I need approval for a work expense" }
```

It returns a structured candidate without creating a request:

```json
{
  "title": "I need approval for a work expense",
  "department": "FINANCE",
  "requiresApproval": true,
  "confidence": "high",
  "rationale": "The request mentions a finance or expense workflow."
}
```

The UI shows the candidate for employee review. Submission still uses `POST /requests`, so the existing DTO validation and lifecycle guarantees remain the final authority.

## Bounded context and trust rules

- Departments are limited to `IT`, `HR`, and `FINANCE`.
- `FINANCE` candidates must set `requiresApproval: true`.
- Empty, overlong, or malformed provider output is rejected by the backend.
- Ambiguous text returns `department: null` and a clarification rationale; accepted candidates are presented with high confidence and are still reviewed by the employee.
- Provider errors are propagated as failures; the backend does not invent a candidate.
- With `AI_API_KEY` set, the backend calls the configured OpenAI-compatible model through `OpenAiIntakeProvider`. Without it, `LocalAiIntakeProvider` is deterministic and requires no paid provider or network access.

## Connect a model

The backend reads these environment variables at startup:

```powershell
$env:AI_API_KEY = "your-api-key"
$env:AI_MODEL = "gpt-4o-mini"
$env:AI_BASE_URL = "https://api.openai.com/v1"
cd backend
npm run start
```

`AI_BASE_URL` supports another OpenAI-compatible service. Never commit the API key or put it in frontend code. The model is constrained to return JSON, and the backend still validates the department, title, and approval rule before returning the candidate.

For Requesty, configure the compatible endpoint and model like this in PowerShell. Type the key directly when prompted; do not place it in source files or commit it:

```powershell
$env:AI_API_KEY = Read-Host "Requesty API key"
$env:AI_MODEL = "google/gemma-4-31b-it"
$env:AI_BASE_URL = "https://router.requesty.ai/v1"
cd backend
npm run start
```

The equivalent direct smoke test is:

```powershell
$headers = @{ Authorization = "Bearer $env:AI_API_KEY" }
$body = @{ model = $env:AI_MODEL; messages = @(@{ role = "user"; content = "Hello!" }) } | ConvertTo-Json -Depth 5
Invoke-RestMethod -Uri "$env:AI_BASE_URL/chat/completions" -Method Post -Headers $headers -ContentType "application/json" -Body $body
```

## Representative AI evals

The eval set is intentionally small and representative of the product scope:

| Input pattern | Expected department | Approval | Confidence |
|---|---|---:|---|
| laptop will not turn on | IT | no | high |
| VPN access | IT | no | high |
| employment letter | HR | no | high |
| benefits question | HR | no | high |
| work expense approval | FINANCE | yes | high |
| invoice reimbursement | FINANCE | yes | high |
| insufficiently specific help request | unresolved | no | high |
| salary or payroll question | HR | no | high |
| resignation letter | HR | no | high |
| insurance or financial bill | FINANCE | yes | high |

The suite also proves deterministic repeatability, invalid provider output rejection, and provider failure propagation.

## How to reproduce

```bash
cd backend
npm install
npm run test:ai
npm test
npm run build
npm run test:e2e
```

Run the application and try the capability directly:

```bash
npm run start
curl -i -X POST http://localhost:3000/requests/intake \
  -H "Content-Type: application/json" \
  -d '{"freeText":"My laptop will not turn on"}'
```

The normal request creation and start/resolve commands remain documented in `docs/week3-full-stack-delivery.md`.