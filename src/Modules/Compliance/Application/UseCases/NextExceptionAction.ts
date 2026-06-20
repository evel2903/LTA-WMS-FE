import {
  EXCEPTION_NEXT_ACTION,
  type ExceptionAction,
  type ExceptionState,
} from '@modules/Compliance/Domain/Enums/ComplianceEnums';

/**
 * The single legal lifecycle action from a given state (the state machine is linear).
 * Returns null for CLOSED (terminal). Pure — unit-testable in isolation.
 */
export function nextExceptionAction(state: ExceptionState): ExceptionAction | null {
  return EXCEPTION_NEXT_ACTION[state];
}
