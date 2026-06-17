import type { InventoryItem } from '@modules/Inventory/Domain/Entities/InventoryItem';
import type { IInventoryRepository } from '@modules/Inventory/Domain/Interfaces/IInventoryRepository';
import type { AdjustQuantityInput } from '@modules/Inventory/Domain/Types/InventoryQuery';

/** Business operation: adjust on-hand quantity, enforcing invariants up front. */
export class AdjustInventoryQuantityUseCase {
  constructor(private readonly inventoryRepository: IInventoryRepository) {}

  execute(input: AdjustQuantityInput): Promise<InventoryItem> {
    if (input.delta === 0) {
      throw new Error('Adjustment delta must be non-zero.');
    }
    if (!input.reason.trim()) {
      throw new Error('A reason is required for every stock adjustment.');
    }
    return this.inventoryRepository.adjustQuantity(input);
  }
}
