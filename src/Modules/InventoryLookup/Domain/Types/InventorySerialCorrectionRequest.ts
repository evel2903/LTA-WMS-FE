export interface InventorySerialCorrectionRequest {
  dimensionId: string;
  newSerialNumber: string;
  reasonCode: string;
  evidenceRefs: string[];
  idempotencyKey: string;
}
