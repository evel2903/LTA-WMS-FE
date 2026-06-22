import type { PartnerStatus, PartnerType } from '@modules/PartnerMaster/Domain/Types/Partner';

export const PARTNER_DEFAULT_PAGE_SIZE = 50;
export const PARTNER_MAX_PAGE_SIZE = 100;

export const PARTNER_TYPES: readonly PartnerType[] = ['Supplier', 'Customer', 'Carrier'];
export const PARTNER_STATUSES: readonly PartnerStatus[] = ['Active', 'Inactive'];

export const PARTNER_EMPTY_LABEL = 'No Partners yet.';
