import { Badge } from '@shared/Components/Ui/Badge';
import type {
  CatalogImplementationStatus,
  ControlExceptionDefaultState,
  ControlExceptionSeverity,
} from '@modules/ControlValidationCatalog/Domain/Entities/ControlValidationCatalog';
import {
  catalogImplementationStatusLabel,
  controlDefaultStateLabel,
  controlSeverityLabel,
  requirementLabel,
} from '@modules/ControlValidationCatalog/Domain/Constants/ControlValidationCatalogDisplayText';

export function CatalogImplementationStatusBadge({
  status,
}: {
  status: CatalogImplementationStatus;
}) {
  const variant = status === 'Implemented' ? 'success' : status === 'DeferredToC9' ? 'warning' : 'outline';
  return <Badge variant={variant}>{catalogImplementationStatusLabel(status)}</Badge>;
}

export function ControlSeverityBadge({ severity }: { severity: ControlExceptionSeverity }) {
  return <Badge variant={severity === 'High' ? 'destructive' : 'warning'}>{controlSeverityLabel(severity)}</Badge>;
}

export function ControlDefaultStateBadge({ state }: { state: ControlExceptionDefaultState }) {
  const variant = state === 'Blocked' ? 'destructive' : state === 'Detected' ? 'warning' : 'outline';
  return <Badge variant={variant}>{controlDefaultStateLabel(state)}</Badge>;
}

export function BooleanRequirement({
  value,
  label,
}: {
  value: boolean | null | undefined;
  label: string;
}) {
  const displayLabel =
    value === true ? 'Bắt buộc' : value === false ? 'Không bắt buộc' : requirementLabel(value);

  return (
    <span
      aria-label={`${label}: ${requirementLabel(value)}`}
      className={value === true ? 'font-medium' : 'text-muted-foreground'}
    >
      {displayLabel}
    </span>
  );
}
