import { httpClient } from '@shared/Services/Http/ApiClient';
import type { IShippingRepository } from '@modules/Shipping/Application/Interfaces/IShippingRepository';
import { ShippingRepository } from '@modules/Shipping/Infrastructure/Repositories/ShippingRepository';

export const shippingRepository: IShippingRepository = new ShippingRepository(httpClient);

