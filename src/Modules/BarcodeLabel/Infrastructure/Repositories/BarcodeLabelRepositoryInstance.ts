import { httpClient } from '@shared/Services/Http/ApiClient';
import { BarcodeLabelRepository } from '@modules/BarcodeLabel/Infrastructure/Repositories/BarcodeLabelRepository';

export const barcodeLabelRepository = new BarcodeLabelRepository(httpClient);
