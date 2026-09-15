// Week 2 bounded slice: only 3 of the full lifecycle's states
// (see docs/data-model.md for the complete lifecycle, including
// Awaiting approval / Rejected, which are out of scope this week).
export enum RequestStatus {
  SUBMITTED = 'submitted',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
}