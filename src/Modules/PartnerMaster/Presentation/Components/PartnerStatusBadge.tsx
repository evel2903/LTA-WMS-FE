import { Badge } from '@shared/Components/Ui/Badge';
import type { PartnerStatus } from '@modules/PartnerMaster/Domain/Types/Partner';
import { displayPartnerStatus } from '@modules/PartnerMaster/Presentation/Constants/PartnerDisplayText';

interface PartnerStatusBadgeProps {
  status: string | null | undefined;
}

type PartnerStatusBadgeVariant = 'success' | 'secondary' | 'outline';

const PARTNER_STATUS_BADGE_VARIANT: Record<PartnerStatus, PartnerStatusBadgeVariant> = {
  Active: 'success',
  Inactive: 'secondary',
};

function partnerStatusBadgeVariant(status: string | null | undefined) {
  if (!status) {
    return 'outline';
  }

  return PARTNER_STATUS_BADGE_VARIANT[status as PartnerStatus] ?? 'outline';
}

export function PartnerStatusBadge({ status }: PartnerStatusBadgeProps) {
  return <Badge variant={partnerStatusBadgeVariant(status)}>{displayPartnerStatus(status)}</Badge>;
}
