export type PartnerType = 'Supplier' | 'Customer' | 'Carrier';

export type PartnerStatus = 'Active' | 'Inactive';

export interface Partner {
  id: string;
  partnerCode: string;
  partnerName: string;
  partnerType: PartnerType;
  status: PartnerStatus;
  sourceSystem: string;
  externalReference: string;
  referenceText: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}
