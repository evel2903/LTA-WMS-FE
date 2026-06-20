import { httpClient } from '@shared/Services/Http/ApiClient';
import type { IComplianceRepository } from '@modules/Compliance/Application/Interfaces/IComplianceRepository';
import { ComplianceRepository } from '@modules/Compliance/Infrastructure/Repositories/ComplianceRepository';

export const complianceRepository: IComplianceRepository = new ComplianceRepository(httpClient);
