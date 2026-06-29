import { Badge } from '@shared/Components/Ui/Badge';
import type { PartnerStatus } from '@modules/PartnerMaster/Domain/Types/Partner';

interface PartnerStatusBadgeProps {
  status: PartnerStatus;
}

const PARTNER_STATUS_BADGE_VARIANT: Record<PartnerStatus, 'success' | 'secondary'> = {
  Active: 'success',
  Inactive: 'secondary',
};

export function PartnerStatusBadge({ status }: PartnerStatusBadgeProps) {
  return <Badge variant={PARTNER_STATUS_BADGE_VARIANT[status]}>{status}</Badge>;
}
