import type { PaginatedResponse } from '@shared/Types/Api';
import type {
  InboundLineImportPreview,
  InboundPlan,
} from '@modules/InboundPlan/Domain/Types/InboundPlan';
import type {
  CreateInboundPlanInput,
  InboundPlanFilter,
  RecordGateInInput,
  UpdateInboundPlanInput,
} from '@modules/InboundPlan/Domain/Types/InboundPlanQuery';

export interface IInboundPlanRepository {
  list(filter?: InboundPlanFilter): Promise<PaginatedResponse<InboundPlan>>;
  getById(id: string): Promise<InboundPlan>;
  create(input: CreateInboundPlanInput): Promise<InboundPlan>;
  update(id: string, input: UpdateInboundPlanInput): Promise<InboundPlan>;
  confirm(id: string): Promise<InboundPlan>;
  cancel(id: string): Promise<InboundPlan>;
  downloadLineImportTemplate(): Promise<Blob>;
  previewLineImport(
    file: File,
    scope: { warehouseId: string; ownerId: string },
  ): Promise<InboundLineImportPreview>;
  commitLineImport(file: File, header: Omit<CreateInboundPlanInput, 'lines'>): Promise<InboundPlan>;
  recordGateIn(id: string, input: RecordGateInInput): Promise<InboundPlan>;
}
