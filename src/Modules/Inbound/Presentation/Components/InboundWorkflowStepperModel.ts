export type InboundWorkflowStepKey =
  | 'plan'
  | 'gate-in'
  | 'readiness'
  | 'receiving'
  | 'qc'
  | 'lpn'
  | 'release';

export type InboundWorkflowStepState = 'done' | 'active' | 'waiting' | 'blocked';

export interface InboundWorkflowStep {
  key: InboundWorkflowStepKey;
  label: string;
  description: string;
  state: InboundWorkflowStepState;
}

export function mapInboundActionToWorkflowStep(
  action: string | undefined,
): InboundWorkflowStepKey | null {
  switch (action) {
    case 'gate-in':
      return 'gate-in';
    case 'receiving':
      return 'receiving';
    case 'discrepancy':
      return 'receiving';
    case 'qc':
      return 'qc';
    case 'lpn':
      return 'lpn';
    case 'release':
      return 'release';
    default:
      return null;
  }
}
