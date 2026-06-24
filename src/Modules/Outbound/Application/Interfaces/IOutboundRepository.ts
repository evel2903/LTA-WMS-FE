import type { PaginatedResponse } from '@shared/Types/Api';
import type { OutboundOrder } from '@modules/Outbound/Domain/Types/OutboundOrder';
import type {
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
}
