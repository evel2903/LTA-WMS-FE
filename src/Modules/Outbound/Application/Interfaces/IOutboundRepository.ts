import type { PaginatedResponse } from '@shared/Types/Api';
import type { Allocation, OutboundOrder } from '@modules/Outbound/Domain/Types/OutboundOrder';
import type {
  AllocateOutboundOrderInput,
  AllocationListFilter,
  ImportOutboundOrderInput,
  OutboundOrderListFilter,
  ReasonOutboundOrderInput,
} from '@modules/Outbound/Domain/Types/OutboundOrderQuery';

export interface IOutboundRepository {
  list(filter?: OutboundOrderListFilter): Promise<PaginatedResponse<OutboundOrder>>;
  getById(id: string): Promise<OutboundOrder>;
  importOrder(input: ImportOutboundOrderInput): Promise<OutboundOrder>;
  validate(id: string): Promise<OutboundOrder>;
  hold(id: string, input: ReasonOutboundOrderInput): Promise<OutboundOrder>;
  reject(id: string, input: ReasonOutboundOrderInput): Promise<OutboundOrder>;
  cancel(id: string, input: ReasonOutboundOrderInput): Promise<OutboundOrder>;
  allocate(id: string, input: AllocateOutboundOrderInput): Promise<Allocation>;
  listAllocations(id: string, filter?: AllocationListFilter): Promise<PaginatedResponse<Allocation>>;
  getAllocation(id: string): Promise<Allocation>;
}
