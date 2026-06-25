import { Badge } from '@shared/Components/Ui/Badge';
import type {
  CatalogImplementationStatus,
  ControlExceptionDefaultState,
  ControlExceptionSeverity,
} from '@modules/ControlValidationCatalog/Domain/Entities/ControlValidationCatalog';

export function CatalogImplementationStatusBadge({
  status,
}: {
  status: CatalogImplementationStatus;
}) {
  if (status === 'Implemented') {
    return <Badge variant="success">Đã triển khai</Badge>;
  }
  if (status === 'DeferredToC9') {
    return <Badge variant="warning">Dời sang C9</Badge>;
  }
  return <Badge variant="outline">Deferred V1+</Badge>;
}

export function ControlSeverityBadge({ severity }: { severity: ControlExceptionSeverity }) {
  return <Badge variant={severity === 'High' ? 'destructive' : 'warning'}>{severity}</Badge>;
}

export function ControlDefaultStateBadge({ state }: { state: ControlExceptionDefaultState }) {
  const variant = state === 'Blocked' ? 'destructive' : state === 'Detected' ? 'warning' : 'outline';
  return <Badge variant={variant}>{state}</Badge>;
}

export function BooleanRequirement({ value, label }: { value: boolean; label: string }) {
  return (
    <span
      aria-label={`${label}: ${value ? 'required' : 'optional'}`}
      className={value ? 'font-medium' : 'text-muted-foreground'}
    >
      {value ? 'Required' : 'Optional'}
    </span>
  );
}
