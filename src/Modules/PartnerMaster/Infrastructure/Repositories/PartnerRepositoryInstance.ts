import { httpClient } from '@shared/Services/Http/ApiClient';
import type { IPartnerRepository } from '@modules/PartnerMaster/Application/Interfaces/IPartnerRepository';
import { PartnerRepository } from '@modules/PartnerMaster/Infrastructure/Repositories/PartnerRepository';

export const partnerRepository: IPartnerRepository = new PartnerRepository(httpClient);
