import { httpClient } from '@shared/Services/Http/ApiClient';
import type { IAccessControlRepository } from '@modules/AccessControl/Application/Interfaces/IAccessControlRepository';
import { AccessControlRepository } from '@modules/AccessControl/Infrastructure/Repositories/AccessControlRepository';

export const accessControlRepository: IAccessControlRepository = new AccessControlRepository(httpClient);
