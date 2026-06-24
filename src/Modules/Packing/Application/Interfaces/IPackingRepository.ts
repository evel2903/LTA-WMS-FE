import type { PaginatedResponse } from '@shared/Types/Api';
import type {
  PackSession,
  Package,
  ReadyForStagingResult,
} from '@modules/Packing/Domain/Types/Packing';
import type {
  ClosePackageInput,
  CreatePackageInput,
  PackageListFilter,
  ReadyForStagingInput,
  RecordPackCheckInput,
  StartPackSessionInput,
} from '@modules/Packing/Domain/Types/PackingQuery';

export interface IPackingRepository {
  list(filter?: PackageListFilter): Promise<PaginatedResponse<Package>>;
  getById(id: string): Promise<Package>;
  startSession(input: StartPackSessionInput): Promise<PackSession>;
  recordCheck(sessionId: string, input: RecordPackCheckInput): Promise<PackSession>;
  createPackage(input: CreatePackageInput): Promise<Package>;
  closePackage(id: string, input: ClosePackageInput): Promise<Package>;
  readyForStaging(id: string, input: ReadyForStagingInput): Promise<ReadyForStagingResult>;
}
