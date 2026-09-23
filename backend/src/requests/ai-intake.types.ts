import { Department } from './department.enum';

export type IntakeConfidence = 'high' | 'medium' | 'low';

export interface IntakeCandidate {
  title: string;
  department: Department | null;
  requiresApproval: boolean;
  confidence: IntakeConfidence;
  rationale: string;
}

export interface AiIntakeProvider {
  classify(freeText: string): Promise<IntakeCandidate>;
}

export const AI_INTAKE_PROVIDER = Symbol('AI_INTAKE_PROVIDER');