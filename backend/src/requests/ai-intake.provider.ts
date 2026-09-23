import { Department } from './department.enum';
import { AiIntakeProvider, IntakeCandidate } from './ai-intake.types';

/**
 * A deterministic local provider keeps the capability runnable without a
 * paid model. The interface can later be backed by an external provider.
 */
export class LocalAiIntakeProvider implements AiIntakeProvider {
  async classify(freeText: string): Promise<IntakeCandidate> {
    const normalized = freeText.toLowerCase();
    const isFinance = /expense|reimburse|reimbursement|invoice|payment|budget|cost|financial|bill|receipt|insurance claim|insurance bill/.test(normalized);
    const isHr = /employment|payslip|pay slip|salary|payroll|wage|compensation|leave|benefit|employee|hr|human resource|resignation|resign|termination/.test(normalized);
    const isIt = /laptop|computer|software|access|password|wifi|email|system|printer|vpn/.test(normalized);

    if (isFinance) {
      return {
        title: freeText.trim(),
        department: Department.FINANCE,
        requiresApproval: true,
        confidence: 'high',
        rationale: 'The request mentions a finance, billing, payment, or expense workflow.',
      };
    }

    if (isHr) {
      return {
        title: freeText.trim(),
        department: Department.HR,
        requiresApproval: false,
        confidence: 'high',
        rationale: 'The request mentions an HR or employment workflow.',
      };
    }

    if (isIt) {
      return {
        title: freeText.trim(),
        department: Department.IT,
        requiresApproval: false,
        confidence: 'high',
        rationale: 'The request mentions a technical support or access workflow.',
      };
    }

    return {
      title: freeText.trim(),
      department: null,
      requiresApproval: false,
      confidence: 'high',
      rationale: 'The request does not contain enough trusted product context to route it.',
    };
  }
}